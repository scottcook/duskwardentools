import type { ParsedCreatureData, Attack, Ability, SpecialAction, SourceSystem } from '@/types';

interface ParserResult {
  success: boolean;
  data: ParsedCreatureData;
  confidence: number;
  warnings: string[];
}

export function parseStatBlock(
  text: string,
  systemHint?: SourceSystem
): ParserResult {
  if (!text.trim()) {
    return {
      success: false,
      data: { system: systemHint },
      confidence: 0,
      warnings: ['Empty text provided'],
    };
  }

  const lines = getLines(text);
  const warnings: string[] = [];

  let data: ParsedCreatureData;
  switch (systemHint) {
    case '5e':
      data = parseModernStatBlock(text, lines, systemHint);
      break;
    case 'bx':
    case 'ose':
    case 'bfrpg':
      data = parseOldSchoolStatBlock(text, lines, systemHint);
      break;
    case 'cairn':
      data = parseCairnStatBlock(text, lines);
      break;
    case 'adnd1e':
      data = parseAdnd1eStatBlock(text, lines);
      break;
    default:
      data = parseGenericStatBlock(text, lines, systemHint);
      break;
  }

  data.system = systemHint ?? data.system ?? 'other';

  if (!data.ac) warnings.push('Could not extract AC');
  if (!data.hp) warnings.push('Could not extract HP');
  if (!data.movement) {
    data.movement = '30 ft';
    warnings.push('Could not extract movement, using default');
  }
  if (!data.attacks || data.attacks.length === 0) {
    data.attacks = [];
    warnings.push('Could not extract attacks');
  }
  if (!data.specialActions) data.specialActions = [];

  const confidence = calculateConfidence(data);

  return {
    success: confidence > 0.3,
    data,
    confidence,
    warnings,
  };
}

function getLines(text: string): string[] {
  return text.split('\n').map((line) => line.trim()).filter(Boolean);
}

function extractName(firstLine: string): string {
  return firstLine
    .replace(/^#+\s*/, '')
    .replace(/\s*\([^)]+\)\s*$/, '')
    .replace(/^\*+|\*+$/g, '')
    .trim() || 'Unknown Creature';
}

function extractModernAC(text: string): number | undefined {
  const patterns = [
    /AC\s*[:=]?\s*(\d+)/i,
    /Armor\s*Class\s*[:=]?\s*(\d+)/i,
    /\bAC\s+(\d+)/i,
    /Defense\s*[:=]?\s*(\d+)/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      const ac = parseInt(match[1], 10);
      if (ac >= 0 && ac <= 30) return ac;
    }
  }

  return undefined;
}

function extractOldSchoolAC(text: string): number | undefined {
  const match = text.match(/\b(?:AC|Armou?r\s*Class)\s*[:=]?\s*(-?\d+)(?:\s*\[\s*(\d+)\s*\])?/i);
  if (!match) return undefined;

  const descendingAc = parseInt(match[1], 10);
  const ascendingAc = match[2] ? parseInt(match[2], 10) : undefined;

  if (ascendingAc !== undefined) return ascendingAc;
  if (descendingAc <= 9) return 19 - descendingAc;
  return descendingAc;
}

function extractModernHP(text: string): number | undefined {
  const patterns = [
    /HP\s*[:=]?\s*(\d+)/i,
    /Hit\s*Points?\s*[:=]?\s*(\d+)/i,
    /(\d+)\s*(?:hit\s*points?|hp)/i,
    /HD\s*[:=]?\s*(\d+)d/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      const hp = parseInt(match[1], 10);
      if (hp > 0 && hp <= 1000) return hp;
    }
  }

  const hdMatch = text.match(/(\d+)d(\d+)/);
  if (hdMatch) {
    const dice = parseInt(hdMatch[1], 10);
    const sides = parseInt(hdMatch[2], 10);
    return Math.floor(dice * ((sides + 1) / 2));
  }

  return undefined;
}

