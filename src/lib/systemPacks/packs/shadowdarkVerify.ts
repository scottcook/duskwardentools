/**
 * Shadowdark Private Verify Pack
 *
 * LEGAL NOTE: This pack ships ZERO Shadowdark proprietary content.
 * - It applies Shadowdark-tuned conversion parameters (lean HP, no morale,
 *   compact format) derived from publicly observable design patterns.
 * - Accurate output requires the user to paste the official stat block text
 *   from their own copy of the Shadowdark rules/quickstart.
 * - The reference text is stored privately (per-user) and never transmitted.
 *
 * Branding: output is labelled "for use with Shadowdark RPG" only.
 * Never implies official affiliation.
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

export const shadowdarkVerifyPack: SystemPack = {
  id: 'shadowdark_private_verify',
  displayName: 'For use with Shadowdark RPG (verify)',
  description:
    'Produces a compatibility stat card tuned for Shadowdark RPG. Paste your own reference stat block to verify and tune accuracy. No Shadowdark content is embedded in this tool.',
  license: {
    type: 'UserProvided',
  },
  canAutoFindStatblocks: false,
  requiresUserReference: true,

  parseSourceStatblock(inputText: string, systemHint?: SourceSystem): ParsedCreatureData {
    return parseStatBlock(inputText, systemHint).data;
  },

  convertToTarget(parsed: ParsedCreatureData, options: ConvertOptions): ConvertedStat {
    const provenance = buildProvenance(
      'shadowdark_private_verify',
      this.displayName,
      'UserProvided'
    );
    const settings: ConversionSettings = {
      deadliness: options.deadliness,
      durability: options.durability,
      targetLevel: options.targetLevel,
      targetTier: options.targetTier as ThreatTier | undefined,
      role: options.role as CreatureRole | undefined,
      outputProfile: 'shadowdark_compatible',
      outputPackId: 'shadowdark_private_verify',
      conversionProfileId: 'shadowdark_compatible_v1',
    };
    const converted = convertCreature(parsed, settings);

    // Override provenance disclaimer for Shadowdark mode
    return {
      ...converted,
      outputPackId: 'shadowdark_private_verify',
      provenance: {
        ...provenance,
        disclaimer:
          'Compatibility profile for use with Shadowdark RPG. ' +
          'Duskwarden Tools is an independent production and is not affiliated with The Arcane Library, LLC. ' +
          'This output does not reproduce Shadowdark RPG rules text.',
      },
    };
  },

  validate(converted: ConvertedStat, reference?: ReferenceStatblock): ValidationReport {
    const report = generateValidationReport(converted, reference);

    if (!report.hasReference) {
      return {
        ...report,
        summary:
          'Paste the official Shadowdark stat block text you own into the Reference field to verify accuracy. ' +
          'Your reference text stays private and is never transmitted.',
      };
    }

    return report;
  },
};
