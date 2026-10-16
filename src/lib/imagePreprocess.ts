/**
 * Document-grade image preprocessing for on-device stat block OCR.
 *
 * Handles:
 * - Normalized crop rectangle extraction & 90-degree rotation
 * - Resolution-preserving crop scaling (upscaling small crops, capping huge ones)
 * - Luminance grayscale conversion with dark-background auto-inversion
 * - Percentile histogram contrast stretching & paper-white background normalization
 * - 3x3 unsharp mask edge enhancement for crisp glyph strokes
 * - Integral-image local adaptive thresholding for uneven lighting / parchment shadows
 */

export type PreprocessPreset = 'standard' | 'high-contrast'
export type RotationAngle = 0 | 90 | 180 | 270

/** Normalized crop coordinates in [0, 1] relative to the rotated image. */
export interface CropRect {
  x: number
  y: number
  width: number
  height: number
}

export interface PreprocessOptions {
  crop?: CropRect
  rotation?: RotationAngle
  preset?: PreprocessPreset
}

export const FULL_CROP_RECT: CropRect = {
  x: 0,
  y: 0,
  width: 1,
  height: 1,
}

export const MIN_CROP_SIZE = 0.08
const MAX_OCR_DIMENSION = 2400
const MIN_IDEAL_OCR_DIMENSION = 1200
const MAX_UPSCALE_FACTOR = 1.8
const OCR_BORDER_PADDING = 16

export function clampCropRect(rect: CropRect): CropRect {
  const x = Math.max(0, Math.min(1 - MIN_CROP_SIZE, Number.isFinite(rect.x) ? rect.x : 0))
  const y = Math.max(0, Math.min(1 - MIN_CROP_SIZE, Number.isFinite(rect.y) ? rect.y : 0))
  const maxWidth = 1 - x
  const maxHeight = 1 - y
  const width = Math.max(
    MIN_CROP_SIZE,
    Math.min(maxWidth, Number.isFinite(rect.width) ? rect.width : 1),
  )
  const height = Math.max(
    MIN_CROP_SIZE,
    Math.min(maxHeight, Number.isFinite(rect.height) ? rect.height : 1),
  )
  return { x, y, width, height }
}

export function isFullCropRect(rect: CropRect): boolean {
  return (
    rect.x <= 0.005 &&
    rect.y <= 0.005 &&
    rect.width >= 0.99 &&
    rect.height >= 0.99
  )
}

export function nextRotationAngle(current: RotationAngle): RotationAngle {
  return ((current + 90) % 360) as RotationAngle
}

function clampByte(value: number): number {
  return value < 0 ? 0 : value > 255 ? 255 : Math.round(value)
}

/**
 * Extract single-channel luminance buffer, auto-inverting if the image is
 * predominantly dark (e.g., white text on black Mörk Borg box or dark-mode screenshot),
 * and stretching contrast between the 2nd and 94th percentiles.
 */
export function normalizeLuminanceChannel(
  rgba: Uint8ClampedArray,
  width: number,
  height: number,
): Uint8Array {
  const pixelCount = width * height
  const lum = new Uint8Array(pixelCount)
  const hist = new Uint32Array(256)

  for (let i = 0, p = 0; i < pixelCount; i++, p += 4) {
    const r = rgba[p]
    const g = rgba[p + 1]
    const b = rgba[p + 2]
    const y = clampByte(0.299 * r + 0.587 * g + 0.114 * b)
    lum[i] = y
    hist[y] += 1
  }

  // Find median (50th percentile) to detect white-on-dark stat blocks.
  let cumulative = 0
  let median = 128
  const half = pixelCount * 0.5
  for (let v = 0; v < 256; v++) {
    cumulative += hist[v]
    if (cumulative >= half) {
      median = v
      break
    }
  }

  if (median < 92) {
    hist.fill(0)
    for (let i = 0; i < pixelCount; i++) {
      const inv = 255 - lum[i]
      lum[i] = inv
      hist[inv] += 1
    }
  }

  // Find 2nd and 94th percentiles for contrast stretching.
  const lowTarget = Math.max(1, Math.floor(pixelCount * 0.02))
  const highTarget = Math.max(1, Math.floor(pixelCount * 0.92))
  let low = 0
  let high = 255

  cumulative = 0
  for (let v = 0; v < 256; v++) {
    cumulative += hist[v]
    if (cumulative >= lowTarget) {
      low = v
      break
    }
  }

  cumulative = 0
  for (let v = 0; v < 256; v++) {
    cumulative += hist[v]
    if (cumulative >= highTarget) {
      high = v
      break
    }
  }

  const range = Math.max(24, high - low)
  for (let i = 0; i < pixelCount; i++) {
    const stretched = ((lum[i] - low) * 255) / range
    // Gently push near-white paper background to pure white (255)
    const cleaned = stretched >= 232 ? 255 : stretched <= 14 ? 0 : stretched
    lum[i] = clampByte(cleaned)
  }

  return lum
}

