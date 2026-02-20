import { describe, it, expect } from 'vitest';
import { CONVERSION_PROFILES, getEffectiveTargets, getProfile } from '@/lib/conversion/profiles';
import { osrGenericProfile }           from '@/lib/conversion/profiles/osrGeneric';
import { shadowdarkCompatibleProfile } from '@/lib/conversion/profiles/shadowdarkCompatible';
import { convertCreature, getDefaultSettings } from '@/lib/conversion/engine';
import { validateBands }  from '@/lib/conversion/bandValidation';
import type { ParsedCreatureData, ConversionSettings } from '@/types';
import type { ConversionProfileId } from '@/lib/conversion/profiles';

// ─────────────────────────────────────────────────────────────────────────────
// Shared fixtures
// ─────────────────────────────────────────────────────────────────────────────

const goblinLike: ParsedCreatureData = {
  name: 'Goblin',
  ac: 15,
  hp: 7,
  cr: '1/4',
  movement: '30 ft',
  attacks: [{ name: 'Scimitar', bonus: 4, damage: '1d6+2' }],
  system: '5e',
};

const bigTrollLike: ParsedCreatureData = {
  name: 'Troll',
  ac: 15,
  hp: 84,
  cr: '5',
  movement: '30 ft',
  attacks: [{ name: 'Claw', bonus: 7, damage: '2d6+4' }, { name: 'Bite', bonus: 7, damage: '1d6+4' }],
  system: '5e',
};

function settingsFor(profileId: ConversionProfileId, overrides: Partial<ConversionSettings> = {}): ConversionSettings {
  return { ...getDefaultSettings(), conversionProfileId: profileId, ...overrides };
}

// ─────────────────────────────────────────────────────────────────────────────
// Profile registry
// ─────────────────────────────────────────────────────────────────────────────

