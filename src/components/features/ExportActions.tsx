'use client';

import { useState } from 'react';
import { Button } from '@/components/ui';
import { trackEvent } from '@/lib/analytics';
import type { OutputCreatureData } from '@/types';

interface ExportActionsProps {
  outputData: OutputCreatureData;
  /** Where this export panel is rendered (for analytics). */
  location?: string;
}

export function ExportActions({ outputData, location = 'unknown' }: ExportActionsProps) {
  const [copied, setCopied] = useState<string | null>(null);

  const formatAsText = (): string => {
    const lines = [
      outputData.name.toUpperCase(),
      ...(outputData.description ? [outputData.description] : []),
      `AC ${outputData.ac} | HP ${outputData.hp} | Move ${outputData.movement}`,
      ...(outputData.showMorale
        ? [`Morale ${outputData.morale} | Threat Tier ${outputData.threatTier}`]
        : [`Threat Tier ${outputData.threatTier}`]),
      '',
      'ATTACKS:',
      ...outputData.attacks.map((a) => {
        let line = '• ';
        if (a.count && a.count > 1) line += `${a.count}× `;
        line += a.name;
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
    trackEvent('export_action', { action: `copy_${type}`, location });
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
    trackEvent('export_action', { action: 'download_json', location });
  };

  const handlePrint = () => {
    trackEvent('export_action', { action: 'print_card', location });
    window.print();
  };

  return (
    <div className="space-y-2">
      <Button
        variant="secondary"
        className="w-full justify-start"
        onClick={() => copyToClipboard(formatAsText(), 'text')}
      >
        <svg className="w-4 h-4 mr-2 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
        </svg>
        {copied === 'text' ? 'Copied!' : 'Copy as Text'}
      </Button>

      <Button
        variant="secondary"
        className="w-full justify-start"
        onClick={() => copyToClipboard(JSON.stringify(outputData, null, 2), 'json')}
      >
        <svg className="w-4 h-4 mr-2 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
        </svg>
        {copied === 'json' ? 'Copied!' : 'Copy JSON'}
      </Button>

      <Button
        variant="secondary"
        className="w-full justify-start"
        onClick={downloadJson}
      >
        <svg className="w-4 h-4 mr-2 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
        </svg>
        Download JSON
      </Button>

      <Button
        variant="secondary"
        className="w-full justify-start"
        onClick={handlePrint}
      >
        <svg className="w-4 h-4 mr-2 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
        </svg>
        Print Card
      </Button>
    </div>
  );
}
