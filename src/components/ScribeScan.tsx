import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import { Modal } from './Modal'
import { Spinner } from './Spinner'
import {
  clampCropRect,
  FULL_CROP_RECT,
  isFullCropRect,
  nextRotationAngle,
  prepareImageForOcr,
  type CropRect,
  type PreprocessPreset,
  type RotationAngle,
} from '../lib/imagePreprocess'
import {
  validateScannedStatBlock,
  type ScannedStatBlockValidation,
} from '../lib/scanValidation'

type ScanStage = 'idle' | 'framing' | 'processing' | 'review' | 'error'
type ScanSource = 'camera' | 'library'
type DragHandle = 'move' | 'nw' | 'ne' | 'sw' | 'se' | 'n' | 's' | 'w' | 'e'
type TesseractModule = typeof import('tesseract.js')
type TesseractWorker = Awaited<ReturnType<Awaited<TesseractModule>['createWorker']>>

const MOBILE_MQ = '(max-width: 767px)'
const DEFAULT_INITIAL_CROP: CropRect = {
  x: 0.04,
  y: 0.04,
  width: 0.92,
  height: 0.92,
}

function getTesseractModule(module: Awaited<TesseractModule>): TesseractModule {
  const m = module as { createWorker?: unknown; default?: { createWorker?: unknown } }
  if (typeof m.createWorker === 'function') return module as TesseractModule
  if (m.default && typeof m.default.createWorker === 'function') {
    return m.default as TesseractModule
  }
  return module as TesseractModule
}

function formatProgress(progress: number): string {
  return `${Math.max(5, Math.round(progress * 100))}%`
}

function scoreValidationCandidate(v: ScannedStatBlockValidation): number {
  const statusBonus = v.status === 'valid' ? 100 : v.status === 'partial' ? 40 : 0
  return statusBonus + v.parseResult.fieldsFound.length * 10 + Math.min(20, v.normalizedText.length / 20)
}

