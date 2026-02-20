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
  const warnings: string[] = [];
  const data: ParsedCreatureData = {
    system: systemHint,
  };

  if (!text.trim()) {
    return { success: false, data, confidence: 0, warnings: ['Empty text provided'] };
  }

  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  
  if (lines.length > 0) {
    data.name = extractName(lines[0]);
  }

  data.ac = extractAC(text);
  if (!data.ac) warnings.push('Could not extract AC');

  data.hp = extractHP(text);
  if (!data.hp) warnings.push('Could not extract HP');

  data.movement = extractMovement(text);
  if (!data.movement) {
    data.movement = '30 ft';
    warnings.push('Could not extract movement, using default');
  }

  data.attacks = extractAttacks(text);
  if (data.attacks.length === 0) warnings.push('Could not extract attacks');

  data.cr = extractCR(text);
  data.level = extractLevel(text, data.cr);

  data.specialActions = extractSpecialActions(text);

  data.saves = extractSaves(text);

  const confidence = calculateConfidence(data);

  return {
    success: confidence > 0.3,
    data,
    confidence,
    warnings,
  };
}

function extractName(firstLine: string): string {
  return firstLine
    .replace(/^#+\s*/, '')
    .replace(/\s*\([^)]+\)\s*$/, '')
    .replace(/^\*+|\*+$/g, '')
    .trim() || 'Unknown Creature';
}

function extractAC(text: string): number | undefined {
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

function extractHP(text: string): number | undefined {
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

function extractMovement(text: string): string | undefined {
  const patterns = [
    /Speed\s*[:=]?\s*([\d\w\s,]+(?:ft\.?|feet|'))/i,
    /Movement\s*[:=]?\s*([\d\w\s,]+(?:ft\.?|feet|'))/i,
    /Move\s*[:=]?\s*(\d+(?:\s*(?:ft\.?|feet|'))?)/i,
    /(\d+)\s*(?:ft\.?|feet|')\s*(?:speed|move|movement)/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      let movement = match[1].trim();
      if (/^\d+$/.test(movement)) {
        movement += ' ft';
      }
      return movement;
    }
  }

  return undefined;
}

function extractAttacks(text: string): Attack[] {
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

function extractLevel(text: string, cr?: string): number | undefined {
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

  return undefined;
}

function extractSpecialActions(text: string): SpecialAction[] {
  const actions: SpecialAction[] = [];

  const actionPatterns = [
    /\*\*([^*]+)\*\*\s*(?:\(([^)]+)\))?\s*[.:]?\s*([^*\n]+(?:\n(?![*\n])[^\n]+)*)/g,
    /^([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s*(?:\(([^)]+)\))?[.:]?\s+(.+)$/gm,
  ];

  const rechargePattern = /Recharge\s*(\d+[-–]\d+|\d+)/i;

  for (const pattern of actionPatterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const name = match[1]?.trim();
      const parenthetical = match[2]?.trim();
      const description = match[3]?.trim();

      if (!name || name.length > 50) continue;
      if (isCommonHeader(name)) continue;

      const rechargeMatch = parenthetical?.match(rechargePattern) || description?.match(rechargePattern);

      actions.push({
        name,
        description: description || '',
        recharge: rechargeMatch ? `Recharge ${rechargeMatch[1]}` : undefined,
      });
    }
  }

  return actions.slice(0, 5);
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
  const savePatterns = [
    /Saving\s*Throws?\s*[:=]?\s*([A-Za-z\s+,\d-]+)/i,
    /Saves?\s*[:=]?\s*([A-Za-z\s+,\d-]+)/i,
  ];

  for (const pattern of savePatterns) {
    const match = text.match(pattern);
    if (match) {
      return match[1].trim().slice(0, 100);
    }
  }

  return undefined;
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
    system: 'other',
  };
}
