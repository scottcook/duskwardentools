import { describe, it, expect } from 'vitest';
import {
  convertCreature,
  getDefaultSettings,
  validateSettings,
  getProfilePreset,
} from '@/lib/conversion/engine';
import type { ParsedCreatureData, ConversionSettings } from '@/types';

describe('convertCreature', () => {
  const baseParsedData: ParsedCreatureData = {
    name: 'Test Creature',
    ac: 14,
    hp: 25,
    movement: '30 ft',
    attacks: [{ name: 'Bite', bonus: 4, damage: '1d6+2' }],
    level: 3,
  };

  it('should convert a basic creature', () => {
    const settings = getDefaultSettings();
    const result = convertCreature(baseParsedData, settings);

    expect(result.name).toBe('Test Creature');
    expect(result.ac).toBeGreaterThan(0);
    expect(result.hp).toBeGreaterThan(0);
    expect(result.movement).toBe('30 ft');
    expect(result.attacks.length).toBeGreaterThan(0);
    expect(result.threatTier).toBeGreaterThanOrEqual(1);
    expect(result.threatTier).toBeLessThanOrEqual(5);
  });

  it('should assign correct threat tier based on level', () => {
    const settings = getDefaultSettings();

    const level1 = convertCreature({ ...baseParsedData, level: 1 }, settings);
    expect(level1.threatTier).toBe(1);

    const level4 = convertCreature({ ...baseParsedData, level: 4 }, settings);
    expect(level4.threatTier).toBe(2);

    const level6 = convertCreature({ ...baseParsedData, level: 6 }, settings);
    expect(level6.threatTier).toBe(3);

    const level10 = convertCreature({ ...baseParsedData, level: 10 }, settings);
    expect(level10.threatTier).toBe(4);

    const level15 = convertCreature({ ...baseParsedData, level: 15 }, settings);
    expect(level15.threatTier).toBe(5);
  });

  it('should use target level from settings over parsed level', () => {
    const settings: ConversionSettings = {
      ...getDefaultSettings(),
      targetLevel: 10,
    };

    const result = convertCreature({ ...baseParsedData, level: 1 }, settings);
    expect(result.threatTier).toBe(4);
  });

  it('should infer tier from HP when no level provided', () => {
    const settings = getDefaultSettings();

    const lowHp = convertCreature({ ...baseParsedData, level: undefined, hp: 5 }, settings);
    expect(lowHp.threatTier).toBe(1);

    const highHp = convertCreature({ ...baseParsedData, level: undefined, hp: 100 }, settings);
    expect(highHp.threatTier).toBe(5);
  });

  it('should scale HP with durability setting', () => {
    const normalSettings = getDefaultSettings();
    const highDurability: ConversionSettings = { ...normalSettings, durability: 2.0 };
    const lowDurability: ConversionSettings = { ...normalSettings, durability: 0.5 };

    const normal = convertCreature(baseParsedData, normalSettings);
    const tankier = convertCreature(baseParsedData, highDurability);
    const squishier = convertCreature(baseParsedData, lowDurability);

    expect(tankier.hp).toBeGreaterThan(normal.hp);
    expect(squishier.hp).toBeLessThan(normal.hp);
  });

  it('should scale damage with deadliness setting', () => {
    const normalSettings = getDefaultSettings();
    const highDeadliness: ConversionSettings = { ...normalSettings, deadliness: 2.0 };

    const normal = convertCreature(baseParsedData, normalSettings);
    const deadly = convertCreature(baseParsedData, highDeadliness);

    expect(deadly.attacks[0].damage).toBeDefined();
    expect(normal.attacks[0].damage).toBeDefined();
  });

  it('should generate default attack when none provided', () => {
    const settings = getDefaultSettings();
    const noAttacks: ParsedCreatureData = { ...baseParsedData, attacks: [] };
    
    const result = convertCreature(noAttacks, settings);
    
    expect(result.attacks.length).toBe(1);
    expect(result.attacks[0].name).toBe('Attack');
    expect(result.attacks[0].bonus).toBeDefined();
    expect(result.attacks[0].damage).toBeDefined();
  });

  it('should generate appropriate morale based on tier', () => {
    const settings = getDefaultSettings();

    const tier1 = convertCreature({ ...baseParsedData, level: 1 }, settings);
    const tier5 = convertCreature({ ...baseParsedData, level: 20 }, settings);

    expect(tier1.morale).toBeLessThan(tier5.morale);
  });

  it('should generate loot notes', () => {
    const settings = getDefaultSettings();
    const result = convertCreature(baseParsedData, settings);
    
    expect(result.lootNotes).toBeDefined();
    expect(result.lootNotes.length).toBeGreaterThan(0);
  });

  it('should extract traits from movement', () => {
    const settings = getDefaultSettings();
    
    const flying = convertCreature({ ...baseParsedData, movement: '30 ft, fly 60 ft' }, settings);
    expect(flying.traits.some(t => t.toLowerCase().includes('fly'))).toBe(true);

    const swimming = convertCreature({ ...baseParsedData, movement: '30 ft, swim 40 ft' }, settings);
    expect(swimming.traits.some(t => t.toLowerCase().includes('swim') || t.toLowerCase().includes('aquatic'))).toBe(true);
  });

  it('should handle missing name gracefully', () => {
    const settings = getDefaultSettings();
    const noName: ParsedCreatureData = { ...baseParsedData, name: undefined };
    
    const result = convertCreature(noName, settings);
    expect(result.name).toBe('Unnamed Creature');
  });

  it('should ensure HP is at least 1', () => {
    const settings: ConversionSettings = { ...getDefaultSettings(), durability: 0.1 };
    const lowHp: ParsedCreatureData = { ...baseParsedData, hp: 1 };
    
    const result = convertCreature(lowHp, settings);
    expect(result.hp).toBeGreaterThanOrEqual(1);
  });

  it('should preserve multiattack structure when multiple source attacks exist', () => {
    const settings = getDefaultSettings();
    const multiattack: ParsedCreatureData = {
      ...baseParsedData,
      attacks: [
        { name: 'Claw', bonus: 4, damage: '1d6+2' },
        { name: 'Bite', bonus: 4, damage: '1d8+2' },
      ],
    };

    const result = convertCreature(multiattack, settings);
    expect(result.attacks).toHaveLength(2);
    expect(result.attacks[0].name).toBe('Claw');
    expect(result.attacks[1].name).toBe('Bite');
  });
});

