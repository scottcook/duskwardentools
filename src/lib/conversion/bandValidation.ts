/**
 * Band Validation
 *
 * Validates a converted stat card against the profile's target bands
 * (our own design targets, NOT official bestiary entries).
 *
 * "Accurate" here means "within our Shadowdark-ready bands",
 * which is Option 1: balanced for the system's feel, not canonical matching.
 */

import type { ConversionTuning } from '@/types';
import type { ConversionProfile } from './profiles/types';

export type BandStatus = 'pass' | 'high' | 'low';

export interface BandResult {
  field: 'AC' | 'HP' | 'Attack Bonus' | 'DPR';
  value: number;
  target: number;
  status: BandStatus;
  /** Human-readable delta e.g. "+3" or "-2" */
  delta: string;
  suggestion?: string;
}

export interface BandValidationReport {
  /** 0–100: fraction of fields within tolerance */
  score: number;
  balanced: boolean;
  results: BandResult[];
  /** Short overall summary for the UI */
  summary: string;
}

function calcDPR(attacks: Array<{ bonus?: number; damage?: string }>): number {
  if (!attacks.length) return 0;
  // Average DPR = sum of per-attack avg damage (first attack only if complex)
  const primary = attacks[0];
  if (!primary.damage) return 0;
  const match = primary.damage.match(/(\d+)d(\d+)(?:\s*([+-])\s*(\d+))?/);
  if (!match) return 0;
  const numDice  = parseInt(match[1], 10);
  const dieSize  = parseInt(match[2], 10);
  const sign     = match[3] === '-' ? -1 : 1;
  const modifier = match[4] ? parseInt(match[4], 10) * sign : 0;
  return numDice * ((dieSize + 1) / 2) + modifier;
}

export function validateBands(
  stat: {
    ac: number;
    hp: number;
    attacks: Array<{ bonus?: number; damage?: string }>;
    tuning?: ConversionTuning;
  },
  profile: ConversionProfile
): BandValidationReport {
  const { tolerance } = profile;
  const targets = stat.tuning?.targets;

  if (!targets) {
    return {
      score: 0,
      balanced: false,
      results: [],
      summary: 'No tuning data — re-convert to generate a validation report.',
    };
  }

  const attackBonus = stat.attacks[0]?.bonus ?? 0;
  const dpr = calcDPR(stat.attacks);

  const checks: BandResult[] = [];

  // AC
  const acDelta = stat.ac - targets.acTarget;
  const acStatus: BandStatus =
    Math.abs(acDelta) <= tolerance.ac ? 'pass'
    : acDelta > 0 ? 'high' : 'low';
  checks.push({
    field: 'AC',
    value: stat.ac,
    target: targets.acTarget,
    status: acStatus,
    delta: (acDelta >= 0 ? '+' : '') + acDelta,
    suggestion: acStatus === 'high'
      ? 'Reduce source AC or lower the tier.'
      : acStatus === 'low'
        ? 'Increase source AC or raise the tier.'
        : undefined,
  });

  // HP
  const hpFraction = targets.hpTarget > 0 ? (stat.hp - targets.hpTarget) / targets.hpTarget : 0;
  const hpStatus: BandStatus =
    Math.abs(hpFraction) <= tolerance.hp ? 'pass'
    : hpFraction > 0 ? 'high' : 'low';
  const hpDelta = stat.hp - targets.hpTarget;
  checks.push({
    field: 'HP',
    value: stat.hp,
    target: targets.hpTarget,
    status: hpStatus,
    delta: (hpDelta >= 0 ? '+' : '') + hpDelta,
    suggestion: hpStatus === 'high'
      ? 'Lower the Durability slider or reduce the tier.'
      : hpStatus === 'low'
        ? 'Raise the Durability slider or increase the tier.'
        : undefined,
  });

  // Attack Bonus
  const abDelta = attackBonus - targets.attackBonusTarget;
  const abStatus: BandStatus =
    Math.abs(abDelta) <= tolerance.attackBonus ? 'pass'
    : abDelta > 0 ? 'high' : 'low';
  checks.push({
    field: 'Attack Bonus',
    value: attackBonus,
    target: targets.attackBonusTarget,
    status: abStatus,
    delta: (abDelta >= 0 ? '+' : '') + abDelta,
    suggestion: abStatus === 'low'
      ? 'Source attack bonus may be unusually low. Try changing role to Skirmisher.'
      : undefined,
  });

  // DPR
  const dprFraction = targets.dprTarget > 0 ? (dpr - targets.dprTarget) / targets.dprTarget : 0;
  const dprStatus: BandStatus =
    Math.abs(dprFraction) <= tolerance.dpr ? 'pass'
    : dprFraction > 0 ? 'high' : 'low';
  const dprDelta = Math.round((dpr - targets.dprTarget) * 10) / 10;
  checks.push({
    field: 'DPR',
    value: Math.round(dpr * 10) / 10,
    target: targets.dprTarget,
    status: dprStatus,
    delta: (dprDelta >= 0 ? '+' : '') + dprDelta,
    suggestion: dprStatus === 'high'
      ? 'Lower the Deadliness slider.'
      : dprStatus === 'low'
        ? 'Raise the Deadliness slider or switch role to Brute.'
        : undefined,
  });

  const passed   = checks.filter(c => c.status === 'pass').length;
  const score    = Math.round((passed / checks.length) * 100);
  const balanced = score === 100;

  const outOfBand = checks.filter(c => c.status !== 'pass');
  const summary = balanced
    ? 'All stats within target bands. ✓ Balanced.'
    : `${outOfBand.length} stat${outOfBand.length > 1 ? 's' : ''} outside target bands: ${outOfBand.map(c => c.field).join(', ')}.`;

  return { score, balanced, results: checks, summary };
}

/** Exported for use in the UI — compute DPR from attack list */
export { calcDPR };
