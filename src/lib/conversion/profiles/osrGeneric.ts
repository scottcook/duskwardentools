/**
 * OSR Generic (conversion) profile — v1
 *
 * Targets a B/X / OSE-adjacent feel:
 *   - Leaner HP than 5e
 *   - Lower AC ceiling
 *   - Morale + reaction rolls present
 *   - Flat attack bonus progression
 *
 * All values are our own design. No proprietary text.
 */

import type { ConversionProfile } from './types';

export const osrGenericProfile: ConversionProfile = {
  id: 'osr_generic_v1',
  version: '1.0.0',
  displayName: 'OSR Generic (conversion)',
  helperText:
    'Creates a stat card balanced for old-school (B/X / OSE-style) play. ' +
    'Tuned for fast, lethal combat with morale and reaction rolls.',
  showMorale: true,
  showReaction: true,

  baseTierTargets: {
    1: { acTarget: 11, hpTarget:  6, attackBonusTarget: 1, dprTarget:  3.5, moraleTarget:  7 },
    2: { acTarget: 12, hpTarget: 12, attackBonusTarget: 3, dprTarget:  5.5, moraleTarget:  8 },
    3: { acTarget: 14, hpTarget: 22, attackBonusTarget: 5, dprTarget:  8.5, moraleTarget:  9 },
    4: { acTarget: 15, hpTarget: 40, attackBonusTarget: 7, dprTarget: 13.5, moraleTarget: 10 },
    5: { acTarget: 17, hpTarget: 72, attackBonusTarget: 9, dprTarget: 21.0, moraleTarget: 11 },
  },

  roleModifiers: {
    // role         ac    hp    ab    dpr
    brute:     { ac: 1.0, hp: 1.4, attackBonus: 0.9, dpr: 1.3 },
    skirmisher:{ ac: 1.1, hp: 0.8, attackBonus: 1.1, dpr: 0.9 },
    caster:    { ac: 0.9, hp: 0.8, attackBonus: 0.8, dpr: 1.1 },
    boss:      { ac: 1.1, hp: 2.0, attackBonus: 1.1, dpr: 1.4 },
    minion:    { ac: 0.9, hp: 0.5, attackBonus: 0.9, dpr: 0.7 },
    support:   { ac: 1.0, hp: 0.9, attackBonus: 0.8, dpr: 0.7 },
  },

  tolerance: {
    ac: 1,
    hp: 0.15,
    attackBonus: 1,
    dpr: 0.15,
  },
};