/**
 * Apply 3x3 unsharp mask to crisp character strokes for Tesseract LSTM.
 */
export function sharpenLuminance(
  lum: Uint8Array,
  width: number,
  height: number,
  amount = 0.65,
): Uint8Array {
  if (width < 3 || height < 3) return new Uint8Array(lum)
  const out = new Uint8Array(lum.length)
  out.set(lum)

  for (let y = 1; y < height - 1; y++) {
    const row = y * width
    for (let x = 1; x < width - 1; x++) {
      const idx = row + x
      const center = lum[idx]
      const neighbors =
        lum[idx - width - 1] +
        lum[idx - width] * 2 +
        lum[idx - width + 1] +
        lum[idx - 1] * 2 +
        center * 4 +
        lum[idx + 1] * 2 +
        lum[idx + width - 1] +
        lum[idx + width] * 2 +
        lum[idx + width + 1]
      const blurred = neighbors / 16
      out[idx] = clampByte(center + (center - blurred) * amount)
    }
  }

  return out
}

function writeGrayscaleToRgba(lum: Uint8Array, rgba: Uint8ClampedArray): void {
  for (let i = 0, p = 0; i < lum.length; i++, p += 4) {
    const v = lum[i]
    rgba[p] = v
    rgba[p + 1] = v
    rgba[p + 2] = v
    rgba[p + 3] = 255
  }
}

/**
 * Standard document filter: grayscale + auto-invert + percentile contrast stretch + unsharp mask.
 */
export function applyStandardDocumentFilter(
  rgba: Uint8ClampedArray,
  width: number,
  height: number,
): void {
  if (width <= 0 || height <= 0) return
  const normalized = normalizeLuminanceChannel(rgba, width, height)
  const sharpened = sharpenLuminance(normalized, width, height, 0.65)
  writeGrayscaleToRgba(sharpened, rgba)
}

/**
 * High-contrast adaptive threshold filter using an integral image.
 * Eliminates uneven phone shadows, page curvature gradients, and textured backgrounds
 * while preserving soft glyph edges for OCR accuracy.
 */
export function applyAdaptiveThresholdFilter(
  rgba: Uint8ClampedArray,
  width: number,
  height: number,
): void {
  if (width <= 0 || height <= 0) return
  const lum = sharpenLuminance(normalizeLuminanceChannel(rgba, width, height), width, height, 0.5)

  const stride = width + 1
  const integral = new Float64Array(stride * (height + 1))

  for (let y = 1; y <= height; y++) {
    let rowSum = 0
    const srcRow = (y - 1) * width
    const dstRow = y * stride
    const prevRow = (y - 1) * stride
    for (let x = 1; x <= width; x++) {
      rowSum += lum[srcRow + x - 1]
      integral[dstRow + x] = integral[prevRow + x] + rowSum
    }
  }

  const radius = Math.max(10, Math.min(48, Math.round(Math.min(width, height) / 28)))
  const bias = 13
  const transition = 10
  const out = new Uint8Array(lum.length)

  for (let y = 0; y < height; y++) {
    const y0 = Math.max(0, y - radius)
    const y1 = Math.min(height, y + radius + 1)
    const rowOffset = y * width

    for (let x = 0; x < width; x++) {
      const x0 = Math.max(0, x - radius)
      const x1 = Math.min(width, x + radius + 1)
      const area = (x1 - x0) * (y1 - y0)
      const sum =
        integral[y1 * stride + x1] -
        integral[y0 * stride + x1] -
        integral[y1 * stride + x0] +
        integral[y0 * stride + x0]
      const localMean = sum / area
      const threshold = localMean - bias
      const pixel = lum[rowOffset + x]

      if (pixel <= threshold - transition) {
        out[rowOffset + x] = 0
      } else if (pixel >= threshold + transition) {
        out[rowOffset + x] = 255
      } else {
        // Soft anti-aliased ramp across the threshold boundary
        const ratio = (pixel - (threshold - transition)) / (2 * transition)
        out[rowOffset + x] = clampByte(ratio * 255)
      }
    }
  }

  writeGrayscaleToRgba(out, rgba)
}

