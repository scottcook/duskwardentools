import { useCallback, useEffect, useRef, useState, type ChangeEvent } from 'react'
import { Modal } from './Modal'
import { Spinner } from './Spinner'
import {
  validateScannedStatBlock,
  type ScannedStatBlockValidation,
} from '../lib/scanValidation'

type ScanStage = 'idle' | 'processing' | 'valid' | 'invalid' | 'error'
type ScanSource = 'camera' | 'library'
type TesseractModule = typeof import('tesseract.js')

const MAX_IMAGE_DIMENSION = 1800
const PREVIEW_TEXT_LIMIT = 1400
const MOBILE_MQ = '(max-width: 767px)'

function getTesseractModule(module: Awaited<TesseractModule>): TesseractModule {
  const m = module as { createWorker?: unknown; default?: { createWorker?: unknown } }
  if (typeof m.createWorker === 'function') return module as TesseractModule
  if (m.default && typeof m.default.createWorker === 'function') {
    return m.default as TesseractModule
  }
  return module as TesseractModule
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new window.Image()
    image.decoding = 'async'
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('Unable to load the selected image.'))
    image.src = url
  })
}

async function prepareImageForOcr(file: File): Promise<string> {
  const fileUrl = URL.createObjectURL(file)

  try {
    const image = await loadImage(fileUrl)
    const width = image.naturalWidth || image.width
    const height = image.naturalHeight || image.height
    const scale = Math.min(1, MAX_IMAGE_DIMENSION / Math.max(width, height))

    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.round(width * scale))
    canvas.height = Math.max(1, Math.round(height * scale))

    const context = canvas.getContext('2d')
    if (!context) {
      throw new Error('Canvas is not available in this browser.')
    }

    context.fillStyle = '#ffffff'
    context.fillRect(0, 0, canvas.width, canvas.height)
    context.drawImage(image, 0, 0, canvas.width, canvas.height)

    return canvas.toDataURL('image/jpeg', 0.92)
  } finally {
    URL.revokeObjectURL(fileUrl)
  }
}

