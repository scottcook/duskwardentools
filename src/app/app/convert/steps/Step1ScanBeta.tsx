'use client';

import NextImage from 'next/image';
import { useCallback, useEffect, useRef, useState, type ChangeEvent } from 'react';
import { Badge, Button, Modal, Spinner } from '@/components/ui';
import { trackEvent } from '@/lib/analytics';
import {
  validateScannedStatBlock,
  type ScannedStatBlockValidation,
} from '@/lib/parser/scanValidation';
import type { SourceSystem } from '@/types';

type ScanStage = 'idle' | 'processing' | 'valid' | 'invalid' | 'error';
type ScanSource = 'camera' | 'library';
type TesseractModule = typeof import('tesseract.js');

const MAX_IMAGE_DIMENSION = 1800;
const PREVIEW_TEXT_LIMIT = 1400;

const SOURCE_SYSTEM_LABELS: Record<SourceSystem, string> = {
  '5e': '5e / 5.5e',
  bx: 'B/X D&D',
  ose: 'OSE',
  bfrpg: 'Basic Fantasy RPG',
  cairn: 'Cairn',
  adnd1e: 'AD&D 1e',
  other: 'Other / Generic',
};

function getTesseractModule(module: Awaited<TesseractModule>): TesseractModule {
  const m = module as { createWorker?: unknown; default?: { createWorker?: unknown } };
  if (typeof m.createWorker === 'function') return module as TesseractModule;
  if (m.default && typeof m.default.createWorker === 'function') {
    return m.default as TesseractModule;
  }
  return module as TesseractModule;
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new window.Image();
    image.decoding = 'async';
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Unable to load the selected image.'));
    image.src = url;
  });
}

async function prepareImageForOcr(file: File): Promise<string> {
  const fileUrl = URL.createObjectURL(file);

  try {
    const image = await loadImage(fileUrl);
    const width = image.naturalWidth || image.width;
    const height = image.naturalHeight || image.height;
    const scale = Math.min(1, MAX_IMAGE_DIMENSION / Math.max(width, height));

    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(width * scale));
    canvas.height = Math.max(1, Math.round(height * scale));

    const context = canvas.getContext('2d');
    if (!context) {
      throw new Error('Canvas is not available in this browser.');
    }

    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);

    return canvas.toDataURL('image/jpeg', 0.92);
  } finally {
    URL.revokeObjectURL(fileUrl);
  }
}

function formatProgress(progress: number): string {
  return `${Math.max(5, Math.round(progress * 100))}%`;
}

interface Step1ScanBetaProps {
  hasExistingText: boolean;
  onAccept: (text: string) => void;
}