describe('CONVERSION_PROFILES registry', () => {
  it('contains both MVP profiles', () => {
    expect(CONVERSION_PROFILES.osr_generic_v1).toBeDefined();
    expect(CONVERSION_PROFILES.shadowdark_compatible_v1).toBeDefined();
  });

  it('getProfile returns the correct profile', () => {
    expect(getProfile('osr_generic_v1').id).toBe('osr_generic_v1');
    expect(getProfile('shadowdark_compatible_v1').id).toBe('shadowdark_compatible_v1');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Monotonic targets — HP and DPR must increase (or stay equal) as tier rises
// ─────────────────────────────────────────────────────────────────────────────

describe('osrGenericProfile — monotonic targets', () => {
  const profile = osrGenericProfile;
  const tiers = [1, 2, 3, 4, 5] as const;

  it('HP target increases monotonically across tiers (skirmisher)', () => {
    for (let i = 0; i < tiers.length - 1; i++) {
      const a = getEffectiveTargets(profile, tiers[i],     'skirmisher');
      const b = getEffectiveTargets(profile, tiers[i + 1], 'skirmisher');
      expect(b.hpTarget).toBeGreaterThanOrEqual(a.hpTarget);
    }
  });

  it('DPR target increases monotonically across tiers (skirmisher)', () => {
    for (let i = 0; i < tiers.length - 1; i++) {
      const a = getEffectiveTargets(profile, tiers[i],     'skirmisher');
      const b = getEffectiveTargets(profile, tiers[i + 1], 'skirmisher');
      expect(b.dprTarget).toBeGreaterThanOrEqual(a.dprTarget);
    }
  });

  it('AC target increases monotonically across tiers', () => {
    for (let i = 0; i < tiers.length - 1; i++) {
      const a = profile.baseTierTargets[tiers[i]];
      const b = profile.baseTierTargets[tiers[i + 1]];
      expect(b.acTarget).toBeGreaterThanOrEqual(a.acTarget);
    }
  });
});

describe('shadowdarkCompatibleProfile — monotonic targets', () => {
  const profile = shadowdarkCompatibleProfile;
  const tiers = [1, 2, 3, 4, 5] as const;

  it('HP target increases monotonically across tiers (skirmisher)', () => {
    for (let i = 0; i < tiers.length - 1; i++) {
      const a = getEffectiveTargets(profile, tiers[i],     'skirmisher');
      const b = getEffectiveTargets(profile, tiers[i + 1], 'skirmisher');
      expect(b.hpTarget).toBeGreaterThanOrEqual(a.hpTarget);
    }
  });

  it('DPR target increases monotonically across tiers', () => {
    for (let i = 0; i < tiers.length - 1; i++) {
      const a = getEffectiveTargets(profile, tiers[i],     'skirmisher');
      const b = getEffectiveTargets(profile, tiers[i + 1], 'skirmisher');
      expect(b.dprTarget).toBeGreaterThanOrEqual(a.dprTarget);
    }
  });

  it('Shadowdark HP targets are lower than OSR targets (lean play)', () => {
    for (const tier of tiers) {
      const sd  = getEffectiveTargets(shadowdarkCompatibleProfile, tier, 'skirmisher');
      const osr = getEffectiveTargets(osrGenericProfile,            tier, 'skirmisher');
      expect(sd.hpTarget).toBeLessThanOrEqual(osr.hpTarget);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Role modifiers behave correctly
// ─────────────────────────────────────────────────────────────────────────────

describe('Role modifiers', () => {
  const profile = shadowdarkCompatibleProfile;

  it('boss HP target is higher than skirmisher at same tier', () => {
    const boss = getEffectiveTargets(profile, 3, 'boss');
    const sk   = getEffectiveTargets(profile, 3, 'skirmisher');
    expect(boss.hpTarget).toBeGreaterThan(sk.hpTarget);
  });

  it('minion HP target is lower than skirmisher at same tier', () => {
    const minion = getEffectiveTargets(profile, 3, 'minion');
    const sk     = getEffectiveTargets(profile, 3, 'skirmisher');
    expect(minion.hpTarget).toBeLessThan(sk.hpTarget);
  });

  it('brute DPR target is higher than caster at same tier', () => {
    const brute = getEffectiveTargets(profile, 3, 'brute');
    const caster = getEffectiveTargets(profile, 3, 'caster');
    expect(brute.dprTarget).toBeGreaterThan(caster.dprTarget);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Engine — conversion output contains tuning metadata
// ─────────────────────────────────────────────────────────────────────────────

describe('convertCreature — tuning metadata', () => {
  it('output includes tuning block with profileId, role, targets', () => {
    const out = convertCreature(goblinLike, settingsFor('shadowdark_compatible_v1', { role: 'skirmisher' }));
    expect(out.tuning).toBeDefined();
    expect(out.tuning?.profileId).toBe('shadowdark_compatible_v1');
    expect(out.tuning?.role).toBe('skirmisher');
    expect(out.tuning?.targets.hpTarget).toBeGreaterThan(0);
    expect(out.tuning?.targets.acTarget).toBeGreaterThan(0);
    expect(out.tuning?.targets.dprTarget).toBeGreaterThan(0);
  });

  it('output includes provenance with outputSystem label', () => {
    const out = convertCreature(goblinLike, settingsFor('shadowdark_compatible_v1'));
    expect(out.tuning?.provenance.outputSystem).toContain('Shadowdark RPG');
  });

  it('outputProfile bridges legacy field correctly', () => {
    const sd  = convertCreature(goblinLike, settingsFor('shadowdark_compatible_v1'));
    const osr = convertCreature(goblinLike, settingsFor('osr_generic_v1'));
    expect(sd.outputProfile).toBe('shadowdark_compatible');
    expect(osr.outputProfile).toBe('osr_generic');
  });

  it('showMorale is false for shadowdark profile', () => {
    const out = convertCreature(goblinLike, settingsFor('shadowdark_compatible_v1'));
    expect(out.showMorale).toBe(false);
  });

  it('showMorale is true for OSR profile', () => {
    const out = convertCreature(goblinLike, settingsFor('osr_generic_v1'));
    expect(out.showMorale).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Engine — output within tolerance when multipliers = 1
// ─────────────────────────────────────────────────────────────────────────────

describe('convertCreature — within tolerance', () => {
  it('goblin-like (tier 1) output is within band tolerance (SD profile)', () => {
    const settings = settingsFor('shadowdark_compatible_v1', { role: 'skirmisher' });
    const out      = convertCreature(goblinLike, settings);
    const profile  = CONVERSION_PROFILES['shadowdark_compatible_v1'];
    const report   = validateBands(out, profile);

    // With unmodified multipliers, at minimum HP and AB should be in band
    const hpResult = report.results.find(r => r.field === 'HP');
    const abResult = report.results.find(r => r.field === 'Attack Bonus');
    expect(hpResult?.status).toBe('pass');
    expect(abResult?.status).toBe('pass');
  });

  it('troll-like (tier 3) output contains correct tier', () => {
    const out = convertCreature(bigTrollLike, settingsFor('osr_generic_v1', { role: 'brute' }));
    expect(out.threatTier).toBe(3);
  });

  it('band report balanced=true means score=100', () => {
    const settings = settingsFor('shadowdark_compatible_v1', { role: 'skirmisher' });
    const out      = convertCreature(goblinLike, settings);
    const profile  = CONVERSION_PROFILES['shadowdark_compatible_v1'];
    const report   = validateBands(out, profile);
    if (report.balanced) expect(report.score).toBe(100);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Band Validation — report structure
// ─────────────────────────────────────────────────────────────────────────────

describe('validateBands', () => {
  it('returns empty report when no tuning data', () => {
    const out = convertCreature(goblinLike, settingsFor('osr_generic_v1'));
    const noTuning = { ...out, tuning: undefined };
    const profile  = CONVERSION_PROFILES['osr_generic_v1'];
    const report   = validateBands(noTuning, profile);
    expect(report.results).toHaveLength(0);
    expect(report.score).toBe(0);
    expect(report.balanced).toBe(false);
  });

  it('report contains AC, HP, Attack Bonus, DPR fields', () => {
    const settings = settingsFor('osr_generic_v1', { role: 'skirmisher' });
    const out      = convertCreature(goblinLike, settings);
    const profile  = CONVERSION_PROFILES['osr_generic_v1'];
    const report   = validateBands(out, profile);
    const fields = report.results.map(r => r.field);
    expect(fields).toContain('AC');
    expect(fields).toContain('HP');
    expect(fields).toContain('Attack Bonus');
    expect(fields).toContain('DPR');
  });

  it('score is between 0 and 100', () => {
    const settings = settingsFor('shadowdark_compatible_v1', { role: 'boss' });
    const out      = convertCreature(bigTrollLike, settings);
    const profile  = CONVERSION_PROFILES['shadowdark_compatible_v1'];
    const report   = validateBands(out, profile);
    expect(report.score).toBeGreaterThanOrEqual(0);
    expect(report.score).toBeLessThanOrEqual(100);
  });

  it('high deadliness makes DPR result high', () => {
    const settings = settingsFor('osr_generic_v1', { role: 'skirmisher', deadliness: 2.0 });
    const out      = convertCreature(goblinLike, settings);
    const profile  = CONVERSION_PROFILES['osr_generic_v1'];
    const report   = validateBands(out, profile);
    const dpr      = report.results.find(r => r.field === 'DPR');
    expect(dpr?.status).toBe('high');
  });

  it('high durability makes HP result high', () => {
    const settings = settingsFor('osr_generic_v1', { role: 'skirmisher', durability: 2.0 });
    const out      = convertCreature(goblinLike, settings);
    const profile  = CONVERSION_PROFILES['osr_generic_v1'];
    const report   = validateBands(out, profile);
    const hp       = report.results.find(r => r.field === 'HP');
    expect(hp?.status).toBe('high');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Snapshot: known goblin-like input produces expected tuning
// ─────────────────────────────────────────────────────────────────────────────

describe('Conversion snapshot — goblin-like SD profile', () => {
  it('tier 1 goblin produces HP within expected range', () => {
    const settings = settingsFor('shadowdark_compatible_v1', { role: 'skirmisher' });
    const out = convertCreature(goblinLike, settings);
    // SD tier 1 base HP = 4, skirmisher modifier 0.8 → target ~3
    // We allow a range since AC blending may shift tier detection slightly
    expect(out.hp).toBeGreaterThanOrEqual(2);
    expect(out.hp).toBeLessThanOrEqual(10);
    expect(out.tuning?.profileId).toBe('shadowdark_compatible_v1');
    expect(out.tuning?.targets.hpTarget).toBeGreaterThan(0);
  });

  it('SD profile does not show morale on output', () => {
    const out = convertCreature(goblinLike, settingsFor('shadowdark_compatible_v1'));
    expect(out.showMorale).toBe(false);
    expect(out.showReaction).toBe(false);
  });

  it('output provenance does not contain proprietary Shadowdark rules text', () => {
    const out = convertCreature(goblinLike, settingsFor('shadowdark_compatible_v1'));
    const json = JSON.stringify(out);
    // Provenance should reference the profile label, not internal SD rules
    expect(json).not.toContain('Shadowdark RPG Third-Party License text');
    expect(json).not.toContain('Shadowdark bestiary');
    expect(out.tuning?.provenance.outputSystem).toContain('Shadowdark RPG');
  });
});
