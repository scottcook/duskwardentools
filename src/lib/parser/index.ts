import type { ParsedCreatureData, Attack, SpecialAction, SourceSystem } from '@/types';

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
      data = parseOldSchoolStatBlock(text, lines, systemHint);
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

  // Standard 5e format: "Scimitar. Melee Weapon Attack: +4 to hit, reach 5 ft., one target. Hit: 5 (1d6 + 2) slashing damage."
  const standard5ePattern = /([A-Z][a-z]+(?:\s+[A-Za-z]+)?)\.\s*(?:Melee|Ranged)\s*(?:Weapon\s*)?Attack:\s*\+?(\d+)\s*to\s*hit[^.]*\.\s*Hit:\s*\d+\s*\(([^)]+)\)\s*(\w+)\s*damage/gi;
  
  while ((match = standard5ePattern.exec(text)) !== null) {
    const name = match[1].trim();
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
    const genericPattern = /(\w+(?:\s+\w+)?)[.:]?\s*(?:Melee|Ranged)?\s*(?:Weapon\s*)?Attack[:\s]*([+-]\d+)\s*to\s*hit[^.]*?Hit[:\s]+\d+\s*\(([^)]+)\)/gi;
    while ((match = genericPattern.exec(text)) !== null) {
      const name = match[1].trim();
      const bonus = parseInt(match[2], 10);
      const damage = match[3].replace(/\s+/g, '');
      
      if (!attacks.some(a => a.name.toLowerCase() === name.toLowerCase())) {
        attacks.push({ name, bonus, damage });
      }
    }
  }

  // Fallback: look for common weapon names
  if (attacks.length === 0) {
    const simplePattern = /\b(scimitar|longsword|shortbow|longbow|claw|bite|slam|sword|dagger|staff|bow|crossbow|fist|tentacle|gore|sting|mace|spear|axe|hammer|greataxe|javelin)\b/gi;
    while ((match = simplePattern.exec(text)) !== null) {
      const name = match[1].charAt(0).toUpperCase() + match[1].slice(1);
      if (!attacks.some(a => a.name.toLowerCase() === name.toLowerCase())) {
        attacks.push({ name });
      }
    }
  }

  return attacks.slice(0, 5);
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
    if (/^(?:save|saves|saving throws?|save as|armor class|armour class|hit dice|movement|move|morale|thac0)$/i.test(name)) continue;
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
  const data: ParsedCreatureData = {
    system: systemHint,
    name: lines.length > 0 ? extractName(lines[0]) : undefined,
    ac: extractModernAC(text),
    hp: extractModernHP(text),
    movement: extractModernMovement(text),
    attacks: extractModernAttacks(text),
    cr: extractCR(text),
    saves: extractSaves(text),
    specialActions: extractSpecialActions(text),
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
  };

  if (!data.attacks?.length) {
    data.attacks = extractModernAttacks(text);
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