function normalizeMovement(value: string): string {
  return value
    .replace(/'/g, ' ft')
    .replace(/\s+/g, ' ')
    .replace(/\s*,\s*/g, ', ')
    .trim();
}

function extractModernMovement(text: string): string | undefined {
  const patterns = [
    /Speed\s*[:=]?\s*([^\n]+)/i,
    /Movement\s*[:=]?\s*([^\n]+)/i,
    /Move\s*[:=]?\s*([^\n]+)/i,
    /(\d+\s*(?:ft\.?|feet|'))\s*(?:speed|move|movement)/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      let movement = normalizeMovement(match[1].trim());
      if (/^\d+$/.test(movement)) {
        movement += ' ft';
      }
      return movement;
    }
  }

  return undefined;
}

function extractOldSchoolMovement(text: string): string | undefined {
  const match = text.match(/\b(?:MV|Movement|Move)\s*[:=]?\s*([^\n]+)/i);
  return match ? normalizeMovement(match[1]) : undefined;
}

function extractModernAttacks(text: string): Attack[] {
  const attacks: Attack[] = [];
  let match;

  // Standard 5e: "Greatsword. Melee Weapon Attack: +5 to hit, reach 5 ft., one target. Hit: 10 (2d6 + 3) slashing damage."
  // Uses .*? (lazy, same-line) so periods in "5 ft." don't break the match.
  const standard5ePattern = /([A-Z][A-Za-z]+(?:[- ]+[A-Za-z]+)*)\.\s*(?:Melee|Ranged)\s*(?:Weapon\s*)?Attack:\s*\+?(\d+)\s*to\s*hit.*?Hit:\s*\d+\s*\(([^)]+)\)\s*(\w+)\s*damage/gi;

  while ((match = standard5ePattern.exec(text)) !== null) {
    const name = match[1].trim();
    if (/^multiattack$/i.test(name)) continue;
    const bonus = parseInt(match[2], 10);
    const diceExpression = match[3].replace(/\s+/g, '');
    const damageType = match[4];

    if (!attacks.some(a => a.name.toLowerCase() === name.toLowerCase())) {
      attacks.push({
        name,
        bonus,
        damage: `${diceExpression} ${damageType}`,
      });
    }
  }

  // Simplified format: "Melee Attack: Greataxe +5 to hit, 1d12+3 slashing damage"
  if (attacks.length === 0) {
    const simpleFormatPattern = /(?:Melee|Ranged)\s*Attack:\s*([A-Za-z]+(?:\s+[A-Za-z]+)?)\s*([+-]\d+)\s*to\s*hit[,\s]+(\d+d\d+(?:\s*[+-]\s*\d+)?)\s*(\w+)?\s*damage/gi;
    while ((match = simpleFormatPattern.exec(text)) !== null) {
      const name = match[1].trim();
      const bonus = parseInt(match[2], 10);
      const damage = match[3].replace(/\s+/g, '') + (match[4] ? ` ${match[4]}` : '');

      if (!attacks.some(a => a.name.toLowerCase() === name.toLowerCase())) {
        attacks.push({ name, bonus, damage });
      }
    }
  }

  // Alternative pattern: "Attack Name (+4): 1d6+2 damage"
  if (attacks.length === 0) {
    const altPattern = /([A-Z][a-z]+(?:\s+[A-Za-z]+)?)\s*\(([+-]?\d+)\)[:\s]+(\d+d\d+(?:\s*[+-]\s*\d+)?)/gi;
    while ((match = altPattern.exec(text)) !== null) {
      const name = match[1].trim();
      const bonus = parseInt(match[2], 10);
      const damage = match[3].replace(/\s+/g, '');

      if (!attacks.some(a => a.name.toLowerCase() === name.toLowerCase())) {
        attacks.push({ name, bonus, damage });
      }
    }
  }

  // Generic pattern: look for "+X to hit" with damage
  if (attacks.length === 0) {
    const genericPattern = /(\w+(?:\s+\w+)?)[.:]?\s*(?:Melee|Ranged)?\s*(?:Weapon\s*)?Attack[:\s]*([+-]\d+)\s*to\s*hit.*?Hit[:\s]+\d+\s*\(([^)]+)\)/gi;
    while ((match = genericPattern.exec(text)) !== null) {
      const name = match[1].trim();
      if (/^multiattack$/i.test(name)) continue;
      const bonus = parseInt(match[2], 10);
      const damage = match[3].replace(/\s+/g, '');

      if (!attacks.some(a => a.name.toLowerCase() === name.toLowerCase())) {
        attacks.push({ name, bonus, damage });
      }
    }
  }

  // Fallback: look for common weapon names
  if (attacks.length === 0) {
    const simplePattern = /\b(scimitar|longsword|shortsword|greatsword|shortbow|longbow|claw|bite|slam|sword|dagger|staff|bow|crossbow|fist|tentacle|gore|sting|mace|spear|axe|hammer|greataxe|battleaxe|javelin|rapier|flail|halberd|pike|trident|morningstar|glaive|maul|warhammer)\b/gi;
    while ((match = simplePattern.exec(text)) !== null) {
      const name = match[1].charAt(0).toUpperCase() + match[1].slice(1);
      if (!attacks.some(a => a.name.toLowerCase() === name.toLowerCase())) {
        attacks.push({ name });
      }
    }
  }

  return attacks.slice(0, 5);
}

