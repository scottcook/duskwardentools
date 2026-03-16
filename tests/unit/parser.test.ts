import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseStatBlock, createEmptyParsedData } from '@/lib/parser';

describe('parseStatBlock', () => {
  const goblin5e = readFileSync(join(process.cwd(), 'tests/unit/fixtures/goblin-5e.txt'), 'utf8');
  const skeletonOse = readFileSync(join(process.cwd(), 'tests/unit/fixtures/skeleton-ose.txt'), 'utf8');
  const orcBx = readFileSync(join(process.cwd(), 'tests/unit/fixtures/orc-bx.txt'), 'utf8');

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
    const result = parseStatBlock(goblin5e, '5e');
    
    expect(result.success).toBe(true);
    expect(result.data.name).toBe('Goblin');
    expect(result.data.ac).toBe(15);
    expect(result.data.hp).toBe(7);
    expect(result.data.movement).toContain('30');
    expect(result.data.attacks).toHaveLength(2);
    expect(result.data.specialActions?.[0]?.name).toBe('Nimble Escape');
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

  it('should parse OSE monster conventions from a fixture', () => {
    const result = parseStatBlock(skeletonOse, 'ose');
    expect(result.data.name).toBe('Skeleton');
    expect(result.data.ac).toBe(12);
    expect(result.data.hp).toBe(5);
    expect(result.data.level).toBe(1);
    expect(result.data.attacks?.[0]?.bonus).toBe(0);
    expect(result.data.attacks?.[0]?.damage).toBe('1d6');
    expect(result.data.morale).toBe(12);
    expect(result.data.saves).toContain('F1');
  });

  it('should parse B/X monster conventions from a fixture', () => {
    const result = parseStatBlock(orcBx, 'bx');
    expect(result.data.name).toBe('Orc');
    expect(result.data.ac).toBe(13);
    expect(result.data.hp).toBe(5);
    expect(result.data.attacks?.[0]?.bonus).toBe(0);
    expect(result.data.movement).toContain("90 ft");
    expect(result.data.morale).toBe(8);
  });

  it('should parse full-word OSE stat tables from pasted text', () => {
    const result = parseStatBlock(`Skeleton
Armour Class 7 [12]
Hit Dice 1 (4hp)
Attacks 1 × weapon (1d6 or by weapon)
THAC0 19 [0]
Movement 60' (20')
Saving Throws D12 W13 P14 B15 S16 (1)
Morale 12
Alignment Chaotic
XP 10
Number Appearing 3d4 (3d10)
Treasure Type None
Undead: Make no noise until they attack. Immune to effects that affect living creatures.`, 'ose');

    expect(result.data.ac).toBe(12);
    expect(result.data.hp).toBe(4);
    expect(result.data.movement).toContain('60 ft');
    expect(result.data.attacks?.[0]?.damage).toBe('1d6orbyweapon');
    expect(result.data.saves).toBe('D12 W13 P14 B15 S16 (1)');
    expect(result.data.morale).toBe(12);
    expect(result.data.specialActions?.some((action) => action.name === 'Undead')).toBe(true);
  });

  it('should preserve B/X Save As text instead of truncating it', () => {
    const result = parseStatBlock('Orc\nAC 6 [13], HD 1, Move 120\' (40\'), Attacks 1 weapon (1d6), Save As Fighter: 1, Morale 8', 'bx');

    expect(result.data.saves).toBe('Save As Fighter: 1');
  });

  it('should not parse generic narrative text into saves', () => {
    const result = parseStatBlock(`Bandit
4 HP, 1 Armor, 12 STR, 12 DEX, 9 WIL, short sword (d6) or short bow (d6)
Loyal: When testing Morale, save using the leader's WIL (13). If the leader dies, the others will flee.`, 'other');

    expect(result.data.saves).toBeUndefined();
    expect(result.data.specialActions?.some((action) => action.name === 'Loyal')).toBe(true);
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
    expect(data.morale).toBeUndefined();
    expect(data.thac0).toBeUndefined();
  });
});
