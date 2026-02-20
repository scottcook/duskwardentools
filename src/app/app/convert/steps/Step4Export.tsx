'use client';

import { useState } from 'react';
import { Button, Textarea } from '@/components/ui';
import { CreatureCard } from '@/components/features/CreatureCard';
import { SYSTEM_PACKS } from '@/lib/systemPacks';
import type { OutputCreatureData } from '@/types';

interface Step4ExportProps {
  outputData: OutputCreatureData;
  title: string;
  onStartNew: () => void;
  onGoToLibrary: () => void;
}

function buildAttributionTemplate(outputData: OutputCreatureData): string {
  const prov = outputData.provenance;
  const lines = [
    '[Your Product Name] uses content converted via Duskwarden Tools.',
    '',
    'Duskwarden Tools is an independent production and is not affiliated with The Arcane Library, LLC.',
  ];
  if (prov?.licenseType === 'CC-BY-4.0' && prov.attributionText) {
    lines.push('', 'Data attribution:', prov.attributionText);
  }
  if (outputData.outputPackId === 'shadowdark_private_verify') {
    lines.push('', 'If your product uses Shadowdark RPG content, you must include appropriate attribution per the Shadowdark RPG Third-Party License.');
  }
  return lines.join('\n');
}

export function Step4Export({
  outputData,
  title,
  onStartNew,
  onGoToLibrary,
}: Step4ExportProps) {
  const [copied, setCopied] = useState<string | null>(null);
  const [attribution, setAttribution] = useState(() => buildAttributionTemplate(outputData));

  const pack = outputData.outputPackId ? SYSTEM_PACKS[outputData.outputPackId] : null;

  const formatAsText = (): string => {
    const lines = [
      outputData.name.toUpperCase(),
      `AC ${outputData.ac} | HP ${outputData.hp} | Move ${outputData.movement}`,
      ...(outputData.showMorale ? [`Morale ${outputData.morale} | Threat Tier ${outputData.threatTier}`] : [`Threat Tier ${outputData.threatTier}`]),
      '',
      'ATTACKS:',
      ...outputData.attacks.map((a) => {
        let line = `• ${a.name}`;
        if (a.bonus !== undefined) line += ` +${a.bonus}`;
        if (a.damage) line += ` (${a.damage})`;
        return line;
      }),
    ];

    if (outputData.saves) {
      lines.push('', `SAVES: ${outputData.saves}`);
    }

    if (outputData.traits.length > 0) {
      lines.push('', 'TRAITS:', ...outputData.traits.map((t) => `• ${t}`));
    }

    if (outputData.specialActions.length > 0) {
      lines.push('', 'SPECIAL ACTIONS:');
      outputData.specialActions.forEach((a) => {
        let line = `• ${a.name}`;
        if (a.recharge) line += ` (${a.recharge})`;
        lines.push(line);
        if (a.description) lines.push(`  ${a.description}`);
      });
    }

    if (outputData.lootNotes) {
      lines.push('', `LOOT: ${outputData.lootNotes}`);
    }

    return lines.join('\n');
  };

  const copyToClipboard = async (text: string, type: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(type);
    setTimeout(() => setCopied(null), 2000);
  };

  const downloadJson = () => {
    const exportPayload = {
      ...outputData,
      _provenance: outputData.provenance ?? {
        packId: outputData.outputPackId ?? 'osr_generic',
        disclaimer: 'Duskwarden Tools is an independent production.',
        generatedAt: new Date().toISOString(),
      },
      _meta: {
        conversionProfileId: outputData.tuning?.profileId,
        tier: outputData.threatTier,
        role: outputData.tuning?.role,
        tuning: outputData.tuning,
      },
    };
    const json = JSON.stringify(exportPayload, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${outputData.name.toLowerCase().replace(/\s+/g, '-')}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    window.print();
  };

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
            Output System: <span className="text-text-secondary font-medium">{pack.displayName}</span>
            {pack.license.type === 'CC-BY-4.0' && (
              <span className="ml-2 px-1.5 py-0.5 rounded border border-success/40 bg-success/10 text-success text-xs">CC BY 4.0</span>
            )}
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-4 print:hidden">
          <h3 className="font-semibold text-text-primary">Export Options</h3>
          
          <div className="space-y-2">
            <Button
              variant="secondary"
              className="w-full justify-start"
              onClick={() => copyToClipboard(formatAsText(), 'text')}
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
              </svg>
              {copied === 'text' ? 'Copied!' : 'Copy as Text'}
            </Button>

            <Button
              variant="secondary"
              className="w-full justify-start"
              onClick={() => copyToClipboard(JSON.stringify(outputData, null, 2), 'json')}
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
              </svg>
              {copied === 'json' ? 'Copied!' : 'Copy JSON'}
            </Button>

            <Button
              variant="secondary"
              className="w-full justify-start"
              onClick={downloadJson}
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Download JSON
            </Button>

            <Button
              variant="secondary"
              className="w-full justify-start"
              onClick={handlePrint}
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              Print Card
            </Button>
          </div>

          {/* Attribution Template — Elevated callout */}
          <div className="pt-4">
            <div className="rounded-lg border border-accent/30 bg-accent/5 p-4 space-y-3">
              <div className="flex items-start gap-3">
                <div className="shrink-0 w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center">
                  <svg className="w-4 h-4 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-text-primary mb-1">Attribution Template</h3>
                  <p className="text-xs text-text-muted leading-relaxed">
                    If you&apos;re publishing content that includes converted creatures (in a game supplement, blog post, or product), 
                    proper attribution builds trust with your audience and respects the original content creators.
                    Copy and customize this template:
                  </p>
                </div>
              </div>
              <Textarea
                value={attribution}
                onChange={(e) => setAttribution(e.target.value)}
                rows={4}
                className="text-sm bg-bg-base"
              />
              <div className="flex items-center justify-between">
                <p className="text-xs text-text-muted">
                  Edit as needed for your project.
                </p>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => copyToClipboard(attribution, 'attribution')}
                >
                  {copied === 'attribution' ? '✓ Copied!' : 'Copy Attribution'}
                </Button>
              </div>
            </div>
          </div>
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