export function loadImageElement(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new window.Image()
    image.decoding = 'async'
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('Unable to load the selected image.'))
    image.src = url
  })
}

export function computeTargetDimensions(
  cropWidth: number,
  cropHeight: number,
): { width: number; height: number } {
  const safeW = Math.max(1, cropWidth)
  const safeH = Math.max(1, cropHeight)
  const longest = Math.max(safeW, safeH)

  let scale = 1
  if (longest > MAX_OCR_DIMENSION) {
    scale = MAX_OCR_DIMENSION / longest
  } else if (longest < MIN_IDEAL_OCR_DIMENSION) {
    scale = Math.min(MAX_UPSCALE_FACTOR, MIN_IDEAL_OCR_DIMENSION / longest)
  }

  return {
    width: Math.max(1, Math.round(safeW * scale)),
    height: Math.max(1, Math.round(safeH * scale)),
  }
}

/**
 * Render an image with rotation, crop, resolution scaling, and document filter
 * into a lossless PNG data URL ready for Tesseract.
 */
export async function prepareImageForOcr(
  source: File | string,
  options: PreprocessOptions = {},
): Promise<string> {
  const rotation: RotationAngle = options.rotation ?? 0
  const crop = clampCropRect(options.crop ?? FULL_CROP_RECT)
  const preset: PreprocessPreset = options.preset ?? 'standard'

  const shouldRevoke = typeof source !== 'string'
  const fileUrl = typeof source === 'string' ? source : URL.createObjectURL(source)

  try {
    const image = await loadImageElement(fileUrl)
    const rawW = image.naturalWidth || image.width
    const rawH = image.naturalHeight || image.height

    // 1. Draw the rotated full-resolution source onto an oriented canvas.
    const isQuarterTurn = rotation === 90 || rotation === 270
    const orientedW = isQuarterTurn ? rawH : rawW
    const orientedH = isQuarterTurn ? rawW : rawH

    const orientedCanvas = document.createElement('canvas')
    orientedCanvas.width = Math.max(1, orientedW)
    orientedCanvas.height = Math.max(1, orientedH)
    const orientedCtx = orientedCanvas.getContext('2d')
    if (!orientedCtx) {
      throw new Error('Canvas is not available in this browser.')
    }

    orientedCtx.save()
    orientedCtx.translate(orientedCanvas.width / 2, orientedCanvas.height / 2)
    orientedCtx.rotate((rotation * Math.PI) / 180)
    orientedCtx.drawImage(image, -rawW / 2, -rawH / 2, rawW, rawH)
    orientedCtx.restore()

    // 2. Compute pixel crop bounds on the oriented canvas.
    const sx = Math.max(0, Math.round(crop.x * orientedW))
    const sy = Math.max(0, Math.round(crop.y * orientedH))
    const sw = Math.max(1, Math.min(orientedW - sx, Math.round(crop.width * orientedW)))
    const sh = Math.max(1, Math.min(orientedH - sy, Math.round(crop.height * orientedH)))

    // 3. Scale cropped region and add clean white padding around edges for OCR.
    const scaled = computeTargetDimensions(sw, sh)
    const canvas = document.createElement('canvas')
    canvas.width = scaled.width + OCR_BORDER_PADDING * 2
    canvas.height = scaled.height + OCR_BORDER_PADDING * 2

    const context = canvas.getContext('2d', { willReadFrequently: true })
    if (!context) {
      throw new Error('Canvas is not available in this browser.')
    }

    context.fillStyle = '#ffffff'
    context.fillRect(0, 0, canvas.width, canvas.height)
    context.imageSmoothingEnabled = true
    context.imageSmoothingQuality = 'high'
    context.drawImage(
      orientedCanvas,
      sx,
      sy,
      sw,
      sh,
      OCR_BORDER_PADDING,
      OCR_BORDER_PADDING,
      scaled.width,
      scaled.height,
    )

    // 4. Apply document preprocessing filter on the inner cropped region
    //    and keep the outer padding pure white.
    const imageData = context.getImageData(
      OCR_BORDER_PADDING,
      OCR_BORDER_PADDING,
      scaled.width,
      scaled.height,
    )
    if (preset === 'high-contrast') {
      applyAdaptiveThresholdFilter(imageData.data, scaled.width, scaled.height)
    } else {
      applyStandardDocumentFilter(imageData.data, scaled.width, scaled.height)
    }
    context.putImageData(imageData, OCR_BORDER_PADDING, OCR_BORDER_PADDING)

    return canvas.toDataURL('image/png')
  } finally {
    if (shouldRevoke) {
      URL.revokeObjectURL(fileUrl)
    }
  }
}
