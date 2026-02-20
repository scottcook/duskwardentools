import { describe, it, expect } from 'vitest';
import { parseStatBlock, createEmptyParsedData } from '@/lib/parser';

describe('parseStatBlock', () => {
  it('should return empty data for empty input', () => {
    const result = parseStatBlock('');
    expect(result.success).toBe(false);
    expect(result.confidence).toBe(0);
    expect(result.warnings).toContain('Empty text provided');
  });

  it('should extract creature name from first line', () => {
    const result = parseStatBlock('Goblin\nAC 15\nHP 7');
    expect(result.data.name).toBe('Goblin');
  });

  it('should extract name with markdown headers', () => {
    const result = parseStatBlock('## Orc Warrior\nAC 13\nHP 15');
    expect(result.data.name).toBe('Orc Warrior');
  });

  it('should extract AC from various formats', () => {
    expect(parseStatBlock('Test\nAC 15').data.ac).toBe(15);
    expect(parseStatBlock('Test\nAC: 14').data.ac).toBe(14);
    expect(parseStatBlock('Test\nArmor Class 16').data.ac).toBe(16);
    expect(parseStatBlock('Test\nAC = 12').data.ac).toBe(12);
  });

  it('should extract HP from various formats', () => {
    expect(parseStatBlock('Test\nHP 45').data.hp).toBe(45);
    expect(parseStatBlock('Test\nHit Points: 30').data.hp).toBe(30);
    expect(parseStatBlock('Test\n22 hit points').data.hp).toBe(22);
  });

  it('should calculate HP from hit dice', () => {
    const result = parseStatBlock('Test\n4d8 HD');
    expect(result.data.hp).toBeGreaterThan(0);
  });

  it('should extract movement speed', () => {
    expect(parseStatBlock('Test\nSpeed 30 ft').data.movement).toBe('30 ft');
    expect(parseStatBlock('Test\nMove: 40 ft').data.movement).toContain('40');
  });

  it('should extract CR/level', () => {
    expect(parseStatBlock('Test\nCR 5').data.cr).toBe('5');
    expect(parseStatBlock('Test\nChallenge Rating 3').data.cr).toBe('3');
    expect(parseStatBlock('Test\nCR 1/4').data.cr).toBe('1/4');
  });

  it('should parse a full 5e-style stat block', () => {
    const statBlock = `
Goblin
Small humanoid, neutral evil

Armor Class 15 (leather armor, shield)
Hit Points 7 (2d6)
Speed 30 ft.

Melee Attack: Scimitar +4 to hit, 1d6+2 slashing damage
    `;

    const result = parseStatBlock(statBlock, '5e');
    
    expect(result.success).toBe(true);
    expect(result.data.name).toBe('Goblin');
    expect(result.data.ac).toBe(15);
    expect(result.data.hp).toBe(7);
    expect(result.data.movement).toContain('30');
    expect(result.confidence).toBeGreaterThan(0.5);
  });

  it('should extract attacks with bonus and damage', () => {
    const statBlock = `
Orc
AC 13, HP 15

Melee Attack: Greataxe +5 to hit, 1d12+3 slashing damage
Ranged Attack: Javelin +5 to hit, 1d6+3 piercing damage
    `;

    const result = parseStatBlock(statBlock);
    
    expect(result.data.attacks).toBeDefined();
    expect(result.data.attacks!.length).toBeGreaterThan(0);
  });

  it('should provide warnings for missing fields', () => {
    const result = parseStatBlock('Just a name');
    
    expect(result.warnings).toContain('Could not extract AC');
    expect(result.warnings).toContain('Could not extract HP');
  });

  it('should have low confidence for minimal input', () => {
    const result = parseStatBlock('Just a name');
    expect(result.confidence).toBeLessThan(0.5);
  });

  it('should handle OSE/BX style stat blocks', () => {
    const statBlock = `
Skeleton
AC 7, HD 1, Att 1 × weapon (1d6), MV 60' (20')
    `;

    const result = parseStatBlock(statBlock, 'bx');
    expect(result.data.name).toBe('Skeleton');
    expect(result.data.ac).toBeDefined();
  });
});

describe('createEmptyParsedData', () => {
  it('should return a valid empty structure', () => {
    const data = createEmptyParsedData();
    
    expect(data.name).toBe('');
    expect(data.ac).toBeUndefined();
    expect(data.hp).toBeUndefined();
    expect(data.movement).toBe('30 ft');
    expect(data.attacks).toEqual([]);
    expect(data.abilities).toEqual([]);
    expect(data.specialActions).toEqual([]);
    expect(data.system).toBe('other');
  });
});
