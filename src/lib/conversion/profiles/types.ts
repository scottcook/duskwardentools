/**
 * Conversion Profile Types
 *
 * A ConversionProfile is a set of numeric target curves that define what
 * "balanced" means for a given output system. There is NO proprietary rules
 * text here — only our own numeric targets.
 *
 * Adding a profile: see /README.md#adding-a-system-pack
 */

export type ConversionProfileId =
  | 'osr_generic_v1'
  | 'shadowdark_compatible_v1';

export type CreatureRole = 'brute' | 'skirmisher' | 'caster' | 'boss' | 'minion' | 'support';

/** Per-tier numeric targets for a given role. */
export interface TierTargets {
  acTarget: number;
  hpTarget: number;
  attackBonusTarget: number;
  /** Average damage per round (single attack) */
  dprTarget: number;
  /** Optional morale (omit to hide the field) */
  moraleTarget?: number;
}

/**
 * Role modifiers are multiplicative factors applied to the base tier targets.
 * Values > 1 increase the stat; < 1 decrease it.
 */
export interface RoleModifiers {
  ac: number;
  hp: number;
  attackBonus: number;
  dpr: number;
}

export interface ConversionProfile {
  id: ConversionProfileId;
  version: string;
  displayName: string;
  /** Short line shown in the UI under the dropdown */
  helperText: string;
  /** Whether to show the morale field on stat cards */
  showMorale: boolean;
  /** Whether to show the OSR-style reaction roll */
  showReaction: boolean;

  /**
   * Base tier targets (role = 'skirmisher' / standard creature).
   * Tiers 1–5. Must be monotonically non-decreasing for HP and DPR.
   */
  baseTierTargets: Record<1 | 2 | 3 | 4 | 5, TierTargets>;

  /** Per-role multipliers applied on top of baseTierTargets. */
  roleModifiers: Record<CreatureRole, RoleModifiers>;

  /**
   * Tolerance bands used for band validation.
   * "pass" = final stat within this fraction of target.
   */
  tolerance: {
    ac: number;          // ± absolute (e.g. 1)
    hp: number;          // ± fractional (e.g. 0.15)
    attackBonus: number; // ± absolute (e.g. 1)
    dpr: number;         // ± fractional (e.g. 0.15)
  };
}
