/**
 * OSR Generic System Pack
 *
 * Heuristics-based conversion targeting B/X / OSE-style stat cards.
 * Fully deterministic — no embedded proprietary data.
 * License: Internal (open heuristics, no attribution required).
 */

import { parseStatBlock } from '@/lib/parser';
import { convertCreature } from '@/lib/conversion/engine';
import type { ParsedCreatureData, ConversionSettings, CreatureRole, ThreatTier, SourceSystem } from '@/types';
import type {
  SystemPack,
  ConvertOptions,
  ConvertedStat,
  ReferenceStatblock,
  ValidationReport,
} from '../types';
import { buildProvenance } from '../conversionUtils';
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

  parseSourceStatblock(inputText: string, systemHint?: SourceSystem): ParsedCreatureData {
    return parseStatBlock(inputText, systemHint).data;
  },

  convertToTarget(parsed: ParsedCreatureData, options: ConvertOptions): ConvertedStat {
    const provenance = buildProvenance(
      'osr_generic',
      this.displayName,
      'Internal'
    );
    const settings: ConversionSettings = {
      deadliness: options.deadliness,
      durability: options.durability,
      targetLevel: options.targetLevel,
      targetTier: options.targetTier as ThreatTier | undefined,
      role: options.role as CreatureRole | undefined,
      outputProfile: 'osr_generic',
      outputPackId: 'osr_generic',
      conversionProfileId: 'osr_generic_v1',
    };
    const converted = convertCreature(parsed, settings);
    return {
      ...converted,
      outputPackId: 'osr_generic',
      provenance,
    };
  },

  validate(converted: ConvertedStat, reference?: ReferenceStatblock): ValidationReport {
    return generateValidationReport(converted, reference);
  },
};
