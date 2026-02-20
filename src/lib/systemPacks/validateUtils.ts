/**
 * Field-level diff/validation utilities shared across all packs.
 */

import type {
  ConvertedStat,
  ReferenceStatblock,
  ValidationReport,
  FieldDiff,
  FieldMatchStatus,
} from './types';
import { parseStatBlock } from '@/lib/parser';

/** Parse reference raw text into a Partial<ConvertedStat> */
export function parseReference(rawText: string): Partial<ConvertedStat> {
  const result = parseStatBlock(rawText);
  const p = result.data;
  return {
    name: p.name,
    ac: p.ac,
    hp: p.hp,
    movement: p.movement,
    attacks: p.attacks,
    saves: p.saves ?? undefined,
  };
}

type NumericKey = 'ac' | 'hp' | 'morale' | 'threatTier';
type StringKey  = 'name' | 'movement' | 'saves';

const NUMERIC_FIELDS: NumericKey[] = ['ac', 'hp', 'morale', 'threatTier'];
const STRING_FIELDS:  StringKey[]  = ['name', 'movement', 'saves'];

/** Tolerance band for numeric fields (fraction of reference value) */
const NUMERIC_TOLERANCE = 0.15;

function compareNumeric(converted: number, reference: number): FieldMatchStatus {
  if (reference === 0) return converted === 0 ? 'match' : 'mismatch';
  const delta = Math.abs(converted - reference) / Math.abs(reference);
  return delta <= NUMERIC_TOLERANCE ? 'match' : 'mismatch';
}

function compareString(converted: string, reference: string): FieldMatchStatus {
  return converted.trim().toLowerCase() === reference.trim().toLowerCase() ? 'match' : 'mismatch';
}

export function generateValidationReport(
  converted: ConvertedStat,
  reference?: ReferenceStatblock
): ValidationReport {
  if (!reference) {
    return {
      accuracyScore: 0,
      diffs: [],
      summary: 'No reference provided. Paste the target stat block to verify accuracy.',
      hasReference: false,
    };
  }

  // Parse reference text if parsed fields are empty
  if (!reference.parsed || Object.keys(reference.parsed).length === 0) {
    reference = { ...reference, parsed: parseReference(reference.rawText) };
  }

  const ref = reference.parsed;
  const diffs: FieldDiff[] = [];

  // Numeric fields
  for (const field of NUMERIC_FIELDS) {
    const conv = converted[field] as number | undefined;
    const refVal = ref[field] as number | undefined;
    if (refVal === undefined) continue;
    if (conv === undefined) {
      diffs.push({ field, status: 'missing', converted: conv, reference: refVal, suggested: refVal });
    } else {
      const status = compareNumeric(conv, refVal);
      diffs.push({ field, status, converted: conv, reference: refVal, suggested: status === 'mismatch' ? refVal : undefined });
    }
  }

  // String fields
  for (const field of STRING_FIELDS) {
    const conv = converted[field] as string | undefined;
    const refVal = ref[field] as string | undefined;
    if (!refVal) continue;
    if (!conv) {
      diffs.push({ field, status: 'missing', converted: conv, reference: refVal, suggested: refVal });
    } else {
      const status = compareString(conv, refVal);
      diffs.push({ field, status, converted: conv, reference: refVal, suggested: status === 'mismatch' ? refVal : undefined });
    }
  }

  // Attack count check
  const convAttackCount = converted.attacks.length;
  const refAttackCount  = (ref.attacks ?? []).length;
  if (refAttackCount > 0) {
    diffs.push({
      field: 'attacks (count)',
      status: convAttackCount === refAttackCount ? 'match' : 'mismatch',
      converted: convAttackCount,
      reference: refAttackCount,
    });
  }

  const matched = diffs.filter(d => d.status === 'match').length;
  const total   = diffs.length;
  const accuracyScore = total > 0 ? Math.round((matched / total) * 100) : 100;

  const mismatches = diffs.filter(d => d.status === 'mismatch' || d.status === 'missing');
  const summary =
    mismatches.length === 0
      ? `All checked fields match the reference. Accuracy: ${accuracyScore}%.`
      : `${mismatches.length} field(s) differ from reference: ${mismatches.map(d => d.field).join(', ')}. Accuracy: ${accuracyScore}%.`;

  return { accuracyScore, diffs, summary, hasReference: true };
}
