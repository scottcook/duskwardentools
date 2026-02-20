/**
 * System Pack Registry
 *
 * Import packs from here. Add new packs by:
 * 1. Creating src/lib/systemPacks/packs/<yourPack>.ts
 * 2. Importing + adding it to SYSTEM_PACKS below
 * 3. Extending the SystemPackId union in types.ts
 *
 * See /README.md#adding-a-system-pack for the full guide.
 */

export type { SystemPack, SystemPackId, ConvertedStat, ValidationReport, ReferenceStatblock, FieldDiff, ProvenanceBlock, ConvertOptions } from './types';
export { osrGenericPack }       from './packs/osrGeneric';
export { dnd5eSrdPack, searchSrdMonsters } from './packs/dnd5eSrd';
export { shadowdarkVerifyPack } from './packs/shadowdarkVerify';

import type { SystemPack, SystemPackId } from './types';
import { osrGenericPack }       from './packs/osrGeneric';
import { dnd5eSrdPack }         from './packs/dnd5eSrd';
import { shadowdarkVerifyPack } from './packs/shadowdarkVerify';

export const SYSTEM_PACKS: Record<SystemPackId, SystemPack> = {
  osr_generic:               osrGenericPack,
  dnd5e_srd:                 dnd5eSrdPack,
  shadowdark_private_verify: shadowdarkVerifyPack,
};

/** Ordered list for the UI dropdown */
export const SYSTEM_PACK_OPTIONS: { value: SystemPackId; label: string; description: string }[] = [
  {
    value: 'osr_generic',
    label: osrGenericPack.displayName,
    description: osrGenericPack.description,
  },
  {
    value: 'dnd5e_srd',
    label: dnd5eSrdPack.displayName,
    description: dnd5eSrdPack.description,
  },
  {
    value: 'shadowdark_private_verify',
    label: shadowdarkVerifyPack.displayName,
    description: shadowdarkVerifyPack.description,
  },
];

export function getPack(id: SystemPackId): SystemPack {
  return SYSTEM_PACKS[id];
}