function formatProgress(progress: number): string {
  return `${Math.max(5, Math.round(progress * 100))}%`
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
  const runIdRef = useRef(0)

  const [isOpen, setIsOpen] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [selectedFileName, setSelectedFileName] = useState('')
  const [scanStage, setScanStage] = useState<ScanStage>('idle')
  const [scanProgress, setScanProgress] = useState(0)
  const [result, setResult] = useState<ScannedStatBlockValidation | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const clearSelectedScan = useCallback(() => {
    runIdRef.current += 1
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current)
      previewUrlRef.current = null
    }
    setPreviewUrl(null)
    setSelectedFileName('')
    setScanStage('idle')
    setScanProgress(0)
    setResult(null)
    setErrorMessage(null)
  }, [])

  useEffect(
    () => () => {
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current)
      }
      runIdRef.current += 1
    },
    [],
  )

  // Close the scanner if the viewport leaves the mobile breakpoint.
  useEffect(() => {
    if (!isMobile && isOpen) {
      clearSelectedScan()
      setIsOpen(false)
    }
  }, [isMobile, isOpen, clearSelectedScan])

  const handleOpen = useCallback(() => {
    clearSelectedScan()
    setIsOpen(true)
  }, [clearSelectedScan])

  const handleClose = useCallback(() => {
    clearSelectedScan()
    setIsOpen(false)
  }, [clearSelectedScan])

  const triggerInput = useCallback((source: ScanSource) => {
    if (source === 'camera') {
      cameraInputRef.current?.click()
      return
    }
    libraryInputRef.current?.click()
  }, [])

  const processFile = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setScanStage('error')
      setErrorMessage('That file is not an image. Take a photo or choose a picture of the stat block.')
      return
    }

    const nextPreviewUrl = URL.createObjectURL(file)
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current)
    }
    previewUrlRef.current = nextPreviewUrl

    setPreviewUrl(nextPreviewUrl)
    setSelectedFileName(file.name || 'Captured image')
    setScanStage('processing')
    setScanProgress(0.05)
    setResult(null)
    setErrorMessage(null)

    const runId = runIdRef.current + 1
    runIdRef.current = runId

    try {
      const preparedImage = await prepareImageForOcr(file)
      const importedModule = await import('tesseract.js')
      const Tesseract = getTesseractModule(importedModule)
      const worker = await Tesseract.createWorker('eng', undefined, {
        logger: (message) => {
          if (runId !== runIdRef.current) return
          if (typeof message.progress === 'number') {
            setScanProgress(Math.max(0.05, message.progress))
          }
        },
      })

      try {
        await worker.setParameters({
          preserve_interword_spaces: '1',
          tessedit_pageseg_mode: Tesseract.PSM.SINGLE_BLOCK,
        })

        const recognition = await worker.recognize(preparedImage)
        if (runId !== runIdRef.current) return

        const nextResult = validateScannedStatBlock(recognition.data.text)
        setResult(nextResult)
        setScanProgress(1)
        setScanStage(nextResult.isRecognized ? 'valid' : 'invalid')
      } finally {
        await worker.terminate()
      }
    } catch (error) {
      if (runId !== runIdRef.current) return
      console.error('Failed to scan stat block:', error)
      setScanStage('error')
      setErrorMessage(
        'We could not read that image on this device. Try a brighter, tighter photo of just the stat block.',
      )
    }
  }, [])

  const handleFileSelection = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0]
      event.target.value = ''
      if (!file) return
      void processFile(file)
    },
    [processFile],
  )

  const handleAccept = useCallback(() => {
    if (!result?.isRecognized) return
    onAccept(result.normalizedText)
    handleClose()
  }, [handleClose, onAccept, result])

  if (!isMobile) return null

  const forge = result?.parseResult.forge
  const previewText = result?.normalizedText.slice(0, PREVIEW_TEXT_LIMIT)
  const isProcessing = scanStage === 'processing'

  return (
    <>
      <div className="scan-cta mobile-only">
        <div className="scan-cta-copy">
          <span className="scan-badge">Camera</span>
          <p className="scan-cta-title">Scan a printed stat block</p>
          <p className="scan-cta-hint">
            On-device OCR reads a photo and pastes it into Scribe — only if it looks like a real
            monster. The image never leaves your browser.
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
              Best with bright lighting, a flat page, and the stat block filling most of the frame.
              Private by default — the photo stays on your device.
            </p>

            <div className="scan-actions">
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

            {!previewUrl && (
              <div className="scan-empty">
                <CameraIcon large />
                <p className="scan-cta-title">Snap a single monster stat block</p>
                <p className="hint" style={{ margin: 0 }}>
                  The scanner rejects images that do not look like a legitimate stat block, so
                  nothing gets pasted accidentally.
                </p>
              </div>
            )}

            {previewUrl && (
              <div className="scan-result">
                <div className="scan-preview-pane">
                  <div className="scan-preview-head">
                    <div>
                      <p className="scan-cta-title">Selected image</p>
                      <p className="hint" style={{ margin: 0 }}>
                        {selectedFileName}
                      </p>
                    </div>
                    <button
                      type="button"
                      className="btn btn-sm"
                      onClick={() => triggerInput('camera')}
                      disabled={isProcessing}
                    >
                      Retake
                    </button>
                  </div>
                  <div className="scan-preview-frame">
                    <img src={previewUrl} alt="Selected stat block preview" />
                  </div>
                </div>

                <div className="scan-status-pane">
                  {scanStage === 'processing' && (
                    <div className="scan-processing">
                      <Spinner label="Reading the stat block on-device…" />
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

                  {scanStage === 'valid' && result && forge && (
                    <div className="scan-valid">
                      <div className="scan-status-row">
                        <span className="scan-badge ok">Recognized</span>
                        <p className="hint" style={{ margin: 0 }}>
                          {result.systemLabel} detected — {result.parseResult.fieldsFound.length}{' '}
                          fields bound.
                        </p>
                      </div>

                      <div className="scan-summary">
                        <div className="scan-summary-cell">
                          <span className="flbl">Name</span>
                          <strong>{forge.name || 'Unknown'}</strong>
                        </div>
                        <div className="scan-summary-cell">
                          <span className="flbl">AC</span>
                          <strong>{forge.ac}</strong>
                        </div>
                        <div className="scan-summary-cell">
                          <span className="flbl">HD</span>
                          <strong>{forge.hd}</strong>
                        </div>
                        <div className="scan-summary-cell">
                          <span className="flbl">Atk</span>
                          <strong>{forge.atkText ? 'yes' : '—'}</strong>
                        </div>
                      </div>

                      <div>
                        <p className="scan-cta-title">Extracted text</p>
                        <pre className="scan-text-preview">
                          {previewText}
                          {result.normalizedText.length > PREVIEW_TEXT_LIMIT ? '\n\n…' : ''}
                        </pre>
                      </div>

                      <div className="scan-actions end">
                        <button
                          type="button"
                          className="btn"
                          onClick={() => triggerInput('camera')}
                        >
                          Scan another
                        </button>
                        <button type="button" className="btn btn-gold" onClick={handleAccept}>
                          {hasExistingText ? 'Replace scribe text' : 'Insert into scribe'}
                        </button>
                      </div>
                    </div>
                  )}

                  {scanStage === 'invalid' && result && (
                    <div className="scan-invalid">
                      <div className="scan-status-row">
                        <span className="scan-badge bad">Not recognized</span>
                        <p className="hint" style={{ margin: 0 }}>
                          This image did not pass the monster stat block checks.
                        </p>
                      </div>
                      <div className="scan-reject">
                        <p className="scan-cta-title">Why it was rejected</p>
                        <ul>
                          {result.reasons.map((reason) => (
                            <li key={reason}>{reason}</li>
                          ))}
                        </ul>
                      </div>
                      <div className="scan-actions end">
                        <button type="button" className="btn" onClick={handleClose}>
                          Discard
                        </button>
                        <button
                          type="button"
                          className="btn btn-gold"
                          onClick={() => triggerInput('camera')}
                        >
                          Try another photo
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
