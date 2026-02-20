/**
 * Shared deterministic conversion utilities used by all system packs.
 * These are pure functions with no side-effects.
 */

import type { ParsedCreatureData, Attack } from '@/types';
import type { ConvertOptions, ConvertedStat, SystemPackId, ProvenanceBlock } from './types';

export interface TierStats {
  hpRange: [number, number];
  acRange: [number, number];
  attackBonusRange: [number, number];
  baseDamage: string;
  morale: number;
}

export const TIER_STATS: Record<number, TierStats> = {
  1: { hpRange: [4, 8],    acRange: [10, 11], attackBonusRange: [1, 2],   baseDamage: '1d4',  morale: 7 },
  2: { hpRange: [9, 18],   acRange: [12, 13], attackBonusRange: [3, 4],   baseDamage: '1d6',  morale: 8 },
  3: { hpRange: [19, 35],  acRange: [13, 15], attackBonusRange: [5, 6],   baseDamage: '1d8',  morale: 9 },
  4: { hpRange: [36, 70],  acRange: [15, 17], attackBonusRange: [7, 9],   baseDamage: '1d10', morale: 10 },
  5: { hpRange: [71, 150], acRange: [17, 19], attackBonusRange: [10, 12], baseDamage: '2d6',  morale: 11 },
};

export function levelToTier(level: number): 1 | 2 | 3 | 4 | 5 {
  if (level <= 2) return 1;
  if (level <= 4) return 2;
  if (level <= 7) return 3;
  if (level <= 12) return 4;
  return 5;
}

export function crToLevel(cr: string): number {
  if (cr.includes('/')) return 0;
  return parseInt(cr, 10) || 1;
}

export function inferTierFromStats(parsed: ParsedCreatureData): 1 | 2 | 3 | 4 | 5 {
  const hp = parsed.hp ?? 10;
  if (hp <= 8)  return 1;
  if (hp <= 20) return 2;
  if (hp <= 40) return 3;
  if (hp <= 80) return 4;
  return 5;
}

export function determineThreatTier(
  parsed: ParsedCreatureData,
  options: ConvertOptions
): 1 | 2 | 3 | 4 | 5 {
  if (options.targetLevel !== undefined) return levelToTier(options.targetLevel);
  if (parsed.level !== undefined) return levelToTier(parsed.level);
  if (parsed.cr !== undefined) return levelToTier(crToLevel(parsed.cr));
  return inferTierFromStats(parsed);
}

export function calculateBaseHP(parsed: ParsedCreatureData, tierStats: TierStats): number {
  const [minHp, maxHp] = tierStats.hpRange;
  if (parsed.hp !== undefined) {
    const ratio = parsed.hp / 100;
    const scaled = minHp + ratio * (maxHp - minHp);
    return Math.max(minHp, Math.min(maxHp, Math.round(scaled)));
  }
  return Math.round((minHp + maxHp) / 2);
}

export function calculateAC(parsed: ParsedCreatureData, tierStats: TierStats): number {
  const [minAc, maxAc] = tierStats.acRange;
  if (parsed.ac !== undefined) {
    return Math.max(minAc, Math.min(maxAc + 2, parsed.ac));
  }
  return Math.round((minAc + maxAc) / 2);
}

export function scaleDamage(baseDamage: string, factor: number): string {
  const match = baseDamage.match(/(\d+)d(\d+)(?:\s*([+-])\s*(\d+))?/);
  if (!match) return baseDamage;
  const numDice = parseInt(match[1], 10);
  const dieSize = parseInt(match[2], 10);
  let modifier = 0;
  if (match[3] && match[4]) {
    modifier = parseInt(match[4], 10) * (match[3] === '-' ? -1 : 1);
  }
  const avgPerDie = (dieSize + 1) / 2;
  const baseAvg = numDice * avgPerDie + modifier;
  const targetAvg = baseAvg * factor;
  const newNumDice = Math.max(1, Math.round((targetAvg - modifier) / avgPerDie));
  const remainder = Math.round(targetAvg - newNumDice * avgPerDie);
  if (remainder === 0 || Math.abs(remainder) < 1) return `${newNumDice}d${dieSize}`;
  return `${newNumDice}d${dieSize}${remainder > 0 ? '+' : ''}${remainder}`;
}

