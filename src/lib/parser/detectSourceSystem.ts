import type { SourceSystem } from '@/types';

export type DetectionConfidence = 'low' | 'medium' | 'high';

export interface SourceSystemDetection {
  system: SourceSystem;
  confidence: DetectionConfidence;
  score: number;
  margin: number;
  matchedSignals: string[];
}

interface HeuristicSet {
  system: Exclude<SourceSystem, 'other'>;
  signals: { label: string; pattern: RegExp; weight: number }[];
}

const HEURISTICS: HeuristicSet[] = [
  {
    system: '5e',
    signals: [
      { label: 'Armor Class', pattern: /\bArmor\s*Class\b/i, weight: 3 },
      { label: 'Hit Points', pattern: /\bHit\s*Points?\b/i, weight: 3 },
      { label: 'Challenge Rating', pattern: /\bChallenge(?:\s*Rating)?\b/i, weight: 3 },
      { label: 'Weapon Attack syntax', pattern: /\b(?:Melee|Ranged)\s+(?:Weapon\s+)?Attack:/i, weight: 3 },
      { label: 'Actions section', pattern: /^Actions$/im, weight: 2 },
      { label: 'Reactions section', pattern: /^Reactions$/im, weight: 2 },
      { label: 'Skills line', pattern: /\bSkills\b/i, weight: 1 },
      { label: 'Senses line', pattern: /\bSenses\b/i, weight: 1 },
      { label: 'Languages line', pattern: /\bLanguages\b/i, weight: 1 },
      { label: 'Passive Perception', pattern: /\bpassive\s+Perception\b/i, weight: 1 },
    ],
  },
  {
    system: 'ose',
    signals: [
      { label: 'THAC0', pattern: /\bTHAC0\b/i, weight: 3 },
      { label: 'Armour Class wording', pattern: /\bArmour\s*Class\b/i, weight: 3 },
      { label: 'Saving Throws wording', pattern: /\bSaving\s*Throws\b/i, weight: 3 },
      { label: 'Number Appearing wording', pattern: /\bNumber\s*Appearing\b/i, weight: 2 },
      { label: 'Treasure Type wording', pattern: /\bTreasure\s*Type\b/i, weight: 2 },
      { label: 'Movement abbreviation', pattern: /\bMV\b/i, weight: 2 },
      { label: 'Morale abbreviation', pattern: /\bML\b/i, weight: 2 },
      { label: 'Save abbreviation', pattern: /\bSV\b/i, weight: 2 },
      { label: 'Hit Dice abbreviation', pattern: /\bHD\b/i, weight: 1 },
      { label: 'Ascending AC in brackets', pattern: /\bAC\s*[:=]?\s*-?\d+\s*\[\s*\d+\s*\]/i, weight: 2 },
      { label: 'Attack abbreviation', pattern: /\bAtt\s*[:=]?\s*\d+\s*(?:x|×)\s*/i, weight: 2 },
      { label: 'Alignment abbreviation', pattern: /\bAL\b/i, weight: 1 },
    ],
  },
  {
    system: 'bx',
    signals: [
      { label: 'No. Appearing', pattern: /\bNo\.\s*Appearing\b/i, weight: 3 },
      { label: 'Save As', pattern: /\bSave\s+As\b/i, weight: 4 },
      { label: 'Move wording', pattern: /\bMove\b\s*[:=]?\s*\d+/i, weight: 2 },
      { label: 'AC with bracket notation', pattern: /\bAC\s*[:=]?\s*-?\d+\s*\[\s*\d+\s*\]/i, weight: 2 },
      { label: 'Morale wording', pattern: /\bMorale\b/i, weight: 1 },
      { label: 'HD abbreviation', pattern: /\bHD\b/i, weight: 1 },
      { label: 'Attacks wording', pattern: /\bAttacks?\b\s*[:=]?\s*\d+/i, weight: 1 },
    ],
  },
  {
    system: 'bfrpg',
    signals: [
      { label: 'Save As', pattern: /\bSave\s+As\b/i, weight: 4 },
      { label: 'No. of Attacks', pattern: /\bNo\.\s*of\s*Attacks?\b/i, weight: 3 },
      { label: 'Ascending AC without brackets', pattern: /\bArmor\s*Class\s*[:=]?\s*\d+(?:\s*\(\d+\))?/i, weight: 2 },
      { label: 'Movement in feet', pattern: /\bMovement\b\s*[:=]?\s*\d+'/i, weight: 2 },
      { label: 'XP explicit', pattern: /\bXP\b\s*[:=]?\s*[\d,]+/i, weight: 2 },
      { label: 'Morale wording', pattern: /\bMorale\b/i, weight: 1 },
      { label: 'Treasure Type', pattern: /\bTreasure\s*Type\b/i, weight: 1 },
      { label: 'HD abbreviation', pattern: /\bHit\s*Dice\b/i, weight: 1 },
    ],
  },
  {
    system: 'cairn',
    signals: [
      { label: 'HP + STR/DEX/WIL in one line', pattern: /\d+\s*HP\b.*\b(?:STR|DEX|WIL)\b/i, weight: 5 },
      { label: 'WIL ability', pattern: /\bWIL\b/i, weight: 3 },
      { label: 'Critical Damage', pattern: /\bCritical\s*Damage\b/i, weight: 4 },
      { label: 'Cairn-style Armor', pattern: /\d+\s*Armor\b/i, weight: 2 },
      { label: 'Damage die in parens', pattern: /\(\s*d\d+\s*\)/i, weight: 1 },
    ],
  },
  {
    system: 'adnd1e',
    signals: [
      { label: 'FREQUENCY field', pattern: /\bFREQUENCY\b\s*[:=]/i, weight: 4 },
      { label: '% IN LAIR field', pattern: /%\s*IN\s*LAIR\b/i, weight: 5 },
      { label: 'TREASURE TYPE field', pattern: /\bTREASURE\s*TYPE\b/i, weight: 3 },
      { label: 'MAGIC RESISTANCE field', pattern: /\bMAGIC\s*RESISTANCE\b/i, weight: 3 },
      { label: 'PSIONIC ABILITY', pattern: /\bPSIONIC\s*ABILITY\b/i, weight: 4 },
      { label: 'SPECIAL ATTACKS field', pattern: /\bSPECIAL\s*ATTACKS?\b\s*[:=]/i, weight: 2 },
      { label: 'SPECIAL DEFENSES field', pattern: /\bSPECIAL\s*DEFENSES?\b\s*[:=]/i, weight: 2 },
      { label: 'NO. OF ATTACKS field', pattern: /\bNO\.\s*OF\s*ATTACKS?\b/i, weight: 2 },
      { label: 'DAMAGE/ATTACK field', pattern: /\bDAMAGE\s*\/\s*ATTACK\b/i, weight: 3 },
      { label: 'Movement in inches', pattern: /\bMOVE\b\s*[:=]?\s*\d+"/i, weight: 3 },
    ],
  },
];

function scoreSystem(text: string, heuristic: HeuristicSet): SourceSystemDetection {
  const matchedSignals = heuristic.signals
    .filter((signal) => signal.pattern.test(text))
    .map((signal) => signal.label);

  const score = heuristic.signals
    .filter((signal) => signal.pattern.test(text))
    .reduce((sum, signal) => sum + signal.weight, 0);

  return {
    system: heuristic.system,
    confidence: 'low',
    score,
    margin: 0,
    matchedSignals,
  };
}

function scoreToConfidence(score: number, margin: number): DetectionConfidence {
  if (score >= 8 && margin >= 3) return 'high';
  if (score >= 4 && margin >= 2) return 'medium';
  return 'low';
}

export function detectSourceSystem(text: string): SourceSystemDetection | null {
  const normalized = text.trim();
  if (normalized.length < 10) return null;

  const scores = HEURISTICS
    .map((heuristic) => scoreSystem(normalized, heuristic))
    .sort((a, b) => b.score - a.score);

  const best = scores[0];
  const runnerUp = scores[1];
  const margin = best.score - (runnerUp?.score ?? 0);

  if (best.score < 3) {
    return {
      system: 'other',
      confidence: 'low',
      score: best.score,
      margin,
      matchedSignals: [],
    };
  }

  return {
    ...best,
    margin,
    confidence: scoreToConfidence(best.score, margin),
  };
}