function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia(MOBILE_MQ).matches : false,
  )

  useEffect(() => {
    const mq = window.matchMedia(MOBILE_MQ)
    const onChange = () => setIsMobile(mq.matches)
    onChange()
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  return isMobile
}

export function ScribeScan({
  hasExistingText,
  onAccept,
}: {
  hasExistingText: boolean
  onAccept: (text: string) => void
}) {
  const isMobile = useIsMobile()
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const libraryInputRef = useRef<HTMLInputElement>(null)
  const previewUrlRef = useRef<string | null>(null)
  const cropStageRef = useRef<HTMLDivElement>(null)
  const workerRef = useRef<TesseractWorker | null>(null)
  const activeLoggerRef = useRef<((progress: number) => void) | null>(null)
  const runIdRef = useRef(0)

  const [isOpen, setIsOpen] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [processedPreviewUrl, setProcessedPreviewUrl] = useState<string | null>(null)
  const [selectedFileName, setSelectedFileName] = useState('')
  const [scanStage, setScanStage] = useState<ScanStage>('idle')
  const [scanProgress, setScanProgress] = useState(0)
  const [statusNote, setStatusNote] = useState('Reading the stat block on-device…')
  const [cropRect, setCropRect] = useState<CropRect>(DEFAULT_INITIAL_CROP)
  const [rotation, setRotation] = useState<RotationAngle>(0)
  const [preset, setPreset] = useState<PreprocessPreset>('standard')
  const [usedPreset, setUsedPreset] = useState<PreprocessPreset>('standard')
  const [editedText, setEditedText] = useState('')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const dragStateRef = useRef<{
    handle: DragHandle
    startClientX: number
    startClientY: number
    startRect: CropRect
  } | null>(null)

  const terminateCachedWorker = useCallback(async () => {
    activeLoggerRef.current = null
    const worker = workerRef.current
    workerRef.current = null
    if (worker) {
      try {
        await worker.terminate()
      } catch {
        /* ignore worker termination errors */
      }
    }
  }, [])

  const getOrCreateWorker = useCallback(async () => {
    if (workerRef.current) return workerRef.current
    const importedModule = await import('tesseract.js')
    const Tesseract = getTesseractModule(importedModule)
    const worker = await Tesseract.createWorker('eng', undefined, {
      logger: (message) => {
        if (typeof message.progress === 'number') {
          activeLoggerRef.current?.(message.progress)
        }
      },
    })
    await worker.setParameters({
      preserve_interword_spaces: '1',
      tessedit_pageseg_mode: Tesseract.PSM?.SINGLE_COLUMN ?? ('4' as never),
    })
    workerRef.current = worker
    return worker
  }, [])

  const clearSelectedScan = useCallback(() => {
    runIdRef.current += 1
    activeLoggerRef.current = null
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current)
      previewUrlRef.current = null
    }
    setSelectedFile(null)
    setPreviewUrl(null)
    setProcessedPreviewUrl(null)
    setSelectedFileName('')
    setScanStage('idle')
    setScanProgress(0)
    setStatusNote('Reading the stat block on-device…')
    setCropRect(DEFAULT_INITIAL_CROP)
    setRotation(0)
    setPreset('standard')
    setUsedPreset('standard')
    setEditedText('')
    setErrorMessage(null)
  }, [])

  useEffect(
    () => () => {
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current)
      }
      runIdRef.current += 1
      void terminateCachedWorker()
    },
    [terminateCachedWorker],
  )

  // Close the scanner if the viewport leaves the mobile breakpoint.
  useEffect(() => {
    if (!isMobile && isOpen) {
      clearSelectedScan()
      void terminateCachedWorker()
      setIsOpen(false)
    }
  }, [isMobile, isOpen, clearSelectedScan, terminateCachedWorker])

  const handleOpen = useCallback(() => {
    clearSelectedScan()
    setIsOpen(true)
  }, [clearSelectedScan])

  const handleClose = useCallback(() => {
    clearSelectedScan()
    void terminateCachedWorker()
    setIsOpen(false)
  }, [clearSelectedScan, terminateCachedWorker])

  const triggerInput = useCallback((source: ScanSource) => {
    if (source === 'camera') {
      cameraInputRef.current?.click()
      return
    }
    libraryInputRef.current?.click()
  }, [])

  const runOcrScan = useCallback(
    async (
      fileToScan: File,
      options: {
        crop: CropRect
        rotation: RotationAngle
        preferredPreset: PreprocessPreset
        allowAutoRetry: boolean
      },
    ) => {
      const runId = runIdRef.current + 1
      runIdRef.current = runId

      setScanStage('processing')
      setScanProgress(0.06)
      setStatusNote('Enhancing page contrast and reading stat block…')
      setErrorMessage(null)

      try {
        const preparedPrimary = await prepareImageForOcr(fileToScan, {
          crop: options.crop,
          rotation: options.rotation,
          preset: options.preferredPreset,
        })
        if (runId !== runIdRef.current) return

        setProcessedPreviewUrl(preparedPrimary)
        const worker = await getOrCreateWorker()
        if (runId !== runIdRef.current) return

        activeLoggerRef.current = (progress) => {
          if (runId !== runIdRef.current) return
          setScanProgress(Math.max(0.08, progress * (options.allowAutoRetry ? 0.85 : 1)))
        }

        const primaryRecognition = await worker.recognize(preparedPrimary)
        if (runId !== runIdRef.current) return

        let bestValidation = validateScannedStatBlock(primaryRecognition.data.text)
        let bestPreset: PreprocessPreset = options.preferredPreset
        let bestPreview = preparedPrimary

        // Automatic fallback: if standard filter struggled on shadowed / parchment / dark print,
        // automatically try adaptive high-contrast thresholding and keep the stronger result.
        const needsFallback =
          options.allowAutoRetry &&
          options.preferredPreset === 'standard' &&
          (bestValidation.status === 'invalid' ||
            (bestValidation.status === 'partial' &&
              bestValidation.parseResult.fieldsFound.length < 3))

        if (needsFallback) {
          setStatusNote('Retrying with adaptive high-contrast filter for shadowed print…')
          setScanProgress(0.86)

          const preparedAlt = await prepareImageForOcr(fileToScan, {
            crop: options.crop,
            rotation: options.rotation,
            preset: 'high-contrast',
          })
          if (runId !== runIdRef.current) return

          activeLoggerRef.current = (progress) => {
            if (runId !== runIdRef.current) return
            setScanProgress(0.86 + progress * 0.14)
          }

          const altRecognition = await worker.recognize(preparedAlt)
          if (runId !== runIdRef.current) return

          const altValidation = validateScannedStatBlock(altRecognition.data.text)
          if (scoreValidationCandidate(altValidation) > scoreValidationCandidate(bestValidation)) {
            bestValidation = altValidation
            bestPreset = 'high-contrast'
            bestPreview = preparedAlt
          }
        }

        activeLoggerRef.current = null
        setProcessedPreviewUrl(bestPreview)
        setUsedPreset(bestPreset)
        setEditedText(bestValidation.normalizedText)
        setScanProgress(1)
        setScanStage('review')
      } catch (error) {
        if (runId !== runIdRef.current) return
        activeLoggerRef.current = null
        console.error('Failed to scan stat block:', error)
        setScanStage('error')
        setErrorMessage(
          'We could not read that image on this device. Try cropping tighter around the stat block or taking a brighter photo.',
        )
      }
    },
    [getOrCreateWorker],
  )

  const handleFileSelection = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return

    if (!file.type.startsWith('image/')) {
      setScanStage('error')
      setErrorMessage(
        'That file is not an image. Take a photo or choose a picture of the stat block.',
      )
      return
    }

    const nextPreviewUrl = URL.createObjectURL(file)
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current)
    }
    previewUrlRef.current = nextPreviewUrl

    setSelectedFile(file)
    setPreviewUrl(nextPreviewUrl)
    setProcessedPreviewUrl(null)
    setSelectedFileName(file.name || 'Captured image')
    setCropRect(DEFAULT_INITIAL_CROP)
    setRotation(0)
    setPreset('standard')
    setEditedText('')
    setErrorMessage(null)
    setScanStage('framing')
  }, [])

  const handleStartScanFromFraming = useCallback(() => {
    if (!selectedFile) return
    void runOcrScan(selectedFile, {
      crop: cropRect,
      rotation,
      preferredPreset: preset,
      allowAutoRetry: true,
    })
  }, [selectedFile, cropRect, rotation, preset, runOcrScan])

  const handleRescanWithPreset = useCallback(
    (nextPreset: PreprocessPreset) => {
      if (!selectedFile) return
      setPreset(nextPreset)
      void runOcrScan(selectedFile, {
        crop: cropRect,
        rotation,
        preferredPreset: nextPreset,
        allowAutoRetry: false,
      })
    },
    [selectedFile, cropRect, rotation, runOcrScan],
  )

  const handlePointerDown = useCallback(
    (handle: DragHandle) => (event: ReactPointerEvent<HTMLElement>) => {
      event.preventDefault()
      event.stopPropagation()
      ;(event.currentTarget as HTMLElement).setPointerCapture?.(event.pointerId)
      dragStateRef.current = {
        handle,
        startClientX: event.clientX,
        startClientY: event.clientY,
        startRect: { ...cropRect },
      }
    },
    [cropRect],
  )

  const handlePointerMove = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragStateRef.current
    const container = cropStageRef.current
    if (!drag || !container) return

    const bounds = container.getBoundingClientRect()
    if (bounds.width <= 0 || bounds.height <= 0) return

    const dx = (event.clientX - drag.startClientX) / bounds.width
    const dy = (event.clientY - drag.startClientY) / bounds.height
    const s = drag.startRect

    if (drag.handle === 'move') {
      const nextX = Math.max(0, Math.min(1 - s.width, s.x + dx))
      const nextY = Math.max(0, Math.min(1 - s.height, s.y + dy))
      setCropRect({ x: nextX, y: nextY, width: s.width, height: s.height })
      return
    }

    let left = s.x
    let top = s.y
    let right = s.x + s.width
    let bottom = s.y + s.height

    if (drag.handle.includes('w')) {
      left = Math.max(0, Math.min(right - 0.1, s.x + dx))
    }
    if (drag.handle.includes('e')) {
      right = Math.min(1, Math.max(left + 0.1, s.x + s.width + dx))
    }
    if (drag.handle.includes('n')) {
      top = Math.max(0, Math.min(bottom - 0.1, s.y + dy))
    }
    if (drag.handle.includes('s')) {
      bottom = Math.min(1, Math.max(top + 0.1, s.y + s.height + dy))
    }

    setCropRect(
      clampCropRect({
        x: left,
        y: top,
        width: right - left,
        height: bottom - top,
      }),
    )
  }, [])

  const handlePointerUp = useCallback(() => {
    dragStateRef.current = null
  }, [])

  const liveValidation = useMemo(
    () => validateScannedStatBlock(editedText),
    [editedText],
  )

  const handleAccept = useCallback(() => {
    if (!liveValidation.isUsable) return
    onAccept(liveValidation.normalizedText)
    handleClose()
  }, [handleClose, onAccept, liveValidation])

  if (!isMobile) return null

  const forge = liveValidation.parseResult.forge
  const isProcessing = scanStage === 'processing'

  return (
    <>
      <div className="scan-cta mobile-only">
        <div className="scan-cta-copy">
          <span className="scan-badge">Camera</span>
          <p className="scan-cta-title">Scan a printed stat block</p>
          <p className="scan-cta-hint">
            Crop to a single monster, enhance print contrast, and read it with on-device OCR. The
            image never leaves your browser.
          </p>
        </div>
        <button type="button" className="btn btn-gold" onClick={handleOpen}>
          <CameraIcon />
          Open scanner
        </button>
      </div>

      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="sr-only"
        onChange={handleFileSelection}
      />
      <input
        ref={libraryInputRef}
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={handleFileSelection}
      />

      {isOpen && (
        <Modal title="Scan printed stat block" onClose={handleClose} wide>
          <div className="scan-modal">
            <p className="hint" style={{ margin: 0 }}>
              Best with bright lighting and a flat page. Frame only the stat block you want to
              convert so surrounding columns and art are ignored.
            </p>

            <div className="scan-actions scan-actions-row">
              <button
                type="button"
                className="btn btn-gold"
                onClick={() => triggerInput('camera')}
                disabled={isProcessing}
              >
                <CameraIcon />
                Take photo
              </button>
              <button
                type="button"
                className="btn"
                onClick={() => triggerInput('library')}
                disabled={isProcessing}
              >
                Choose image
              </button>
            </div>

            {scanStage === 'idle' && !previewUrl && (
              <div className="scan-empty">
                <CameraIcon large />
                <p className="scan-cta-title">Snap or choose a monster stat block</p>
                <p className="hint" style={{ margin: 0 }}>
                  You can crop out surrounding columns, rotate sideways photos, and edit the
                  extracted text before inserting it into Scribe.
                </p>
              </div>
            )}

            {scanStage === 'framing' && previewUrl && (
              <div className="scan-framing-pane">
                <div className="scan-preview-head">
                  <div>
                    <p className="scan-cta-title">Frame the stat block</p>
                    <p className="hint" style={{ margin: 0 }}>
                      Drag the corners to isolate just the monster stat block.
                    </p>
                  </div>
                  <div className="scan-toolbar-inline">
                    <button
                      type="button"
                      className="btn btn-sm"
                      onClick={() => setRotation((r) => nextRotationAngle(r))}
                    >
                      ↻ Rotate 90°
                    </button>
                    <button
                      type="button"
                      className="btn btn-sm"
                      onClick={() => setCropRect(FULL_CROP_RECT)}
                      disabled={isFullCropRect(cropRect)}
                    >
                      Full image
                    </button>
                  </div>
                </div>

                <div
                  ref={cropStageRef}
                  className="scan-crop-stage"
                  onPointerMove={handlePointerMove}
                  onPointerUp={handlePointerUp}
                  onPointerCancel={handlePointerUp}
                >
                  <img
                    src={previewUrl}
                    alt="Stat block to crop"
                    className="scan-crop-img"
                    style={
                      rotation !== 0
                        ? { transform: `rotate(${rotation}deg)` }
                        : undefined
                    }
                    draggable={false}
                  />
                  <div
                    className="scan-crop-box"
                    style={{
                      left: `${cropRect.x * 100}%`,
                      top: `${cropRect.y * 100}%`,
                      width: `${cropRect.width * 100}%`,
                      height: `${cropRect.height * 100}%`,
                    }}
                    onPointerDown={handlePointerDown('move')}
                    role="region"
                    aria-label="Crop selection area"
                  >
                    <span
                      className="scan-crop-handle nw"
                      onPointerDown={handlePointerDown('nw')}
                    />
                    <span
                      className="scan-crop-handle ne"
                      onPointerDown={handlePointerDown('ne')}
                    />
                    <span
                      className="scan-crop-handle sw"
                      onPointerDown={handlePointerDown('sw')}
                    />
                    <span
                      className="scan-crop-handle se"
                      onPointerDown={handlePointerDown('se')}
                    />
                  </div>
                </div>

                <div className="scan-preset-bar" role="group" aria-label="Document enhancement mode">
                  <span className="flbl">Page filter</span>
                  <div className="scan-preset-pills">
                    <button
                      type="button"
                      className={'btn btn-sm' + (preset === 'standard' ? ' btn-gold' : '')}
                      onClick={() => setPreset('standard')}
                    >
                      Standard print
                    </button>
                    <button
                      type="button"
                      className={'btn btn-sm' + (preset === 'high-contrast' ? ' btn-gold' : '')}
                      onClick={() => setPreset('high-contrast')}
                    >
                      High contrast (shadows / tint)
                    </button>
                  </div>
                </div>

                <div className="scan-actions end">
                  <button
                    type="button"
                    className="btn btn-gold"
                    onClick={handleStartScanFromFraming}
                  >
                    Scan selection ⟶
                  </button>
                </div>
              </div>
            )}

            {(scanStage === 'processing' || scanStage === 'review' || scanStage === 'error') &&
              previewUrl && (
                <div className="scan-result">
                  <div className="scan-preview-pane">
                    <div className="scan-preview-head">
                      <div>
                        <p className="scan-cta-title">
                          {processedPreviewUrl ? 'Scanned selection' : 'Selected image'}
                        </p>
                        <p className="hint" style={{ margin: 0 }}>
                          {selectedFileName}
                          {scanStage === 'review'
                            ? ` · ${usedPreset === 'high-contrast' ? 'High-contrast' : 'Standard'} filter`
                            : ''}
                        </p>
                      </div>
                      <div className="scan-toolbar-inline">
                        <button
                          type="button"
                          className="btn btn-sm"
                          onClick={() => setScanStage('framing')}
                          disabled={isProcessing}
                        >
                          Adjust crop
                        </button>
                        {scanStage === 'review' && (
                          <button
                            type="button"
                            className="btn btn-sm"
                            onClick={() =>
                              handleRescanWithPreset(
                                usedPreset === 'standard' ? 'high-contrast' : 'standard',
                              )
                            }
                          >
                            {usedPreset === 'standard'
                              ? 'Try high-contrast'
                              : 'Try standard'}
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="scan-preview-frame">
                      <img
                        src={processedPreviewUrl ?? previewUrl}
                        alt="Processed stat block preview"
                      />
                    </div>
                  </div>

                  <div className="scan-status-pane">
                    {scanStage === 'processing' && (
                      <div className="scan-processing">
                        <Spinner label={statusNote} />
                        <div className="scan-progress" aria-hidden="true">
                          <div
                            className="scan-progress-bar"
                            style={{ width: formatProgress(scanProgress) }}
                          />
                        </div>
                        <p className="hint" style={{ margin: 0 }}>
                          {formatProgress(scanProgress)} complete — discarded if you cancel.
                        </p>
                      </div>
                    )}

                    {scanStage === 'review' && (
                      <div className="scan-review">
                        <div className="scan-status-row">
                          {liveValidation.status === 'valid' && (
                            <>
                              <span className="scan-badge ok">Recognized</span>
                              <p className="hint" style={{ margin: 0 }}>
                                {liveValidation.systemLabel} detected —{' '}
                                {liveValidation.parseResult.fieldsFound.length} fields bound.
                              </p>
                            </>
                          )}
                          {liveValidation.status === 'partial' && (
                            <>
                              <span className="scan-badge warn">Needs review</span>
                              <p className="hint" style={{ margin: 0 }}>
                                {liveValidation.systemLabel} partial read —{' '}
                                {liveValidation.parseResult.fieldsFound.length} fields bound. You
                                can edit below or insert as-is.
                              </p>
                            </>
                          )}
                          {liveValidation.status === 'invalid' && (
                            <>
                              <span className="scan-badge bad">Not recognized</span>
                              <p className="hint" style={{ margin: 0 }}>
                                Missing key stat block fields. Adjust the crop, try high-contrast,
                                or edit the text below.
                              </p>
                            </>
                          )}
                        </div>

                        <div className="scan-summary">
                          <div className="scan-summary-cell">
                            <span className="flbl">Name</span>
                            <strong>
                              {liveValidation.parseResult.fieldsFound.includes('name')
                                ? forge.name
                                : 'Missing'}
                            </strong>
                          </div>
                          <div className="scan-summary-cell">
                            <span className="flbl">AC</span>
                            <strong>
                              {liveValidation.parseResult.fieldsFound.includes('ac')
                                ? forge.ac
                                : 'Missing'}
                            </strong>
                          </div>
                          <div className="scan-summary-cell">
                            <span className="flbl">HD</span>
                            <strong>
                              {liveValidation.parseResult.fieldsFound.includes('hd') ||
                              liveValidation.parseResult.fieldsFound.includes('hp')
                                ? forge.hd
                                : '—'}
                            </strong>
                          </div>
                          <div className="scan-summary-cell">
                            <span className="flbl">Atk</span>
                            <strong>
                              {liveValidation.parseResult.fieldsFound.includes('attacks')
                                ? 'yes'
                                : '—'}
                            </strong>
                          </div>
                        </div>

                        {liveValidation.reasons.length > 0 && (
                          <div
                            className={
                              liveValidation.status === 'partial' ? 'scan-warn-box' : 'scan-reject'
                            }
                          >
                            <p className="scan-cta-title">
                              {liveValidation.status === 'partial'
                                ? 'Fields to check'
                                : 'Why it was not recognized'}
                            </p>
                            <ul>
                              {liveValidation.reasons.map((reason) => (
                                <li key={reason}>{reason}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        <div className="scan-editor-block">
                          <label className="flbl" htmlFor="scan-ocr-textarea">
                            Extracted text (editable — fixes update fields live)
                          </label>
                          <textarea
                            id="scan-ocr-textarea"
                            className="ta scan-text-editor"
                            value={editedText}
                            onChange={(e) => setEditedText(e.target.value)}
                            rows={7}
                            placeholder="No readable text was found. Adjust the crop or try another photo."
                          />
                        </div>

                        <div className="scan-actions end">
                          <button
                            type="button"
                            className="btn"
                            onClick={() => setScanStage('framing')}
                          >
                            Adjust crop
                          </button>
                          <button
                            type="button"
                            className="btn btn-gold"
                            onClick={handleAccept}
                            disabled={!liveValidation.isUsable}
                          >
                            {hasExistingText ? 'Replace scribe text' : 'Insert into scribe'}
                          </button>
                        </div>
                      </div>
                    )}

                    {scanStage === 'error' && (
                      <div className="scan-invalid">
                        <div className="scan-status-row">
                          <span className="scan-badge bad">Scan failed</span>
                          <p className="hint" style={{ margin: 0 }}>
                            The scanner hit a browser or OCR problem.
                          </p>
                        </div>
                        <div className="scan-reject">
                          <p className="hint" style={{ margin: 0 }}>
                            {errorMessage}
                          </p>
                        </div>
                        <div className="scan-actions end">
                          <button type="button" className="btn" onClick={handleClose}>
                            Cancel
                          </button>
                          <button
                            type="button"
                            className="btn btn-gold"
                            onClick={() => triggerInput('camera')}
                          >
                            Try again
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
          </div>
        </Modal>
      )}
    </>
  )
}

function CameraIcon({ large = false }: { large?: boolean }) {
  return (
    <svg
      className={large ? 'scan-icon-lg' : 'scan-icon'}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M3 7h4l2-2h6l2 2h4v10a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
      <circle cx="12" cy="13" r="3.5" />
    </svg>
  )
}