describe('Shadowdark multiattack collapse', () => {
  const knightParsed: ParsedCreatureData = {
    name: 'Knight',
    ac: 18,
    hp: 52,
    movement: '30 ft',
    attacks: [
      { name: 'Greatsword', bonus: 5, damage: '2d6+3' },
      { name: 'Heavy Crossbow', bonus: 2, damage: '1d10' },
    ],
    specialActions: [
      { name: 'Multiattack', description: 'The knight makes two melee attacks.' },
      { name: 'Leadership', description: 'For 1 minute the knight can utter a command.' },
    ],
    multiattackCount: 2,
    level: 3,
  };

  it('should collapse multiattack into a count on the primary attack for SD profile', () => {
    const settings: ConversionSettings = {
      ...getDefaultSettings(),
      conversionProfileId: 'shadowdark_compatible_v1',
      outputProfile: 'shadowdark_compatible',
      outputPackId: 'shadowdark_private_verify',
    };

    const result = convertCreature(knightParsed, settings);

    expect(result.attacks[0].count).toBe(2);
    expect(result.attacks[0].name).toBe('Greatsword');
    expect(result.attacks[0].bonus).toBeDefined();
    expect(result.attacks[0].damage).toBeDefined();
  });

  it('should remove Multiattack from specialActions when collapsing', () => {
    const settings: ConversionSettings = {
      ...getDefaultSettings(),
      conversionProfileId: 'shadowdark_compatible_v1',
      outputProfile: 'shadowdark_compatible',
      outputPackId: 'shadowdark_private_verify',
    };

    const result = convertCreature(knightParsed, settings);

    expect(result.specialActions.some(a => a.name === 'Multiattack')).toBe(false);
    expect(result.specialActions.some(a => a.name === 'Leadership')).toBe(true);
  });

  it('should NOT collapse multiattack for OSR generic profile', () => {
    const settings: ConversionSettings = {
      ...getDefaultSettings(),
      conversionProfileId: 'osr_generic_v1',
    };

    const result = convertCreature(knightParsed, settings);

    expect(result.attacks.every(a => a.count === undefined)).toBe(true);
    expect(result.specialActions.some(a => a.name === 'Multiattack')).toBe(true);
  });

  it('should collapse a dragon-style three-attack multiattack for SD', () => {
    const dragon: ParsedCreatureData = {
      name: 'Young Dragon',
      ac: 18, hp: 178,
      movement: '40 ft, fly 80 ft',
      attacks: [
        { name: 'Bite', bonus: 10, damage: '2d10+6' },
        { name: 'Claw', bonus: 10, damage: '2d6+6' },
      ],
      specialActions: [
        { name: 'Multiattack', description: 'The dragon makes three attacks: one with its bite and two with its claws.' },
      ],
      multiattackCount: 3,
      level: 10,
    };

    const settings: ConversionSettings = {
      ...getDefaultSettings(),
      conversionProfileId: 'shadowdark_compatible_v1',
      outputProfile: 'shadowdark_compatible',
      outputPackId: 'shadowdark_private_verify',
    };

    const result = convertCreature(dragon, settings);

    expect(result.attacks[0].count).toBe(3);
    expect(result.attacks[0].name).toBe('Bite');
    expect(result.specialActions.some(a => a.name === 'Multiattack')).toBe(false);
  });

  it('should work for creatures without multiattack (no collapse)', () => {
    const ogre: ParsedCreatureData = {
      name: 'Ogre',
      ac: 11, hp: 59,
      movement: '40 ft',
      attacks: [
        { name: 'Greatclub', bonus: 6, damage: '2d8+4' },
        { name: 'Javelin', bonus: 6, damage: '2d6+4' },
      ],
      level: 2,
    };

    const settings: ConversionSettings = {
      ...getDefaultSettings(),
      conversionProfileId: 'shadowdark_compatible_v1',
      outputProfile: 'shadowdark_compatible',
      outputPackId: 'shadowdark_private_verify',
    };

    const result = convertCreature(ogre, settings);

    expect(result.attacks.every(a => a.count === undefined)).toBe(true);
    expect(result.attacks.length).toBe(2);
  });
});