const MULTIATTACK_WORD_MAP: Record<string, number> = {
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6,
  '1': 1, '2': 2, '3': 3, '4': 4, '5': 5, '6': 6,
};

function extractMultiattackCount(specialActions: SpecialAction[]): number | undefined {
  const multiattack = specialActions.find(
    a => a.name.toLowerCase() === 'multiattack',
  );
  if (!multiattack) return undefined;

  const desc = multiattack.description;

  // "makes two melee attacks", "makes three attacks", "makes two longsword attacks"
  const makesMatch = desc.match(
    /makes?\s+(\w+)\s+(?:\w+\s+){0,3}attacks?\b/i,
  );
  if (makesMatch) {
    const count = MULTIATTACK_WORD_MAP[makesMatch[1].toLowerCase()];
    if (count) return count;
  }

  // "attacks twice" / "attacks three times"
  const timesMatch = desc.match(/attacks?\s+(twice|thrice|two|three|four|five|six|\d+)\s*(?:times?)?\b/i);
  if (timesMatch) {
    const wordMap: Record<string, number> = { ...MULTIATTACK_WORD_MAP, twice: 2, thrice: 3 };
    const count = wordMap[timesMatch[1].toLowerCase()];
    if (count) return count;
  }

  // Compound: "one bite attack and two claw attacks" → sum them
  const compoundParts = desc.match(
    /(\w+)\s+(?:\w+\s+)?attacks?\s+and\s+(\w+)\s+(?:\w+\s+)?attacks?/i,
  );
  if (compoundParts) {
    const a = MULTIATTACK_WORD_MAP[compoundParts[1].toLowerCase()] ?? 0;
    const b = MULTIATTACK_WORD_MAP[compoundParts[2].toLowerCase()] ?? 0;
    if (a + b > 1) return a + b;
  }

  return undefined;
}

function extractTHAC0(text: string): { thac0?: number; attackBonus?: number } {
  const match = text.match(/\bTHAC0\s*[:=]?\s*(\d+)(?:\s*\[\s*([+-]?\d+)\s*\])?/i);
  if (!match) return {};

  const thac0 = parseInt(match[1], 10);
  const attackBonus = match[2] ? parseInt(match[2], 10) : 19 - thac0;
  return { thac0, attackBonus };
}

function extractHitDice(text: string): { notation?: string; averageHp?: number } {
  const match = text.match(/\b(?:HD|Hit\s*Dice)\s*[:=]?\s*(1\/2|½|\d+(?:[+-]\d+)?|\d+-\d+)(?:\*+)?(?:\s*\((\d+)\s*hp?\))?/i);
  if (!match) return {};

  return {
    notation: match[1],
    averageHp: match[2] ? parseInt(match[2], 10) : undefined,
  };
}

function hitDiceToLevel(notation?: string): number | undefined {
  if (!notation) return undefined;
  if (notation === '1/2' || notation === '½') return 1;

  const dice = parseInt(notation.split(/[+-]/)[0].split('-')[0], 10);
  return Number.isNaN(dice) ? undefined : Math.max(1, dice);
}

function averageHpFromHitDice(notation?: string): number | undefined {
  if (!notation) return undefined;
  if (notation === '1/2' || notation === '½') return 2;

  const baseMatch = notation.match(/^(\d+)/);
  if (!baseMatch) return undefined;

  const dice = parseInt(baseMatch[1], 10);
  let modifier = 0;

  if (notation.includes('+')) {
    modifier = parseInt(notation.split('+')[1], 10);
  } else if (notation.includes('-')) {
    const parts = notation.split('-');
    modifier = parts.length === 2 ? -parseInt(parts[1], 10) : 0;
  }

  return Math.max(1, Math.round(dice * 4.5 + modifier));
}

function deriveOldSchoolAttackBonus(hdNotation?: string): number | undefined {
  if (!hdNotation) return undefined;
  if (hdNotation === '1/2' || hdNotation === '½') return 0;

  const base = parseInt(hdNotation.split(/[+-]/)[0].split('-')[0], 10);
  if (Number.isNaN(base)) return undefined;

  const hasPositiveMod = hdNotation.includes('+');
  const effectiveHd = base + (hasPositiveMod ? 1 : 0);

  if (effectiveHd <= 1) return 0;
  if (effectiveHd <= 2) return 1;
  if (effectiveHd <= 3) return 2;
  if (effectiveHd <= 4) return 3;
  if (effectiveHd <= 5) return 4;
  if (effectiveHd <= 6) return 5;
  if (effectiveHd <= 7) return 6;
  if (effectiveHd <= 9) return 7;
  if (effectiveHd <= 11) return 8;
  if (effectiveHd <= 13) return 9;
  if (effectiveHd <= 15) return 10;
  if (effectiveHd <= 17) return 11;
  if (effectiveHd <= 19) return 12;
  if (effectiveHd <= 21) return 13;
  return 14;
}

