import { describe, expect, it } from 'vitest';
import { detectSourceSystem } from '@/lib/parser/detectSourceSystem';

describe('detectSourceSystem', () => {
  it('detects 5e stat blocks with high confidence', () => {
    const detection = detectSourceSystem(`Goblin
Armor Class 15
Hit Points 7 (2d6)
Challenge 1/4
Actions
Scimitar. Melee Weapon Attack: +4 to hit, Hit: 5 (1d6 + 2) slashing damage.`);

    expect(detection?.system).toBe('5e');
    expect(detection?.confidence).toBe('high');
  });

  it('detects OSE-style stat blocks as old-school', () => {
    const detection = detectSourceSystem('Skeleton\nAC 7 [12], HD 1, Att 1 x weapon (1d6), THAC0 19 [+0], MV 60\' (20\'), SV F1, ML 12');

    expect(detection?.system).toBe('ose');
    expect(['medium', 'high']).toContain(detection?.confidence);
  });

  it('detects full-word OSE stat tables as OSE instead of B/X', () => {
    const detection = detectSourceSystem(`Skeleton
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
Treasure Type None`);

    expect(detection?.system).toBe('ose');
    expect(['medium', 'high']).toContain(detection?.confidence);
  });

  it('detects Save As wording as B/X', () => {
    const detection = detectSourceSystem('Orc\nAC 6 [13], HD 1, Move 120\' (40\'), Attacks 1 weapon (1d6), Save As Fighter: 1, Morale 8');

    expect(detection?.system).toBe('bx');
    expect(['medium', 'high']).toContain(detection?.confidence);
  });

  it('falls back to other when evidence is weak', () => {
    const detection = detectSourceSystem('Cave thing\nFast and mean.');

    expect(detection?.system).toBe('other');
    expect(detection?.confidence).toBe('low');
  });
});
