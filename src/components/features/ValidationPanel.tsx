'use client';

import type { ValidationReport, FieldDiff } from '@/lib/systemPacks/types';

interface ValidationPanelProps {
  report: ValidationReport;
  onApplyField?: (diff: FieldDiff) => void;
  onApplyAll?: () => void;
}

function statusColor(status: FieldDiff['status']): string {
  switch (status) {
    case 'match':    return 'text-success';
    case 'mismatch': return 'text-error';
    case 'missing':  return 'text-yellow-400';
    case 'extra':    return 'text-text-muted';
  }
}

function statusIcon(status: FieldDiff['status']): string {
  switch (status) {
    case 'match':    return '✓';
    case 'mismatch': return '≠';
    case 'missing':  return '?';
    case 'extra':    return '+';
  }
}

function statusLabel(status: FieldDiff['status']): string {
  switch (status) {
    case 'match':    return 'Match';
    case 'mismatch': return 'Mismatch';
    case 'missing':  return 'Missing';
    case 'extra':    return 'Extra';
  }
}

function AccuracyBar({ score }: { score: number }) {
  const color =
    score >= 80 ? 'bg-success' :
    score >= 50 ? 'bg-yellow-400' :
    'bg-error';

  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-2 bg-bg-elevated rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${color}`}
          style={{ width: `${score}%` }}
          role="progressbar"
          aria-valuenow={score}
          aria-valuemin={0}
          aria-valuemax={100}
        />
      </div>
      <span className={`text-sm font-bold tabular-nums ${color}`}>{score}%</span>
    </div>
  );
}

export function ValidationPanel({ report, onApplyField, onApplyAll }: ValidationPanelProps) {
  const hasMismatches = report.diffs.some(d => d.status !== 'match');

  return (
    <div className="rounded-lg border border-border bg-bg-elevated p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-text-primary">
          {report.hasReference ? 'Validation Report' : 'Reference Required'}
        </h3>
        {report.hasReference && (
          <span className="text-xs text-text-muted">Accuracy</span>
        )}
      </div>

      {/* Accuracy bar */}
      {report.hasReference && (
        <AccuracyBar score={report.accuracyScore} />
      )}

      {/* Summary */}
      <p className="text-xs text-text-muted leading-snug">{report.summary}</p>

      {/* Field diffs */}
      {report.diffs.length > 0 && (
        <div className="space-y-1">
          {report.diffs.map((diff) => (
            <div
              key={diff.field}
              className="flex items-center gap-2 text-xs py-1 border-b border-border/30 last:border-0"
            >
              <span
                className={`w-4 text-center font-bold ${statusColor(diff.status)}`}
                title={statusLabel(diff.status)}
                aria-label={statusLabel(diff.status)}
              >
                {statusIcon(diff.status)}
              </span>
              <span className="w-28 text-text-muted capitalize shrink-0">{diff.field}</span>
              <span className="text-text-secondary">{String(diff.converted ?? '—')}</span>
              {diff.status !== 'match' && diff.reference !== undefined && (
                <>
                  <span className="text-text-muted">→</span>
                  <span className={statusColor(diff.status)}>{String(diff.reference)}</span>
                  {diff.suggested !== undefined && onApplyField && (
                    <button
                      type="button"
                      onClick={() => onApplyField(diff)}
                      className="ml-auto text-accent hover:text-accent-hover text-xs underline underline-offset-2 focus:outline-none focus-visible:ring-1 focus-visible:ring-accent"
                    >
                      Apply
                    </button>
                  )}
                </>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Apply all */}
      {hasMismatches && onApplyAll && report.hasReference && (
        <button
          type="button"
          onClick={onApplyAll}
          className="w-full py-2 px-3 text-xs font-medium rounded border border-accent/40 text-accent hover:bg-accent/10 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          Apply All Reference Values
        </button>
      )}

      {/* Provenance / legal note */}
      <p className="text-xs text-text-muted border-t border-border/30 pt-3 leading-snug">
        Reference text is stored privately in your browser and is never transmitted.
        Duskwarden Tools is independent and not affiliated with any rulebook publisher.
      </p>
    </div>
  );
}
