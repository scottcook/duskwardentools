/**
 * Shadowdark-compatible (conversion) profile — v1
 *
 * Label: "For use with Shadowdark RPG (conversion)"
 *
 * LEGAL NOTE: This profile contains ONLY our own numeric targets.
 * No Shadowdark rules text, bestiary entries, or proprietary tables
 * are reproduced. The profile is designed to produce stat cards that
 * FEEL balanced for Shadowdark-style fast-play; it does not claim to
 * match official bestiary entries.
 *
 * Design principles derived from publicly observable genre conventions:
 *   - HP runs lean (fast, lethal play)
 *   - AC climbs moderately per tier
 *   - Attack bonus roughly mirrors Shadowdark's +tier/2 feel (our own curve)
 *   - DPR scaled so tier-1 creatures are threatening but not unkillable
 *   - No morale (not a first-class Shadowdark mechanic)
 */

import type { ConversionProfile } from './types';

export const shadowdarkCompatibleProfile: ConversionProfile = {
  id: 'shadowdark_compatible_v1',
  version: '1.0.0',
  displayName: 'For use with Shadowdark RPG (conversion)',
  helperText:
    'Creates a Shadowdark-ready stat card using target balance math. ' +
    'Does not reproduce official bestiary entries. ' +
    'Independent tool; not affiliated with The Arcane Library.',
  showMorale: false,
  showReaction: false,

  // OUR OWN numeric targets — lean HP, moderate AC, crisp DPR
  baseTierTargets: {
    1: { acTarget: 11, hpTarget:  4, attackBonusTarget: 1, dprTarget:  3.5 },
    2: { acTarget: 12, hpTarget:  8, attackBonusTarget: 2, dprTarget:  5.5 },
    3: { acTarget: 14, hpTarget: 16, attackBonusTarget: 4, dprTarget:  8.5 },
    4: { acTarget: 15, hpTarget: 28, attackBonusTarget: 6, dprTarget: 13.5 },
    5: { acTarget: 17, hpTarget: 50, attackBonusTarget: 8, dprTarget: 21.0 },
  },

  roleModifiers: {
    brute:     { ac: 1.0, hp: 1.5, attackBonus: 0.9, dpr: 1.3 },
    skirmisher:{ ac: 1.1, hp: 0.8, attackBonus: 1.1, dpr: 0.9 },
    caster:    { ac: 0.9, hp: 0.7, attackBonus: 0.8, dpr: 1.1 },
    boss:      { ac: 1.1, hp: 2.2, attackBonus: 1.1, dpr: 1.5 },
    minion:    { ac: 0.9, hp: 0.5, attackBonus: 0.9, dpr: 0.7 },
    support:   { ac: 0.9, hp: 0.8, attackBonus: 0.8, dpr: 0.6 },
  },

  tolerance: {
    ac: 1,
    hp: 0.15,
    attackBonus: 1,
    dpr: 0.15,
  },
};