function normalizeAttackName(name: string): string {
  return name
    .replace(/\bweapon\b/i, 'Weapon')
    .replace(/\battacks?\b/i, 'Attack')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^\w/, (char) => char.toUpperCase());
}

function extractOldSchoolAttacks(text: string, attackBonus?: number): Attack[] {
  const lineMatch = text.match(/\b(?:Attacks?|Att)\s*[:=]?\s*([^\n]+)/i);
  if (!lineMatch) return [];

  const line = lineMatch[1];
  const attacks: Attack[] = [];
  const attackPattern = /(?:(\d+)\s*(?:x|\u00d7)\s*)?([A-Za-z][A-Za-z\s/-]*)\s*\(([^)]+)\)/gi;
  let match: RegExpExecArray | null;

  while ((match = attackPattern.exec(line)) !== null) {
    const count = match[1] ? parseInt(match[1], 10) : 1;
    const name = normalizeAttackName(match[2]);
    const damage = match[3].replace(/\s+/g, '');

    for (let i = 0; i < count; i += 1) {
      attacks.push({
        name,
        bonus: attackBonus,
        damage,
      });
    }
  }

  return attacks.slice(0, 5);
}

function extractCR(text: string): string | undefined {
  const patterns = [
    /CR\s*[:=]?\s*(\d+(?:\/\d+)?)/i,
    /Challenge\s*(?:Rating)?\s*[:=]?\s*(\d+(?:\/\d+)?)/i,
    /Level\s*[:=]?\s*(\d+)/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      return match[1];
    }
  }

  return undefined;
}

function extractLevel(text: string, cr?: string, hdNotation?: string): number | undefined {
  if (cr) {
    if (cr.includes('/')) {
      const [num, denom] = cr.split('/').map(n => parseInt(n.trim(), 10));
      if (denom > 0) {
        const fractionCR = num / denom;
        if (fractionCR <= 0.125) return 0;
        if (fractionCR <= 0.25) return 0;
        if (fractionCR <= 0.5) return 1;
      }
      return 1;
    }
    return parseInt(cr, 10);
  }

  const levelMatch = text.match(/Level\s*[:=]?\s*(\d+)/i);
  if (levelMatch) {
    return parseInt(levelMatch[1], 10);
  }

  const hdMatch = text.match(/(\d+)\s*HD/i);
  if (hdMatch) {
    return parseInt(hdMatch[1], 10);
  }

  const hdLevel = hitDiceToLevel(hdNotation);
  if (hdLevel !== undefined) return hdLevel;

  return undefined;
}

/**
 * Extract flavor / physical description from lines that don't match stat patterns.
 * Works best for OSE, B/X, and Cairn where a short description sentence follows
 * (or precedes) the stat table.
 */