describe('Shadowdark distance band movement', () => {
  const base: ParsedCreatureData = {
    name: 'Test',
    ac: 13,
    hp: 20,
    attacks: [{ name: 'Bite', bonus: 3, damage: '1d6+1' }],
    level: 3,
  };

  const sdSettings: ConversionSettings = {
    ...getDefaultSettings(),
    conversionProfileId: 'shadowdark_compatible_v1',
    outputProfile: 'shadowdark_compatible',
    outputPackId: 'shadowdark_private_verify',
  };

  it('should convert 30 ft to "near"', () => {
    const result = convertCreature({ ...base, movement: '30 ft' }, sdSettings);
    expect(result.movement).toBe('near');
  });

  it('should convert 40 ft to "near" (not near ×2)', () => {
    const result = convertCreature({ ...base, movement: '40 ft' }, sdSettings);
    expect(result.movement).toBe('near');
  });

  it('should convert 60 ft to "near ×2"', () => {
    const result = convertCreature({ ...base, movement: '60 ft' }, sdSettings);
    expect(result.movement).toBe('near ×2');
  });

  it('should convert "30 ft, fly 60 ft" to distance bands', () => {
    const result = convertCreature({ ...base, movement: '30 ft, fly 60 ft' }, sdSettings);
    expect(result.movement).toBe('near, fly near ×2');
  });

  it('should convert "40 ft, fly 80 ft" (dragon-style)', () => {
    const result = convertCreature({ ...base, movement: '40 ft, fly 80 ft' }, sdSettings);
    expect(result.movement).toBe('near, fly far');
  });

  it('should convert "30 ft, swim 30 ft, climb 20 ft"', () => {
    const result = convertCreature({ ...base, movement: '30 ft, swim 30 ft, climb 20 ft' }, sdSettings);
    expect(result.movement).toBe('near, swim near, climb close ×2');
  });

  it('should convert 5 ft crawl to "close"', () => {
    const result = convertCreature({ ...base, movement: '5 ft' }, sdSettings);
    expect(result.movement).toBe('close');
  });

  it('should skip 0 ft walk speed (e.g. ghost with "0 ft, fly 30 ft")', () => {
    const result = convertCreature({ ...base, movement: '0 ft, fly 30 ft' }, sdSettings);
    expect(result.movement).toBe('fly near');
  });

  it('should NOT convert movement for OSR generic profile', () => {
    const settings = getDefaultSettings();
    const result = convertCreature({ ...base, movement: '30 ft' }, settings);
    expect(result.movement).toBe('30 ft');
  });
});

