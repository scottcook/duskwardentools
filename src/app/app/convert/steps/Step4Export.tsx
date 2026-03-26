'use client';

import { Button } from '@/components/ui';
import { CreatureCard } from '@/components/features/CreatureCard';
import { ExportActions } from '@/components/features/ExportActions';
import { SYSTEM_PACKS } from '@/lib/systemPacks';
import type { OutputCreatureData } from '@/types';

interface Step4ExportProps {
  outputData: OutputCreatureData;
  title: string;
  onStartNew: () => void;
  onGoToLibrary: () => void;
}

export function Step4Export({
  outputData,
  title,
  onStartNew,
  onGoToLibrary,
}: Step4ExportProps) {
  const pack = outputData.outputPackId ? SYSTEM_PACKS[outputData.outputPackId] : null;

  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="w-12 h-12 mx-auto mb-4 bg-success/10 rounded-full flex items-center justify-center">
          <svg className="w-6 h-6 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-lg font-semibold text-text-primary mb-2">Saved Successfully!</h2>
        <p className="text-sm text-text-muted">
          Your creature has been saved to your library. Export it below.
        </p>
        {pack && (
          <p className="mt-2 text-xs text-text-muted">
            Attribution Pack: <span className="text-text-secondary font-medium">{pack.displayName}</span>
            {pack.license.type === 'CC-BY-4.0' && (
              <span className="ml-2 px-1.5 py-0.5 rounded border border-success/40 bg-success/10 text-success text-xs">CC BY 4.0</span>
            )}
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-4 print:hidden">
          <h3 className="font-semibold text-text-primary">Export Options</h3>
          <ExportActions outputData={outputData} location="post_convert" />
        </div>

        <div>
          <h3 className="font-semibold text-text-primary mb-4 print:hidden">Preview</h3>
          <div className="print-only mb-4">
            <h2 className="text-xl font-bold">{title || outputData.name}</h2>
          </div>
          <CreatureCard data={outputData} showPrintStyles />
        </div>
      </div>

      <div className="flex justify-center gap-4 pt-4 print:hidden">
        <Button variant="ghost" onClick={onStartNew}>
          Convert Another
        </Button>
        <Button onClick={onGoToLibrary}>
          Go to Library
        </Button>
      </div>
    </div>
  );
}
