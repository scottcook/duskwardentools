/**
 * D&D 5e SRD System Pack
 *
 * Uses the curated SRD 5.1 monster list (CC BY 4.0) for name-based lookup
 * and parsing enrichment.  All embedded data is strictly from the SRD.
 *
 * License: CC-BY-4.0
 * Attribution: required in exports — see data/packs/dnd5e_srd/license.json
 */

import { parseStatBlock } from '@/lib/parser';
import type { ParsedCreatureData, Attack } from '@/types';
import type {
  SystemPack,
  ConvertOptions,
  ConvertedStat,
  ReferenceStatblock,
  ValidationReport,
} from '../types';
import { buildConvertedStat, buildProvenance } from '../conversionUtils';
import { generateValidationReport } from '../validateUtils';

// ─────────────────────────────────────────────────────────────────────────────
// Embedded SRD data (bundled at build time from data/packs/dnd5e_srd/)
// ─────────────────────────────────────────────────────────────────────────────

/** Minimal shape stored in monsters.json */
interface SrdMonster {
  name: string;
  ac: number;
  hp: number;
  cr: string;
  movement?: string;
  attacks?: Attack[];
}

// Next.js can tree-shake this at build time; in SSR it reads the JSON directly.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const SRD_MONSTERS: SrdMonster[] = (require('../../../../data/packs/dnd5e_srd/monsters.json') as {
  monsters: SrdMonster[];
}).monsters;

const CC_BY_ATTRIBUTION =
  'This content derives from the System Reference Document 5.1 by Wizards of the Coast LLC, ' +
  'available at https://dnd.wizards.com/resources/systems-reference-document. ' +
  'Licensed under CC-BY 4.0 (https://creativecommons.org/licenses/by/4.0/).';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function findSrdMonster(name: string): SrdMonster | null {
  const normalized = name.trim().toLowerCase();
  return (
    SRD_MONSTERS.find(m => m.name.toLowerCase() === normalized) ??
    SRD_MONSTERS.find(m => m.name.toLowerCase().includes(normalized) || normalized.includes(m.name.toLowerCase())) ??
    null
  );
}

function srdMonsterToParsed(m: SrdMonster): ParsedCreatureData {
  return {
    name: m.name,
    ac: m.ac,
    hp: m.hp,
    cr: m.cr,
    movement: m.movement ?? '30 ft',
    attacks: m.attacks ?? [],
    specialActions: [],
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Pack
// ─────────────────────────────────────────────────────────────────────────────

export const dnd5eSrdPack: SystemPack = {
  id: 'dnd5e_srd',
  displayName: 'D&D 5e (SRD)',
  description: 'Uses SRD 5.1 monster data (CC BY 4.0) for accurate stat lookup and conversion.',
  license: {
    type: 'CC-BY-4.0',
    attributionText: CC_BY_ATTRIBUTION,
    source: 'https://dnd.wizards.com/resources/systems-reference-document',
  },
  canAutoFindStatblocks: true,
  requiresUserReference: false,

  parseSourceStatblock(inputText: string): ParsedCreatureData {
    const result = parseStatBlock(inputText);
    const parsed  = result.data;

    // Enrich with SRD canonical data when we recognise the creature name
    if (parsed.name) {
      const srd = findSrdMonster(parsed.name);
      if (srd) {
        if (parsed.ac  === undefined) parsed.ac  = srd.ac;
        if (parsed.hp  === undefined) parsed.hp  = srd.hp;
        if (parsed.cr  === undefined) parsed.cr  = srd.cr;
        if (!parsed.movement)         parsed.movement = srd.movement;
        if (!parsed.attacks?.length)  parsed.attacks  = srd.attacks ?? [];
      }
    }
    return parsed;
  },

  findStatblockByName(name: string): ParsedCreatureData | null {
    const found = findSrdMonster(name);
    return found ? srdMonsterToParsed(found) : null;
  },

  convertToTarget(parsed: ParsedCreatureData, options: ConvertOptions): ConvertedStat {
    const provenance = buildProvenance(
      'dnd5e_srd',
      this.displayName,
      'CC-BY-4.0',
      CC_BY_ATTRIBUTION
    );
    return buildConvertedStat(
      parsed, options,
      /* hpMultiplier */  1.0,
      /* dmgMultiplier */ 1.0,
      /* showMorale */    true,
      /* showReaction */  false,
      'dnd5e_srd',
      provenance
    );
  },

  validate(converted: ConvertedStat, reference?: ReferenceStatblock): ValidationReport {
    // If no reference, try enriching from the SRD directly
    if (!reference && converted.name) {
      const srd = findSrdMonster(converted.name);
      if (srd) {
        const autoRef: ReferenceStatblock = {
          rawText: '',
          parsed: {
            name: srd.name,
            ac: srd.ac,
            hp: srd.hp,
            attacks: srd.attacks ?? [],
          },
        };
        return generateValidationReport(converted, autoRef);
      }
    }
    return generateValidationReport(converted, reference);
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Public helper: search SRD by partial name (for autocomplete)
// ─────────────────────────────────────────────────────────────────────────────
export function searchSrdMonsters(query: string, limit = 8): string[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return SRD_MONSTERS.filter(m => m.name.toLowerCase().includes(q))
    .slice(0, limit)
    .map(m => m.name);
}
