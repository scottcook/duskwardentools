'use client';

import { useState } from 'react';
import type { BandValidationReport, BandResult } from '@/lib/conversion/bandValidation';
import type { ConversionTuning, ConversionSettings } from '@/types';

interface BandValidationPanelProps {
  report: BandValidationReport;
  tuning?: ConversionTuning;
  settings?: ConversionSettings;
  onSettingsChange?: (settings: ConversionSettings) => void;
}

function statusColor(status: BandResult['status']): string {
  if (status === 'pass') return 'text-success';
  if (status === 'high') return 'text-amber-400';
  return 'text-amber-500';
}

function statusIcon(status: BandResult['status']): string {
  if (status === 'pass') return '✓';
  if (status === 'high') return '↑';
  return '↓';
}

function ScoreBar({ score }: { score: number }) {
  const color =
    score === 100 ? 'bg-success' :
    score >= 75   ? 'bg-amber-400' :
    'bg-amber-500';
  const textColor =
    score === 100 ? 'text-success' :
    score >= 75   ? 'text-amber-400' :
    'text-amber-500';
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-2 bg-bg-base rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${color}`}
          style={{ width: `${score}%` }}
          role="progressbar"
          aria-valuenow={score}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`Balance score: ${score}%`}
        />
      </div>
      <span className={`text-sm font-bold tabular-nums ${textColor}`}>{score}%</span>
    </div>
  );
}

function QuickAdjustStepper({
  label,
  value,
  onChange,
  min = 50,
  max = 200,
  step = 10,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
}) {
  const decrease = () => onChange(Math.max(min, value - step));
  const increase = () => onChange(Math.min(max, value + step));

  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-text-muted w-20 shrink-0">{label}</span>
      <button
        type="button"
        onClick={decrease}
        disabled={value <= min}
        className="w-6 h-6 rounded border border-border bg-bg-base text-text-secondary hover:bg-bg-elevated disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center text-sm font-bold focus:outline-none focus-visible:ring-1 focus-visible:ring-accent"
        aria-label={`Decrease ${label}`}
      >
        −
      </button>
      <span className="text-xs font-medium text-text-primary tabular-nums w-10 text-center">
        {value}%
      </span>
      <button
        type="button"
        onClick={increase}
        disabled={value >= max}
        className="w-6 h-6 rounded border border-border bg-bg-base text-text-secondary hover:bg-bg-elevated disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center text-sm font-bold focus:outline-none focus-visible:ring-1 focus-visible:ring-accent"
        aria-label={`Increase ${label}`}
      >
        +
      </button>
    </div>
  );
}

export function BandValidationPanel({ report, tuning, settings, onSettingsChange }: BandValidationPanelProps) {
  const [showMath, setShowMath] = useState(false);

  const hasQuickAdjust = settings && onSettingsChange;

  return (
    <div className="rounded-lg border border-border bg-bg-elevated p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <h3 className="text-sm font-semibold text-text-primary">How This Was Tuned</h3>
          {tuning && (
            <p className="text-xs text-text-muted mt-0.5">
              Tier {tuning.targets.hpTarget > 0 ? '✓' : '?'} &middot;{' '}
              Role: <span className="capitalize">{tuning.role}</span> &middot;{' '}
              Profile: <span>{tuning.provenance.outputSystem}</span>
            </p>
          )}
        </div>

        {/* Balanced badge — amber advisory tone for non-balanced */}
        {report.results.length > 0 && (
          <span
            className={`shrink-0 px-2 py-1 rounded text-xs font-semibold border ${
              report.balanced
                ? 'border-success/40 bg-success/10 text-success'
                : 'border-amber-400/40 bg-amber-400/10 text-amber-500'
            }`}
          >
            {report.balanced ? '✓ Balanced' : 'Review suggested'}
          </span>
        )}
      </div>

      {/* Score bar */}
      {report.results.length > 0 && <ScoreBar score={report.score} />}

      {/* Summary — softer language */}
      <p className="text-xs text-text-muted leading-snug">
        {report.balanced
          ? report.summary
          : report.summary.replace('Needs adjustment', 'You may want to tweak')}
      </p>

      {/* Quick-adjust controls if not balanced */}
      {hasQuickAdjust && !report.balanced && (
        <div className="rounded-lg border border-amber-400/30 bg-amber-400/5 p-3 space-y-3">
          <p className="text-xs font-medium text-amber-500">Quick adjustments:</p>
          <div className="flex flex-wrap gap-4">
            <QuickAdjustStepper
              label="Durability"
              value={Math.round(settings.durability * 100)}
              onChange={(v) => onSettingsChange({ ...settings, durability: v / 100 })}
            />
            <QuickAdjustStepper
              label="Deadliness"
              value={Math.round(settings.deadliness * 100)}
              onChange={(v) => onSettingsChange({ ...settings, deadliness: v / 100 })}
            />
          </div>
          <p className="text-xs text-text-muted">
            Adjust HP via Durability, or damage via Deadliness. Values update the preview and re-validate instantly.
          </p>
        </div>
      )}

      {/* Per-field results */}
      {report.results.length > 0 && (
        <div className="space-y-1">
          {report.results.map((r) => (
            <div
              key={r.field}
              className="flex items-start gap-2 text-xs py-1 border-b border-border/30 last:border-0"
            >
              <span className={`w-4 text-center font-bold shrink-0 pt-0.5 ${statusColor(r.status)}`}>
                {statusIcon(r.status)}
              </span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-text-muted w-24 shrink-0">{r.field}</span>
                  <span className="text-text-secondary tabular-nums">
                    {r.value} <span className="text-text-muted">/ target {r.target}</span>
                    <span className={`ml-1 ${statusColor(r.status)}`}>({r.delta})</span>
                  </span>
                </div>
                {r.suggestion && (
                  <p className="text-text-muted mt-0.5 italic">{r.suggestion}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* "Show math" accordion */}
      {tuning && (
        <div className="border-t border-border/30 pt-3">
          <button
            type="button"
            onClick={() => setShowMath(v => !v)}
            className="text-xs text-accent hover:text-accent-hover focus:outline-none focus-visible:ring-1 focus-visible:ring-accent flex items-center gap-1"
            aria-expanded={showMath}
            aria-controls="band-math-panel"
          >
            <svg
              className={`w-3 h-3 transition-transform ${showMath ? 'rotate-90' : ''}`}
              fill="none" stroke="currentColor" viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            {showMath ? 'Hide math' : 'Show math'}
          </button>

          {showMath && (
            <div
              id="band-math-panel"
              className="mt-3 space-y-2 text-xs text-text-muted"
            >
              <p className="font-semibold text-text-secondary">Target bands used:</p>
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="text-text-muted">
                    <th className="pr-3 pb-1">Stat</th>
                    <th className="pr-3 pb-1">Target</th>
                    <th className="pr-3 pb-1">Final</th>
                    <th className="pb-1">Multiplier</th>
                  </tr>
                </thead>
                <tbody className="text-text-secondary">
                  <tr>
                    <td className="pr-3 py-0.5">HP</td>
                    <td className="pr-3">{tuning.targets.hpTarget}</td>
                    <td className="pr-3">{report.results.find(r => r.field === 'HP')?.value ?? '—'}</td>
                    <td>×{tuning.hpMultiplier.toFixed(2)} (Durability)</td>
                  </tr>
                  <tr>
                    <td className="pr-3 py-0.5">AC</td>
                    <td className="pr-3">{tuning.targets.acTarget}</td>
                    <td className="pr-3">{report.results.find(r => r.field === 'AC')?.value ?? '—'}</td>
                    <td>blended w/ source</td>
                  </tr>
                  <tr>
                    <td className="pr-3 py-0.5">Attack Bonus</td>
                    <td className="pr-3">+{tuning.targets.attackBonusTarget}</td>
                    <td className="pr-3">+{report.results.find(r => r.field === 'Attack Bonus')?.value ?? '—'}</td>
                    <td>profile curve</td>
                  </tr>
                  <tr>
                    <td className="pr-3 py-0.5">DPR</td>
                    <td className="pr-3">{tuning.targets.dprTarget}</td>
                    <td className="pr-3">{report.results.find(r => r.field === 'DPR')?.value ?? '—'}</td>
                    <td>×{tuning.damageMultiplier.toFixed(2)} (Deadliness)</td>
                  </tr>
                  {tuning.targets.moraleTarget && (
                    <tr>
                      <td className="pr-3 py-0.5">Morale</td>
                      <td className="pr-3">{tuning.targets.moraleTarget}</td>
                      <td className="pr-3">{tuning.targets.moraleTarget}</td>
                      <td>profile default</td>
                    </tr>
                  )}
                </tbody>
              </table>

              <p className="pt-1 border-t border-border/30">
                Profile: <span className="text-text-secondary">{tuning.provenance.outputSystem} v{tuning.provenance.version}</span>.{' '}
                These are Duskwarden&apos;s own balance targets — not official bestiary values.
              </p>
            </div>
          )}
        </div>
      )}

      <p className="text-xs text-text-muted border-t border-border/30 pt-3 leading-snug">
        &ldquo;Balanced&rdquo; means within Duskwarden&apos;s target bands for this profile.
        It does not mean this matches any official published stat block.
      </p>
    </div>
  );
}