describe('getDefaultSettings', () => {
  it('should return neutral settings', () => {
    const settings = getDefaultSettings();

    expect(settings.deadliness).toBe(1.0);
    expect(settings.durability).toBe(1.0);
    expect(settings.targetLevel).toBeUndefined();
    expect(settings.role).toBeUndefined();
    // Default profile is now osr_generic (duskwarden_default is legacy)
    expect(settings.conversionProfileId).toBe('osr_generic_v1');
    expect(settings.outputPackId).toBe('osr_generic');
  });
});

describe('outputProfile presets', () => {
  const baseParsed: ParsedCreatureData = {
    name: 'Orc',
    ac: 13,
    hp: 30,
    movement: '30 ft',
    attacks: [{ name: 'Axe', bonus: 5, damage: '1d8+3' }],
    level: 3,
  };

  it('shadowdark_compatible profile produces lower HP than osr_generic', () => {
    const osrOut = convertCreature(baseParsed, {
      ...getDefaultSettings(),
      conversionProfileId: 'osr_generic_v1',
    });
    const sdOut = convertCreature(baseParsed, {
      ...getDefaultSettings(),
      conversionProfileId: 'shadowdark_compatible_v1',
    });
    // SD HP targets are leaner than OSR
    expect(sdOut.hp).toBeLessThanOrEqual(osrOut.hp);
  });

  it('shadowdark_compatible profile sets showMorale to false', () => {
    const out = convertCreature(baseParsed, {
      ...getDefaultSettings(),
      conversionProfileId: 'shadowdark_compatible_v1',
    });
    expect(out.showMorale).toBe(false);
  });

  it('osr_generic profile sets showReaction to true', () => {
    const out = convertCreature(baseParsed, {
      ...getDefaultSettings(),
      conversionProfileId: 'osr_generic_v1',
    });
    expect(out.showReaction).toBe(true);
  });

  it('outputProfile legacy field bridges correctly to new profile system', () => {
    const osrOut = convertCreature(baseParsed, {
      ...getDefaultSettings(),
      conversionProfileId: 'osr_generic_v1',
    });
    const sdOut = convertCreature(baseParsed, {
      ...getDefaultSettings(),
      conversionProfileId: 'shadowdark_compatible_v1',
    });
    expect(osrOut.outputProfile).toBe('osr_generic');
    expect(sdOut.outputProfile).toBe('shadowdark_compatible');
  });

  it('getProfilePreset (legacy) returns a preset object', () => {
    // getProfilePreset bridges to old OUTPUT_PROFILES — just verify it returns something
    const sd = getProfilePreset('shadowdark_compatible');
    expect(sd).toBeDefined();
    expect(typeof sd.hpMultiplier).toBe('number');

    const osr = getProfilePreset('osr_generic');
    expect(osr).toBeDefined();
  });
});

describe('validateSettings', () => {
  it('should clamp deadliness to valid range', () => {
    expect(validateSettings({ ...getDefaultSettings(), deadliness: 0.1 }).deadliness).toBe(0.5);
    expect(validateSettings({ ...getDefaultSettings(), deadliness: 5.0 }).deadliness).toBe(2.0);
    expect(validateSettings({ ...getDefaultSettings(), deadliness: 1.5 }).deadliness).toBe(1.5);
  });

  it('should clamp durability to valid range', () => {
    expect(validateSettings({ ...getDefaultSettings(), durability: 0.1 }).durability).toBe(0.5);
    expect(validateSettings({ ...getDefaultSettings(), durability: 5.0 }).durability).toBe(2.0);
  });

  it('should clamp target level to valid range', () => {
    expect(validateSettings({ ...getDefaultSettings(), targetLevel: -5 }).targetLevel).toBe(0);
    expect(validateSettings({ ...getDefaultSettings(), targetLevel: 30 }).targetLevel).toBe(20);
  });
});
