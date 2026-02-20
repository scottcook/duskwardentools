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

  parseSourceStatblock(inputText: string): ParsedCreatureData {
    return parseStatBlock(inputText).data;
  },

  convertToTarget(parsed: ParsedCreatureData, options: ConvertOptions): ConvertedStat {
    const provenance = buildProvenance(
      'shadowdark_private_verify',
      this.displayName,
      'UserProvided'
    );
    // Shadowdark-tuned parameters:
    // - Lower HP (lean, fast-play)
    // - Standard damage
    // - No morale (not part of Shadowdark core)
    // - No reaction roll
    const converted = buildConvertedStat(
      parsed, options,
      /* hpMultiplier */  0.75,
      /* dmgMultiplier */ 1.0,
      /* showMorale */    false,
      /* showReaction */  false,
      'shadowdark_private_verify',
      provenance
    );

    // Override provenance disclaimer for Shadowdark mode
    converted.provenance = {
      ...converted.provenance,
      disclaimer:
        'Compatibility profile for use with Shadowdark RPG. ' +
        'Duskwarden Tools is an independent production and is not affiliated with The Arcane Library, LLC. ' +
        'This output does not reproduce Shadowdark RPG rules text.',
    };

    return converted;
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