export function Step1ScanBeta({ hasExistingText, onAccept }: Step1ScanBetaProps) {
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const libraryInputRef = useRef<HTMLInputElement>(null);
  const previewUrlRef = useRef<string | null>(null);
  const runIdRef = useRef(0);

  const [isOpen, setIsOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedFileName, setSelectedFileName] = useState('');
  const [scanStage, setScanStage] = useState<ScanStage>('idle');
  const [scanProgress, setScanProgress] = useState(0);
  const [result, setResult] = useState<ScannedStatBlockValidation | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const clearSelectedScan = useCallback(() => {
    runIdRef.current += 1;
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
    }
    setPreviewUrl(null);
    setSelectedFileName('');
    setScanStage('idle');
    setScanProgress(0);
    setResult(null);
    setErrorMessage(null);
  }, []);

  useEffect(() => () => {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
    }
  }, []);

  const handleOpen = useCallback(() => {
    clearSelectedScan();
    setIsOpen(true);
    trackEvent('convert_scan_beta_open');
  }, [clearSelectedScan]);

  const handleClose = useCallback(() => {
    clearSelectedScan();
    setIsOpen(false);
  }, [clearSelectedScan]);

  const triggerInput = useCallback((source: ScanSource) => {
    trackEvent('convert_scan_beta_choose_source', { source });
    if (source === 'camera') {
      cameraInputRef.current?.click();
      return;
    }
    libraryInputRef.current?.click();
  }, []);

  const processFile = useCallback(async (file: File, source: ScanSource) => {
    const nextPreviewUrl = URL.createObjectURL(file);
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
    }
    previewUrlRef.current = nextPreviewUrl;

    setPreviewUrl(nextPreviewUrl);
    setSelectedFileName(file.name);
    setScanStage('processing');
    setScanProgress(0.05);
    setResult(null);
    setErrorMessage(null);

    const runId = runIdRef.current + 1;
    runIdRef.current = runId;

    try {
      const preparedImage = await prepareImageForOcr(file);
      const importedModule = await import('tesseract.js');
      const Tesseract = getTesseractModule(importedModule);
      const worker = await Tesseract.createWorker('eng', undefined, {
        logger: (message) => {
          if (runId !== runIdRef.current) return;
          if (typeof message.progress === 'number') {
            setScanProgress(Math.max(0.05, message.progress));
          }
        },
      });

      try {
        await worker.setParameters({
          preserve_interword_spaces: '1',
          tessedit_pageseg_mode: Tesseract.PSM.SINGLE_BLOCK,
        });

        const recognition = await worker.recognize(preparedImage);
        if (runId !== runIdRef.current) return;

        const nextResult = validateScannedStatBlock(recognition.data.text);
        setResult(nextResult);
        setScanProgress(1);
        setScanStage(nextResult.isRecognized ? 'valid' : 'invalid');

        trackEvent('convert_scan_beta_result', {
          source,
          accepted: nextResult.isRecognized,
          detectedSystem: nextResult.detection?.system ?? 'other',
        });
      } finally {
        await worker.terminate();
      }
    } catch (error) {
      if (runId !== runIdRef.current) return;
      console.error('Failed to scan stat block:', error);
      setScanStage('error');
      setErrorMessage('We could not read that image on this device. Try a brighter, tighter photo of just the stat block.');
      trackEvent('convert_scan_beta_error', { source });
    }
  }, []);

  const handleFileSelection = useCallback((source: ScanSource) => {
    return (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      event.target.value = '';
      if (!file) return;
      void processFile(file, source);
    };
  }, [processFile]);

  const handleAccept = useCallback(() => {
    if (!result?.isRecognized) return;
    onAccept(result.normalizedText);
    trackEvent('convert_scan_beta_insert', {
      replacedExistingText: hasExistingText,
      detectedSystem: result.detection?.system ?? 'other',
    });
    handleClose();
  }, [handleClose, hasExistingText, onAccept, result]);

  const scanSummary = result?.parseResult.data;
  const previewText = result?.normalizedText.slice(0, PREVIEW_TEXT_LIMIT);
  const isProcessing = scanStage === 'processing';

  return (
    <>
      <div className="rounded-2xl border border-accent/30 bg-[linear-gradient(135deg,rgba(212,165,116,0.10),rgba(38,38,38,0.92))] p-3 sm:p-4">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="accent">Beta</Badge>
              <p className="text-sm font-semibold text-text-primary">Scan a printed stat block with your camera</p>
            </div>
            <p className="max-w-2xl text-sm leading-relaxed text-text-muted">
              Uses on-device OCR to read a photo and only inserts the text if it looks like a real monster stat block.
              The image is processed transiently in your browser and is never stored by Duskwarden.
            </p>
          </div>
          <Button type="button" variant="secondary" className="w-full md:w-auto" onClick={handleOpen}>
            <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7h4l2-2h6l2 2h4v10a2 2 0 01-2 2H5a2 2 0 01-2-2V7zm9 9a4 4 0 100-8 4 4 0 000 8z" />
            </svg>
            Open Scanner
          </Button>
        </div>
      </div>

      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="sr-only"
        onChange={handleFileSelection('camera')}
      />
      <input
        ref={libraryInputRef}
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={handleFileSelection('library')}
      />

      <Modal isOpen={isOpen} onClose={handleClose} title="Scan Printed Stat Block" size="xl">
        <div className="space-y-5 max-h-[75vh] overflow-y-auto pr-1">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="accent">Beta</Badge>
            <p className="text-sm text-text-muted">
              Best with bright lighting, a flat page, and the stat block filling most of the frame.
            </p>
          </div>

          <div className="rounded-xl border border-border bg-bg-elevated/70 p-3 sm:p-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-sm font-medium text-text-primary">Private by default</p>
                <p className="mt-1 text-sm text-text-muted">
                  The photo stays on your device. Only recognized stat block text can be inserted into the source field.
                </p>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button type="button" variant="primary" onClick={() => triggerInput('camera')} disabled={isProcessing}>
                  Take Photo
                </Button>
                <Button type="button" variant="ghost" onClick={() => triggerInput('library')} disabled={isProcessing}>
                  Choose Image
                </Button>
              </div>
            </div>
          </div>

          {!previewUrl && (
            <div className="rounded-xl border border-dashed border-border bg-bg-elevated/40 px-5 py-10 text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-accent/10 text-accent">
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7h4l2-2h6l2 2h4v10a2 2 0 01-2 2H5a2 2 0 01-2-2V7zm9 9a4 4 0 100-8 4 4 0 000 8z" />
                </svg>
              </div>
              <p className="text-sm font-medium text-text-primary">Snap a single monster stat block</p>
              <p className="mt-2 text-sm text-text-muted">
                The beta scanner rejects images that do not look like a legitimate stat block, so nothing gets pasted accidentally.
              </p>
            </div>
          )}

          {previewUrl && (
            <div className="grid gap-4 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
              <div className="space-y-3 rounded-xl border border-border bg-bg-elevated/50 p-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-text-primary">Selected image</p>
                    <p className="text-xs text-text-muted">{selectedFileName || 'Captured image'}</p>
                  </div>
                  <Button type="button" variant="ghost" size="sm" onClick={() => triggerInput('camera')} disabled={isProcessing}>
                    Retake
                  </Button>
                </div>
                <div className="relative h-96 overflow-hidden rounded-lg border border-border bg-bg-base">
                  <NextImage
                    src={previewUrl}
                    alt="Selected stat block preview"
                    fill
                    unoptimized
                    className="object-contain"
                  />
                </div>
              </div>

              <div className="space-y-3 rounded-xl border border-border bg-bg-elevated/60 p-3 sm:space-y-4 sm:p-4">
                {scanStage === 'processing' && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <Spinner size="md" />
                      <div>
                        <p className="text-sm font-medium text-text-primary">Reading the stat block on-device</p>
                        <p className="text-sm text-text-muted">This stays in your browser and is discarded if you cancel.</p>
                      </div>
                    </div>
                    <div>
                      <div className="h-2 overflow-hidden rounded-full bg-bg-base">
                        <div
                          className="h-full rounded-full bg-accent transition-all duration-300"
                          style={{ width: formatProgress(scanProgress) }}
                        />
                      </div>
                      <p className="mt-2 text-xs text-text-muted">{formatProgress(scanProgress)} complete</p>
                    </div>
                  </div>
                )}

                {scanStage === 'valid' && result && scanSummary && (
                  <div className="space-y-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="success">Recognized</Badge>
                      <p className="text-sm text-text-muted">
                        {result.detection
                          ? `${SOURCE_SYSTEM_LABELS[result.detection.system]} detected with ${result.detection.confidence} confidence.`
                          : 'The scan looks like a usable monster stat block.'}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                      <div className="rounded-lg border border-border bg-bg-base/70 px-2.5 py-1.5 sm:px-3 sm:py-2">
                        <p className="text-xs uppercase tracking-wide text-text-muted">Name</p>
                        <p className="mt-1 text-sm font-medium text-text-primary">{scanSummary.name ?? 'Unknown'}</p>
                      </div>
                      <div className="rounded-lg border border-border bg-bg-base/70 px-2.5 py-1.5 sm:px-3 sm:py-2">
                        <p className="text-xs uppercase tracking-wide text-text-muted">AC</p>
                        <p className="mt-1 text-sm font-medium text-text-primary">{scanSummary.ac ?? '—'}</p>
                      </div>
                      <div className="rounded-lg border border-border bg-bg-base/70 px-2.5 py-1.5 sm:px-3 sm:py-2">
                        <p className="text-xs uppercase tracking-wide text-text-muted">HP</p>
                        <p className="mt-1 text-sm font-medium text-text-primary">{scanSummary.hp ?? '—'}</p>
                      </div>
                      <div className="rounded-lg border border-border bg-bg-base/70 px-2.5 py-1.5 sm:px-3 sm:py-2">
                        <p className="text-xs uppercase tracking-wide text-text-muted">Attacks</p>
                        <p className="mt-1 text-sm font-medium text-text-primary">{scanSummary.attacks?.length ?? 0}</p>
                      </div>
                    </div>

                    <div>
                      <p className="text-sm font-medium text-text-primary">Extracted text preview</p>
                      <pre className="mt-2 max-h-72 overflow-auto rounded-lg border border-border bg-bg-base/70 p-2.5 text-xs leading-relaxed whitespace-pre-wrap text-text-muted sm:p-3">
                        {previewText}
                        {result.normalizedText.length > PREVIEW_TEXT_LIMIT ? '\n\n…' : ''}
                      </pre>
                    </div>

                    <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                      <Button type="button" variant="ghost" onClick={() => triggerInput('camera')}>
                        Scan Another Photo
                      </Button>
                      <Button type="button" variant="primary" onClick={handleAccept}>
                        {hasExistingText ? 'Replace Source Text' : 'Insert Into Source Field'}
                      </Button>
                    </div>
                  </div>
                )}

                {scanStage === 'invalid' && result && (
                  <div className="space-y-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="error">Not recognized</Badge>
                      <p className="text-sm text-text-muted">
                        This image did not pass the monster stat block checks, so nothing can be inserted.
                      </p>
                    </div>

                    <div className="rounded-xl border border-error/30 bg-error/5 p-3 sm:p-4">
                      <p className="text-sm font-medium text-text-primary">Why it was rejected</p>
                      <ul className="mt-2 space-y-2 text-sm text-text-muted">
                        {result.reasons.map((reason) => (
                          <li key={reason}>{reason}</li>
                        ))}
                      </ul>
                    </div>

                    <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                      <Button type="button" variant="ghost" onClick={handleClose}>
                        Discard Scan
                      </Button>
                      <Button type="button" variant="primary" onClick={() => triggerInput('camera')}>
                        Try Another Photo
                      </Button>
                    </div>
                  </div>
                )}

                {scanStage === 'error' && (
                  <div className="space-y-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="error">Scan failed</Badge>
                      <p className="text-sm text-text-muted">The beta scanner hit a browser or OCR problem.</p>
                    </div>
                    <div className="rounded-xl border border-error/30 bg-error/5 p-3 text-sm text-text-muted sm:p-4">
                      {errorMessage}
                    </div>
                    <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                      <Button type="button" variant="ghost" onClick={handleClose}>
                        Cancel
                      </Button>
                      <Button type="button" variant="primary" onClick={() => triggerInput('camera')}>
                        Try Again
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </Modal>
    </>
  );
}
