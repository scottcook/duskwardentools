/**
 * OSR Generic System Pack
 *
 * Heuristics-based conversion targeting B/X / OSE-style stat cards.
 * Fully deterministic — no embedded proprietary data.
 * License: Internal (open heuristics, no attribution required).
 */

import { parseStatBlock } from '@/lib/parser';
import type { ParsedCreatureData } from '@/types';
import type {
  SystemPack,
  ConvertOptions,
  ConvertedStat,
  ReferenceStatblock,
  ValidationReport,
} from '../types';
import { buildConvertedStat, buildProvenance } from '../conversionUtils';
import { generateValidationReport } from '../validateUtils';

export const osrGenericPack: SystemPack = {
  id: 'osr_generic',
  displayName: 'OSR Generic',
  description: 'Heuristic conversion targeting B/X / OSE-style stat cards. No embedded proprietary data.',
  license: {
    type: 'Internal',
  },
  canAutoFindStatblocks: false,
  requiresUserReference: false,

  parseSourceStatblock(inputText: string): ParsedCreatureData {
    return parseStatBlock(inputText).data;
  },

  convertToTarget(parsed: ParsedCreatureData, options: ConvertOptions): ConvertedStat {
    const provenance = buildProvenance(
      'osr_generic',
      this.displayName,
      'Internal'
    );
    return buildConvertedStat(
      parsed, options,
      /* hpMultiplier */  0.85,
      /* dmgMultiplier */ 0.9,
      /* showMorale */    true,
      /* showReaction */  true,
      'osr_generic',
      provenance
    );
  },

  validate(converted: ConvertedStat, reference?: ReferenceStatblock): ValidationReport {
    return generateValidationReport(converted, reference);
  },
};
