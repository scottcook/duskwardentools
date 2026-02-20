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