function extractDescription(lines: string[]): string | undefined {
  const STAT_LINE_RE = /^(?:AC|Armor|Armour|HP|Hit|Speed|Move|MV|STR|DEX|CON|INT|WIS|CHA|WIL|CR|Challenge|Skills|Senses|Languages|Saving|Save|THAC0|HD|Att|ML|Morale|AL|XP|No\.|Treasure|Frequency|Number|Size|Alignment|Damage|Special|Magic|Psionic|%\s*In)/i;
  const SECTION_RE = /^(?:Actions|Reactions|Traits|Legendary|Lair|Bonus|Abilities)$/i;
  const ABILITY_LINE_RE = /^[A-Z][A-Za-z' -]{1,40}[.:]\s+.+/;
  const STAT_INLINE_RE = /\b(?:\d+d\d+|\+\d+\s*to\s*hit|AC\s*\d|HP\s*\d|THAC0|Save\s+As|Saving\s+Throws)\b/i;

  const candidates: string[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (line.length < 15) continue;
    if (STAT_LINE_RE.test(line)) continue;
    if (SECTION_RE.test(line)) continue;
    if (ABILITY_LINE_RE.test(line)) continue;
    if (STAT_INLINE_RE.test(line)) continue;
    if (/^\d+\s*(?:[\(\[]|$)/.test(line)) continue;
    if (/^[-–—*•]/.test(line)) {
      candidates.push(line.replace(/^[-–—*•]\s*/, ''));
      continue;
    }
    if (/^[A-Z]/.test(line) || /^[a-z]/.test(line)) {
      candidates.push(line);
    }
  }

  const desc = candidates
    .filter(l => /[a-z]/.test(l) && l.length >= 15)
    .join(' ')
    .trim();

  return desc.length >= 15 ? desc : undefined;
}

function isSectionHeader(line: string): boolean {
  return /^(actions|reactions|bonus actions|legendary actions|lair actions|traits?)$/i.test(line);
}

function isActionLikeLine(line: string): boolean {
  return /^[A-Z][A-Za-z' -]{1,40}[.:]\s+.+/.test(line);
}

function extractSpecialActions(text: string): SpecialAction[] {
  const actions: SpecialAction[] = [];

  let section: 'traits' | 'actions' | 'reactions' | 'other' = 'traits';

  for (const line of getLines(text)) {
    if (isSectionHeader(line)) {
      if (/^actions$/i.test(line)) section = 'actions';
      else if (/^reactions$/i.test(line)) section = 'reactions';
      else section = 'other';
      continue;
    }

    if (!isActionLikeLine(line)) continue;

    const match = line.match(/^([A-Z][A-Za-z' -]{1,40})[.:]\s+(.+)$/);
    if (!match) continue;

    const name = match[1].trim();
    const description = match[2].trim();

    if (isCommonHeader(name)) continue;
    if (/^(?:save|saves|saving throws?|save as|armor class|armour class|hit dice|hit points?|movement|move|morale|thac0|damage|treasure type|frequency|xp|alignment|size|no|intelligence|psionic ability|magic resistance|special attacks?|special defenses?)$/i.test(name)) continue;
    if (name.length < 3) continue;
    if (/(?:attack:|\+\d+\s*to\s*hit)/i.test(description) && section === 'actions') continue;

    const rechargeMatch = description.match(/Recharge\s*(\d+[-–]\d+|\d+)/i);
    actions.push({
      name,
      description,
      recharge: rechargeMatch ? `Recharge ${rechargeMatch[1]}` : undefined,
    });

    if (actions.length >= 5) {
      break;
    }
  }

  return actions;
}

/**
 * Extract abilities from unstructured prose paragraphs.
 * Looks for sentences containing common ability keywords (e.g. "regenerat", "immune",
 * "resist", "vulnerab", "paralyz") and groups them into named special actions.
 * Used as a supplement when `extractSpecialActions` finds few/no structured entries.
 */
const PROSE_ABILITY_PATTERNS: { name: string; pattern: RegExp }[] = [
  { name: 'Regeneration', pattern: /\bregenerat\w*/i },
  { name: 'Immunity', pattern: /\bimmun\w+\b/i },
  { name: 'Resistance', pattern: /\bresistan\w+\b/i },
  { name: 'Vulnerability', pattern: /\bvulnerab\w+\b/i },
  { name: 'Paralysis', pattern: /\bparalyz\w*|paralys\w*/i },
  { name: 'Poison', pattern: /\bpoison\w*\b/i },
  { name: 'Petrification', pattern: /\bpetrif\w+\b/i },
  { name: 'Drain', pattern: /\benergy\s+drain|level\s+drain/i },
  { name: 'Charm', pattern: /\bcharm\w*\b/i },
  { name: 'Fear', pattern: /\bfear\b|frightened|cause fear/i },
  { name: 'Swallow', pattern: /\bswallow\w*\b/i },
  { name: 'Web', pattern: /\bweb\b/i },
  { name: 'Breath Weapon', pattern: /\bbreath\s+weapon|breathe\s+fire|breathe\s+lightning/i },
  { name: 'Darkvision', pattern: /\bdarkvision|infravision/i },
  { name: 'Surprise', pattern: /\bsurpris\w+\b.*\b\d+\b/i },
  { name: 'Undead', pattern: /\bundead\b/i },
];

function extractProseAbilities(lines: string[], existingActions: SpecialAction[]): SpecialAction[] {
  const existingNames = new Set(existingActions.map(a => a.name.toLowerCase()));
  const found: SpecialAction[] = [];
  const usedNames = new Set<string>();

  const STAT_LINE_RE = /^(?:AC|Armor|Armour|HP|Hit|Speed|Move|MV|STR|DEX|CON|INT|WIS|CHA|WIL|CR|Challenge|Saving|Save|THAC0|HD|Att|ML|Morale|AL|XP|No\.|Treasure|Frequency|Number|Size|Alignment|Damage|Special|Magic|Psionic|%\s*In)/i;

  for (const line of lines) {
    if (line.length < 30) continue;
    if (STAT_LINE_RE.test(line)) continue;
    if (/^[A-Z][A-Za-z' -]{1,40}[.:]\s+.+/.test(line)) continue;

    for (const { name, pattern } of PROSE_ABILITY_PATTERNS) {
      if (usedNames.has(name)) continue;
      if (existingNames.has(name.toLowerCase())) continue;

      if (pattern.test(line)) {
        const sentences = line.match(/[^.!?]+[.!?]+/g);
        const relevantSentences = sentences?.filter(s => pattern.test(s));
        const description = relevantSentences?.join(' ').trim() || line.trim();
        if (description.length >= 15) {
          found.push({ name, description });
          usedNames.add(name);
        }
      }
    }

    if (found.length >= 3) break;
  }

  return found;
}

function isCommonHeader(text: string): boolean {
  const headers = [
    'actions', 'reactions', 'traits', 'legendary actions', 'lair actions',
    'armor class', 'hit points', 'speed', 'challenge', 'abilities',
    'str', 'dex', 'con', 'int', 'wis', 'cha', 'description',
  ];
  return headers.includes(text.toLowerCase());
}

function extractSaves(text: string): string | undefined {
  let match = text.match(/(?:^|[\n,;])\s*SV\s*[:=]?\s*([^\n,;]+)/i);
  if (match) return match[1].trim().slice(0, 100);

  match = text.match(/(?:^|\n)\s*Saving\s*Throws?\s*[:=]?\s*([^\n]+)/i);
  if (match) return match[1].trim().slice(0, 100);

  match = text.match(/(?:^|[\n,;])\s*Save\s+As\b\s*:?\s*([^\n,;]+)/i);
  if (match) {
    const value = match[1].trim().slice(0, 100);
    return value ? `Save As ${value}` : 'Save As';
  }

  match = text.match(/(?:^|\n)\s*Saves?\s*[:=]?\s*([A-Za-z0-9+,\s-]+)$/im);
  if (match) return match[1].trim().slice(0, 100);

  return undefined;
}

function extractMorale(text: string): number | undefined {
  const match = text.match(/\b(?:ML|Morale)\s*[:=]?\s*(\d+)/i);
  return match ? parseInt(match[1], 10) : undefined;
}

function parseModernStatBlock(
  text: string,
  lines: string[],
  systemHint?: SourceSystem,
): ParsedCreatureData {
  const specialActions = extractSpecialActions(text);

  const data: ParsedCreatureData = {
    system: systemHint,
    name: lines.length > 0 ? extractName(lines[0]) : undefined,
    ac: extractModernAC(text),
    hp: extractModernHP(text),
    movement: extractModernMovement(text),
    attacks: extractModernAttacks(text),
    cr: extractCR(text),
    saves: extractSaves(text),
    specialActions,
    multiattackCount: extractMultiattackCount(specialActions),
    description: extractDescription(lines),
  };

  data.level = extractLevel(text, data.cr);
  return data;
}

function parseOldSchoolStatBlock(
  text: string,
  lines: string[],
  systemHint?: SourceSystem,
): ParsedCreatureData {
  const hitDice = extractHitDice(text);
  const thac0 = extractTHAC0(text);
  const derivedAttackBonus = thac0.attackBonus ?? deriveOldSchoolAttackBonus(hitDice.notation);

  const data: ParsedCreatureData = {
    system: systemHint,
    name: lines.length > 0 ? extractName(lines[0]) : undefined,
    ac: extractOldSchoolAC(text) ?? extractModernAC(text),
    hp: hitDice.averageHp ?? averageHpFromHitDice(hitDice.notation) ?? extractModernHP(text),
    movement: extractOldSchoolMovement(text) ?? extractModernMovement(text),
    attacks: extractOldSchoolAttacks(text, derivedAttackBonus),
    saves: extractSaves(text),
    specialActions: extractSpecialActions(text),
    level: extractLevel(text, extractCR(text), hitDice.notation),
    morale: extractMorale(text),
    thac0: thac0.thac0,
    description: extractDescription(lines),
  };

  if (!data.attacks?.length) {
    data.attacks = extractModernAttacks(text);
  }

  // Supplement with prose-extracted abilities for systems like BFRPG
  if ((data.specialActions?.length ?? 0) < 2) {
    const proseAbilities = extractProseAbilities(lines, data.specialActions ?? []);
    if (proseAbilities.length > 0) {
      data.specialActions = [...(data.specialActions ?? []), ...proseAbilities];
    }
  }

  return data;
}

function fillMissing<T extends object>(target: T, source: Partial<T>): T {
  const next = { ...target };
  for (const [key, value] of Object.entries(source) as Array<[keyof T, T[keyof T]]>) {
    const current = next[key];
    if (
      current === undefined ||
      current === '' ||
      (Array.isArray(current) && current.length === 0)
    ) {
      next[key] = value;
    }
  }
  return next;
}

// ── Cairn parser ──────────────────────────────────────────────────────────────
// Cairn stat blocks: "X HP, Y Armor, Z STR, W DEX, V WIL, attack (dN)" + bullet points

function parseCairnStatBlock(text: string, lines: string[]): ParsedCreatureData {
  const name = lines.length > 0 ? extractName(lines[0]) : undefined;
  const attacks: Attack[] = [];
  const bulletPoints: string[] = [];
  let hp: number | undefined;
  let ac: number | undefined;
  let str: number | undefined;
  let dex: number | undefined;
  let wil: number | undefined;
  let criticalDamage: string | undefined;

  // First non-name line is usually the stat line
  const statLine = lines.find((l, i) => i > 0 && /\d+\s*HP\b/i.test(l)) ?? '';

  const hpMatch = statLine.match(/(\d+)\s*HP\b/i);
  if (hpMatch) hp = parseInt(hpMatch[1], 10);

  const armorMatch = statLine.match(/(\d+)\s*Armor\b/i);
  ac = armorMatch ? 10 + parseInt(armorMatch[1], 10) : 10;

  const strMatch = statLine.match(/(\d+)\s*STR\b/i);
  if (strMatch) str = parseInt(strMatch[1], 10);

  const dexMatch = statLine.match(/(\d+)\s*DEX\b/i);
  if (dexMatch) dex = parseInt(dexMatch[1], 10);

  const wilMatch = statLine.match(/(\d+)\s*WIL\b/i);
  if (wilMatch) wil = parseInt(wilMatch[1], 10);

  // Extract attacks from stat line: "sword (d8)", "claws (d6+d6)", "bite (d10, blast)"
  const atkPattern = /(\w+(?:\s+\w+)?)\s*\(\s*(d\d+(?:\+d\d+)?(?:\s*,\s*[^)]+)?)\s*\)/gi;
  let atkMatch;
  while ((atkMatch = atkPattern.exec(statLine)) !== null) {
    const atkName = atkMatch[1].trim();
    if (/^(?:HP|STR|DEX|WIL|Armor)$/i.test(atkName)) continue;
    attacks.push({ name: atkName, damage: atkMatch[2].trim() });
  }

  // Collect bullet points and look for Critical Damage
  for (const line of lines) {
    const stripped = line.replace(/^[-–—*•]\s*/, '').trim();
    if (/^\*?\*?Critical\s*Damage\b\*?\*?[:\s]/i.test(stripped)) {
      criticalDamage = stripped.replace(/^\*?\*?Critical\s*Damage\b\*?\*?[:\s]*/i, '').trim();
      continue;
    }
    if (/^[-–—*•]/.test(line) && stripped.length > 10) {
      bulletPoints.push(stripped);
    }
  }

  const specialActions: SpecialAction[] = [];
  if (criticalDamage) {
    specialActions.push({ name: 'Critical Damage', description: criticalDamage });
  }

  const description = bulletPoints.length > 0 ? bulletPoints.join(' ') : undefined;

  const abilities: Ability[] = [];
  if (str !== undefined) abilities.push({ name: 'STR', modifier: Math.floor((str - 10) / 2) });
  if (dex !== undefined) abilities.push({ name: 'DEX', modifier: Math.floor((dex - 10) / 2) });
  if (wil !== undefined) abilities.push({ name: 'WIL', modifier: Math.floor((wil - 10) / 2) });

  const level = hp != null ? (hp <= 3 ? 1 : hp <= 6 ? 2 : hp <= 10 ? 3 : hp <= 14 ? 4 : 5) : undefined;

  return {
    system: 'cairn',
    name,
    ac,
    hp,
    movement: 'near',
    attacks,
    abilities,
    specialActions,
    level,
    morale: wil != null ? Math.min(12, Math.max(2, Math.round(wil * 12 / 18))) : undefined,
    description,
  };
}

// ── AD&D 1e parser ────────────────────────────────────────────────────────────
// 16-field structured stat blocks with descending AC and movement in inches

function parseAdnd1eStatBlock(text: string, lines: string[]): ParsedCreatureData {
  const name = lines.length > 0 ? extractName(lines[0]) : undefined;

  function fieldVal(pattern: RegExp): string | undefined {
    const m = text.match(pattern);
    return m?.[1]?.trim();
  }

  // AC — descending; convert to ascending (20 - descending)
  const acRaw = fieldVal(/\bARMOR\s*CLASS\b\s*[:=]?\s*(-?\d+)/i)
    ?? fieldVal(/\bAC\b\s*[:=]?\s*(-?\d+)/i);
  const descendingAC = acRaw != null ? parseInt(acRaw, 10) : undefined;
  const ac = descendingAC != null ? 20 - descendingAC : undefined;

  // HD
  const hdRaw = fieldVal(/\bHIT\s*DICE\b\s*[:=]?\s*([\d+/]+)/i)
    ?? fieldVal(/\bHD\b\s*[:=]?\s*([\d+/]+)/i);
  let hp: number | undefined;
  if (hdRaw) {
    const hdNum = parseFloat(hdRaw);
    if (!isNaN(hdNum)) hp = Math.round(hdNum * 4.5);
  }

  // Movement — convert inches to feet (1" = 10 feet for tactical)
  const moveRaw = fieldVal(/\bMOVE\b\s*[:=]?\s*([\d"/ ]+)/i);
  let movement = '30 ft';
  if (moveRaw) {
    const inchMatch = moveRaw.match(/(\d+)"/);
    if (inchMatch) {
      const feet = parseInt(inchMatch[1], 10) * 10;
      movement = `${feet} ft`;
    }
    const flyMatch = moveRaw.match(/\/\s*(\d+)"/);
    if (flyMatch) {
      const flyFeet = parseInt(flyMatch[1], 10) * 10;
      movement += `, fly ${flyFeet} ft`;
    }
  }

  // Attacks
  const numAtk = parseInt(fieldVal(/\bNO\.?\s*OF\s*ATTACKS?\b\s*[:=]?\s*(\d+)/i) ?? '1', 10);
  const dmgRaw = fieldVal(/\bDAMAGE\s*\/\s*ATTACK\b\s*[:=]?\s*(.+)/i);
  const attacks: Attack[] = [];
  if (dmgRaw) {
    const dmgParts = dmgRaw.split(/\s*\/\s*/);
    for (let i = 0; i < Math.min(numAtk, dmgParts.length); i++) {
      attacks.push({ name: `Attack ${i + 1}`, damage: dmgParts[i].trim() });
    }
  }
  if (attacks.length === 0 && numAtk > 0) {
    attacks.push({ name: 'Attack', damage: '1d6' });
  }

  // Special attacks/defenses as special actions
  const specialActions: SpecialAction[] = [];
  const specialAtk = fieldVal(/\bSPECIAL\s*ATTACKS?\b\s*[:=]?\s*(.+)/i);
  if (specialAtk && !/^nil$/i.test(specialAtk)) {
    specialActions.push({ name: 'Special Attacks', description: specialAtk });
  }
  const specialDef = fieldVal(/\bSPECIAL\s*DEFENSES?\b\s*[:=]?\s*(.+)/i);
  if (specialDef && !/^nil$/i.test(specialDef)) {
    specialActions.push({ name: 'Special Defenses', description: specialDef });
  }

  const magicRes = fieldVal(/\bMAGIC\s*RESISTANCE\b\s*[:=]?\s*(.+)/i);
  if (magicRes && !/^(?:nil|standard)$/i.test(magicRes)) {
    specialActions.push({ name: 'Magic Resistance', description: magicRes });
  }

  // Level from HD
  const level = hdRaw ? Math.max(1, Math.round(parseFloat(hdRaw))) : undefined;

  const description = extractDescription(lines);

  return {
    system: 'adnd1e',
    name,
    ac,
    hp,
    movement,
    attacks,
    specialActions,
    level,
    description,
  };
}

function parseGenericStatBlock(
  text: string,
  lines: string[],
  systemHint?: SourceSystem,
): ParsedCreatureData {
  const looksOldSchool = /\b(?:HD|MV|THAC0|ML|SV|Att)\b/i.test(text);
  const primary = looksOldSchool
    ? parseOldSchoolStatBlock(text, lines, systemHint)
    : parseModernStatBlock(text, lines, systemHint);
  const fallback = looksOldSchool
    ? parseModernStatBlock(text, lines, systemHint)
    : parseOldSchoolStatBlock(text, lines, systemHint);

  return fillMissing(primary, fallback);
}

function calculateConfidence(data: ParsedCreatureData): number {
  let score = 0;
  const maxScore = 6;

  if (data.name && data.name !== 'Unknown Creature') score += 1;
  if (data.ac !== undefined) score += 1;
  if (data.hp !== undefined) score += 1;
  if (data.movement) score += 0.5;
  if (data.attacks && data.attacks.length > 0) score += 1;
  if (data.cr || data.level !== undefined) score += 0.5;
  if (data.specialActions && data.specialActions.length > 0) score += 0.5;
  if (data.saves) score += 0.5;

  return Math.min(1, score / maxScore);
}

export function createEmptyParsedData(): ParsedCreatureData {
  return {
    name: '',
    ac: undefined,
    hp: undefined,
    movement: '30 ft',
    attacks: [],
    abilities: [],
    saves: undefined,
    specialActions: [],
    cr: undefined,
    level: undefined,
    morale: undefined,
    thac0: undefined,
    system: 'other',
  };
}
