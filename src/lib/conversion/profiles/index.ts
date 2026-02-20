/**
 * Conversion profiles registry.
 *
 * Adding a new profile:
 *   1. Create src/lib/conversion/profiles/<yourProfile>.ts
 *   2. Add it to CONVERSION_PROFILES below
 *   3. Extend ConversionProfileId in ./types.ts
 */

export type { ConversionProfile, ConversionProfileId, CreatureRole, TierTargets, RoleModifiers } from './types';
export { osrGenericProfile }            from './osrGeneric';
export { shadowdarkCompatibleProfile }  from './shadowdarkCompatible';

import type { ConversionProfile, ConversionProfileId } from './types';
import { osrGenericProfile }            from './osrGeneric';
import { shadowdarkCompatibleProfile }  from './shadowdarkCompatible';

export const CONVERSION_PROFILES: Record<ConversionProfileId, ConversionProfile> = {
  osr_generic_v1:           osrGenericProfile,
  shadowdark_compatible_v1: shadowdarkCompatibleProfile,
};

/** Ordered options for the Output System dropdown */
export const CONVERSION_PROFILE_OPTIONS = [
  { value: 'osr_generic_v1'           as ConversionProfileId, label: osrGenericProfile.displayName },
  { value: 'shadowdark_compatible_v1' as ConversionProfileId, label: shadowdarkCompatibleProfile.displayName },
] as const;

export function getProfile(id: ConversionProfileId): ConversionProfile {
  return CONVERSION_PROFILES[id];
}

/**
 * Compute effective targets for a given tier + role + profile.
 * Returns the actual numeric targets that the engine will aim for.
 */
export function getEffectiveTargets(
  profile: ConversionProfile,
  tier: 1 | 2 | 3 | 4 | 5,
  role: import('./types').CreatureRole
) {
  const base = profile.baseTierTargets[tier];
  const mod  = profile.roleModifiers[role];
  return {
    acTarget:          Math.round(base.acTarget          * mod.ac),
    hpTarget:          Math.round(base.hpTarget          * mod.hp),
    attackBonusTarget: Math.round(base.attackBonusTarget * mod.attackBonus),
    dprTarget:         Math.round(base.dprTarget         * mod.dpr * 10) / 10,
    moraleTarget:      base.moraleTarget,
  };
}
