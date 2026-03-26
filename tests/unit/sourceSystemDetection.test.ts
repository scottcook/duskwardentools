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

  it('detects Cairn stat blocks', () => {
    const detection = detectSourceSystem(`Troll
14 HP, 1 Armor, 14 STR, 12 DEX, 4 WIL, claws (d8+d8), club (d10)
- Giant, warty humanoids of flesh and bark.
- **Critical Damage:** They will fully regenerate within 1d4 days.`);

    expect(detection?.system).toBe('cairn');
    expect(['medium', 'high']).toContain(detection?.confidence);
  });

  it('detects AD&D 1e stat blocks', () => {
    const detection = detectSourceSystem(`Orc
FREQUENCY: Common
NO. APPEARING: 30-300
ARMOR CLASS: 6
MOVE: 9"
HIT DICE: 1
% IN LAIR: 35%
TREASURE TYPE: L
NO. OF ATTACKS: 1
DAMAGE/ATTACK: 1-8
SPECIAL ATTACKS: Nil
SPECIAL DEFENSES: Nil
MAGIC RESISTANCE: Standard
PSIONIC ABILITY: Nil`);

    expect(detection?.system).toBe('adnd1e');
    expect(['medium', 'high']).toContain(detection?.confidence);
  });

  it('detects BFRPG stat blocks with Save As', () => {
    const detection = detectSourceSystem(`Troll
Armor Class: 16
Hit Dice: 6+3*
No. of Attacks: 2 claws/1 bite
Damage: 1d6/1d6/1d10
Movement: 40'
Save As: Fighter 6
Morale: 10
Treasure Type: D
XP: 555`);

    expect(detection?.system).toBe('bfrpg');
    expect(['medium', 'high']).toContain(detection?.confidence);
  });

  it('falls back to other when evidence is weak', () => {
    const detection = detectSourceSystem('Cave thing\nFast and mean.');

    expect(detection?.system).toBe('other');
    expect(detection?.confidence).toBe('low');
  });
});