export function convertAttacks(
  sourceAttacks: Attack[],
  tierStats: TierStats,
  deadliness: number,
  dmgMultiplier = 1.0
): Attack[] {
  const effective = deadliness * dmgMultiplier;
  const midBonus = Math.round((tierStats.attackBonusRange[0] + tierStats.attackBonusRange[1]) / 2);

  if (sourceAttacks.length === 0) {
    return [{ name: 'Attack', bonus: midBonus, damage: scaleDamage(tierStats.baseDamage, effective) }];
  }
  return sourceAttacks.map(a => ({
    name: a.name,
    bonus: a.bonus ?? midBonus,
    damage: a.damage ? scaleDamage(a.damage, effective) : scaleDamage(tierStats.baseDamage, effective),
    description: a.description,
  }));
}

export function generateDefaultSaves(tier: number): string {
  return `+${tier + 2} vs physical effects`;
}

export function extractTraits(parsed: ParsedCreatureData): string[] {
  const traits: string[] = [];
  if (parsed.movement?.toLowerCase().includes('fly'))  traits.push('Flying');
  if (parsed.movement?.toLowerCase().includes('swim')) traits.push('Aquatic');
  return traits;
}

export function generateLootNotes(tier: number): string {
  const table: Record<number, string> = {
    1: 'Minor trinkets, 1d6 copper',
    2: '2d6 silver, common item',
    3: '1d6 gold, uncommon item chance',
    4: '2d6 gold, uncommon item',
    5: '3d6 gold, rare item chance',
  };
  return table[tier] ?? 'No loot noted';
}

export function buildProvenance(
  packId: SystemPackId,
  displayName: string,
  licenseType: import('./types').LicenseType,
  attributionText?: string
): ProvenanceBlock {
  const DISCLAIMER =
    'Duskwarden Tools is an independent product. Not affiliated with The Arcane Library, LLC, Wizards of the Coast, or any other publisher.';
  return {
    packId,
    packDisplayName: displayName,
    licenseType,
    attributionText,
    disclaimer: DISCLAIMER,
    generatedAt: new Date().toISOString(),
  };
}

/** Build a ConvertedStat skeleton shared across packs */
export function buildConvertedStat(
  parsed: ParsedCreatureData,
  options: ConvertOptions,
  hpMultiplier: number,
  dmgMultiplier: number,
  showMorale: boolean,
  showReaction: boolean,
  packId: SystemPackId,
  provenance: ProvenanceBlock
): ConvertedStat {
  const tier = determineThreatTier(parsed, options);
  const tierStats = TIER_STATS[tier];

  const baseHp = calculateBaseHP(parsed, tierStats);
  const hp = Math.max(1, Math.round(baseHp * options.durability * hpMultiplier));
  const ac = calculateAC(parsed, tierStats);
  const attacks = convertAttacks(parsed.attacks ?? [], tierStats, options.deadliness, dmgMultiplier);
  const saves = parsed.saves ?? generateDefaultSaves(tier);
  const traits = extractTraits(parsed);
  const specialActions = parsed.specialActions?.slice(0, 3) ?? [];
  const morale = tierStats.morale;
  const lootNotes = generateLootNotes(tier);

  // outputProfile bridges legacy OutputCreatureData and new ConvertedStat
  const outputProfile =
    packId === 'shadowdark_private_verify' ? 'shadowdark_compatible'
    : packId === 'dnd5e_srd'              ? 'duskwarden_default'
    :                                        'osr_generic';

  return {
    name: parsed.name || 'Unnamed Creature',
    ac,
    hp,
    movement: parsed.movement || '30 ft',
    attacks,
    saves,
    traits,
    specialActions,
    morale,
    lootNotes,
    threatTier: tier,
    showMorale,
    showReaction,
    outputPackId: packId,
    outputProfile,
    provenance,
  };
}
