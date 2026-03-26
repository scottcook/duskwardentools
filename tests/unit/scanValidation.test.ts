import { describe, expect, it } from 'vitest';
import { normalizeScannedText, validateScannedStatBlock } from '@/lib/parser/scanValidation';

describe('normalizeScannedText', () => {
  it('collapses noisy OCR spacing while preserving line breaks', () => {
    const normalized = normalizeScannedText('Goblin  \r\nAC   15\r\n\r\n\r\nHP  7');

    expect(normalized).toBe('Goblin\nAC 15\n\nHP 7');
  });
});

describe('validateScannedStatBlock', () => {
  it('accepts a well-formed 5e stat block', () => {
    const result = validateScannedStatBlock(`Goblin
Armor Class 15 (leather armor, shield)
Hit Points 7 (2d6)
Speed 30 ft.
Actions
Scimitar. Melee Weapon Attack: +4 to hit, Hit: 5 (1d6 + 2) slashing damage.`);

    expect(result.isRecognized).toBe(true);
    expect(result.detection?.system).toBe('5e');
    expect(result.reasons).toEqual([]);
  });

  it('rejects arbitrary non-stat-block text', () => {
    const result = validateScannedStatBlock('This is a random note from a cookbook page with no monster stats.');

    expect(result.isRecognized).toBe(false);
    expect(result.reasons).toContain('The extracted text does not confidently match a monster stat block.');
    expect(result.reasons).toContain('No Armor Class value could be identified.');
  });
});
