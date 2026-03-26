/**
 * Duskwarden Conversion Engine v2
 *
 * Takes a ParsedCreatureData + ConversionSettings and produces an
 * OutputCreatureData with full tuning metadata included.
 *
 * The engine is profile-driven: all balance targets come from the
 * selected ConversionProfile, NOT from hardcoded rules.
 *
 * THREAT TIER SYSTEM:
 * Tier 1 (Trivial): CR ≤ 1 / Level ≤ 2 / HP ≤ 8
 * Tier 2 (Easy):    CR 1–2 / Level 3–4 / HP 9–20
 * Tier 3 (Medium):  CR 3–5 / Level 5–7 / HP 21–40
 * Tier 4 (Hard):    CR 6–12 / Level 8–12 / HP 41–80
 * Tier 5 (Deadly):  CR 13+ / Level 13+ / HP 81+
 */

import type {
  ParsedCreatureData,
  OutputCreatureData,
  ConversionSettings,
  ThreatTier,
  Attack,
  OutputProfile,
  ConversionTuning,
} from '@/types';
import { OUTPUT_PROFILES } from '@/types';
import {
  CONVERSION_PROFILES,
  getEffectiveTargets,
  type ConversionProfileId,
  type CreatureRole,
} from './profiles';

// ─────────────────────────────────────────────────────────────────────────────
// Tier resolution
// ─────────────────────────────────────────────────────────────────────────────

function crToTier(cr: string): ThreatTier {
  if (cr.includes('/')) return 1;

  const numericCr = parseInt(cr, 10);
  if (Number.isNaN(numericCr) || numericCr <= 1) return 1;
  if (numericCr <= 4) return 2;
  if (numericCr <= 8) return 3;
  if (numericCr <= 12) return 4;
  return 5;
}

function levelToTier(level: number): ThreatTier {
  if (level <= 2)  return 1;
  if (level <= 4)  return 2;
  if (level <= 7)  return 3;
  if (level <= 12) return 4;
  return 5;
}

function inferTierFromHP(hp: number): ThreatTier {
  if (hp <= 8)  return 1;
  if (hp <= 20) return 2;
  if (hp <= 40) return 3;
  if (hp <= 80) return 4;
  return 5;
}

export function determineThreatTier(
  parsed: ParsedCreatureData,
  settings: ConversionSettings
): ThreatTier {
  if (settings.targetTier  !== undefined) return settings.targetTier;
  if (settings.targetLevel !== undefined) return levelToTier(settings.targetLevel);
  if (parsed.level !== undefined)         return levelToTier(parsed.level);
  if (parsed.cr   !== undefined)          return crToTier(parsed.cr);
  return inferTierFromHP(parsed.hp ?? 10);
}

// ─────────────────────────────────────────────────────────────────────────────
// Damage helpers
// ─────────────────────────────────────────────────────────────────────────────

/** Parse a dice expression; returns {numDice, dieSize, modifier} or null */
function parseDice(expr: string) {
  const m = expr.match(/(\d+)d(\d+)(?:\s*([+-])\s*(\d+))?/);
  if (!m) return null;
  const numDice  = parseInt(m[1], 10);
  const dieSize  = parseInt(m[2], 10);
  const sign     = m[3] === '-' ? -1 : 1;
  const modifier = m[4] ? parseInt(m[4], 10) * sign : 0;
  return { numDice, dieSize, modifier, avg: numDice * ((dieSize + 1) / 2) + modifier };
}

/** Scale a dice expression to hit a target average DPR */
function scaleDamageToTarget(targetDpr: number): string {
  // Choose die size that best fits; prefer d6 or d8 for readability
  for (const dieSize of [4, 6, 8, 10, 12]) {
    const avgPerDie = (dieSize + 1) / 2;
    const numDice   = Math.max(1, Math.round(targetDpr / avgPerDie));
    const achieved  = numDice * avgPerDie;
    if (Math.abs(achieved - targetDpr) <= avgPerDie / 2) {
      return `${numDice}d${dieSize}`;
    }
  }
  // Fallback: scale 1d6
  const numDice = Math.max(1, Math.round(targetDpr / 3.5));
  return `${numDice}d6`;
}

/** Scale an existing dice expression by a multiplier, maintaining die structure */
function scaleDamage(expr: string, factor: number): string {
  const p = parseDice(expr);
  if (!p) return expr;
  const targetAvg = p.avg * factor;
  const avgPerDie = (p.dieSize + 1) / 2;
  const newNumDice = Math.max(1, Math.round((targetAvg - p.modifier) / avgPerDie));
  const remainder  = Math.round(targetAvg - newNumDice * avgPerDie);
  if (Math.abs(remainder) < 1) return `${newNumDice}d${p.dieSize}`;
  return `${newNumDice}d${p.dieSize}${remainder >= 0 ? '+' : ''}${remainder}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Attack conversion
// ─────────────────────────────────────────────────────────────────────────────

function buildAttacks(
  sourceAttacks: Attack[],
  attackBonusTarget: number,
  dprTarget: number,
  deadlinessMultiplier: number
): Attack[] {
  const effectiveDPR = dprTarget * deadlinessMultiplier;
  const ab = attackBonusTarget;

  if (sourceAttacks.length === 0) {
    return [{
      name: 'Attack',
      bonus: ab,
      damage: scaleDamageToTarget(effectiveDPR),
    }];
  }

  const capped = sourceAttacks.slice(0, 5);
  const sourceAverages = capped.map((attack) => parseDice(attack.damage ?? '')?.avg ?? 0);
  const sourceTotal = sourceAverages.reduce((sum, avg) => sum + avg, 0);
  const dprShares = capped.map((_, index) => {
    if (sourceTotal > 0) {
      return effectiveDPR * (sourceAverages[index] / sourceTotal);
    }
    return effectiveDPR / capped.length;
  });

  return capped.map((src, i) => {
    const targetShare = dprShares[i];
    let damage: string;
    if (src.damage) {
      // Scale existing damage toward our target share
      const srcParsed = parseDice(src.damage);
      if (srcParsed) {
        const factor = targetShare / srcParsed.avg;
        damage = scaleDamage(src.damage, factor);
      } else {
        damage = scaleDamageToTarget(targetShare);
      }
    } else {
      damage = scaleDamageToTarget(targetShare);
    }

    return {
      name: src.name,
      bonus: src.bonus !== undefined
        ? Math.max(ab - 1, Math.min(ab + 1, Math.round((src.bonus + ab) / 2)))
        : ab,
      damage,
      description: src.description,
    };
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Distance band conversion (Shadowdark-style: close / near / far)
// ─────────────────────────────────────────────────────────────────────────────

function feetToDistanceBand(feet: number): string {
  if (feet <= 5)  return 'close';
  if (feet <= 20) return 'close ×2';
  if (feet <= 45) return 'near';
  if (feet <= 60) return 'near ×2';
  if (feet <= 90) return 'far';
  return 'far ×2';
}

function convertMovementToDistanceBands(movement: string): string {
  const segments = movement.split(',').map(s => s.trim());
  const converted: string[] = [];

  for (const segment of segments) {
    const typed = segment.match(
      /^(fly|swim|climb|burrow|hover)\s+(\d+)\s*(?:ft\.?|feet|')/i,
    );
    if (typed) {
      const feet = parseInt(typed[2], 10);
      if (feet > 0) converted.push(`${typed[1].toLowerCase()} ${feetToDistanceBand(feet)}`);
      continue;
    }
    const plain = segment.match(/(\d+)\s*(?:ft\.?|feet|')/i);
    if (plain) {
      const feet = parseInt(plain[1], 10);
      if (feet > 0) converted.push(feetToDistanceBand(feet));
      continue;
    }
    converted.push(segment);
  }

  return converted.join(', ') || 'close';
}

// ─────────────────────────────────────────────────────────────────────────────
// Multiattack collapse (produces one primary attack with a count)
// ─────────────────────────────────────────────────────────────────────────────

const RANGED_WEAPON_RE = /\b(bow|crossbow|sling|dart|net|thrown|shortbow|longbow)\b/i;

function collapseMultiattackAttacks(
  attacks: Attack[],
  multiattackCount: number,
  ab: number,
  effectiveDPR: number,
): Attack[] {
  if (attacks.length === 0) {
    return [{
      name: 'Attack',
      bonus: ab,
      damage: scaleDamageToTarget(effectiveDPR / multiattackCount),
      count: multiattackCount,
    }];
  }

  const melee = attacks.filter(a => !RANGED_WEAPON_RE.test(a.name));
  const ranged = attacks.filter(a => RANGED_WEAPON_RE.test(a.name));
  const primary = melee[0] ?? attacks[0];

  const result: Attack[] = [{
    name: primary.name,
    bonus: primary.bonus ?? ab,
    damage: scaleDamageToTarget(effectiveDPR / multiattackCount),
    count: multiattackCount,
  }];

  for (const alt of ranged) {
    if (alt.name.toLowerCase() !== primary.name.toLowerCase()) {
      result.push({
        name: alt.name,
        bonus: alt.bonus ?? ab,
        damage: alt.damage ?? scaleDamageToTarget(effectiveDPR),
      });
    }
  }

  return result;
}

// ─────────────────────────────────────────────────────────────────────────────
// Traits extraction
// ─────────────────────────────────────────────────────────────────────────────

function extractTraits(parsed: ParsedCreatureData): string[] {
  const traits: string[] = [];
  if (parsed.movement?.toLowerCase().includes('fly'))   traits.push('Flying: can fly');
  if (parsed.movement?.toLowerCase().includes('swim'))  traits.push('Aquatic: can swim');
  if (parsed.movement?.toLowerCase().includes('climb')) traits.push('Climber: can climb');
  if (parsed.movement?.toLowerCase().includes('burrow'))traits.push('Burrower: can burrow');
  return traits;
}

function generateLootNotes(tier: ThreatTier): string {
  const table: Record<ThreatTier, string> = {
    1: 'Minor trinkets, 1d6 cp',
    2: '2d6 sp, common item',
    3: '1d6 gp, uncommon item chance',
    4: '2d6 gp, uncommon item',
    5: '3d6 gp, rare item chance',
  };
  return table[tier];
}

// ─────────────────────────────────────────────────────────────────────────────
// Legacy profile → new profile bridge
// ─────────────────────────────────────────────────────────────────────────────

function resolveConversionProfile(settings: ConversionSettings): ConversionProfileId {
  if (settings.conversionProfileId) return settings.conversionProfileId;
  // Fallback: map old outputProfile to new id
  if (settings.outputProfile === 'shadowdark_compatible') return 'shadowdark_compatible_v1';
  return 'osr_generic_v1';
}

function resolveRole(settings: ConversionSettings): CreatureRole {
  return (settings.role as CreatureRole | undefined) ?? 'skirmisher';
}

// ─────────────────────────────────────────────────────────────────────────────
// Main converter
// ─────────────────────────────────────────────────────────────────────────────

export function convertCreature(
  parsed: ParsedCreatureData,
  settings: ConversionSettings
): OutputCreatureData {
  const profileId = resolveConversionProfile(settings);
  const profile   = CONVERSION_PROFILES[profileId];
  const role      = resolveRole(settings);
  const tier      = determineThreatTier(parsed, settings);

  // Effective targets (base * role modifiers)
  const targets = getEffectiveTargets(profile, tier, role);

  // Apply user multipliers
  const hpFinal  = Math.max(1, Math.round(targets.hpTarget  * settings.durability));
  const acFinal  = Math.min(targets.acTarget + 2, Math.max(targets.acTarget - 1,
    parsed.ac !== undefined
      ? Math.round((parsed.ac + targets.acTarget) / 2)  // blend source + target
      : targets.acTarget
  ));
  const abFinal  = targets.attackBonusTarget;
  const attacks  = buildAttacks(
    parsed.attacks ?? [],
    abFinal,
    targets.dprTarget,
    settings.deadliness
  );

  // Distance band conversion (e.g. Shadowdark)
  const movement = profile.useDistanceBands
    ? convertMovementToDistanceBands(parsed.movement || '30 ft')
    : (parsed.movement || '30 ft');

  // Multiattack collapse (e.g. Shadowdark "ATK 2 sword +3 (1d8)")
  if (
    profile.collapseMultiattack &&
    parsed.multiattackCount &&
    parsed.multiattackCount > 1
  ) {
    const consolidated = collapseMultiattackAttacks(
      parsed.attacks ?? [],
      parsed.multiattackCount,
      abFinal,
      targets.dprTarget * settings.deadliness,
    );
    attacks.length = 0;
    attacks.push(...consolidated);
  }

  const saves    = parsed.saves ?? `+${tier + 2} vs physical effects`;
  const traits   = extractTraits(parsed);
  let specialActions = parsed.specialActions?.slice(0, 3) ?? [];

  if (profile.collapseMultiattack && parsed.multiattackCount) {
    specialActions = specialActions.filter(
      a => a.name.toLowerCase() !== 'multiattack',
    );
  }

  const morale   = parsed.morale ?? targets.moraleTarget ?? 0;
  const lootNotes = generateLootNotes(tier);

  // Tuning metadata
  const tuning: ConversionTuning = {
    profileId,
    role,
    hpMultiplier: settings.durability,
    damageMultiplier: settings.deadliness,
    targets: {
      acTarget:          targets.acTarget,
      hpTarget:          targets.hpTarget,
      attackBonusTarget: targets.attackBonusTarget,
      dprTarget:         targets.dprTarget,
      moraleTarget:      targets.moraleTarget,
    },
    provenance: {
      sourceSystem: parsed.system ?? 'unknown',
      outputSystem: profile.displayName,
      version:      profile.version,
    },
  };

  // Legacy profile field bridge
  const outputProfile: OutputProfile =
    profileId === 'shadowdark_compatible_v1' ? 'shadowdark_compatible'
    : profileId === 'osr_generic_v1'         ? 'osr_generic'
    :                                           'duskwarden_default';

  return {
    name: parsed.name || 'Unnamed Creature',
    description: parsed.description,
    ac: acFinal,
    hp: hpFinal,
    movement,
    attacks,
    saves,
    traits,
    specialActions,
    morale,
    lootNotes,
    threatTier: tier,
    outputProfile,
    outputPackId: settings.outputPackId ?? 'osr_generic',
    showMorale: profile.showMorale,
    showReaction: profile.showReaction,
    tuning,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Settings helpers
// ─────────────────────────────────────────────────────────────────────────────

export function getDefaultSettings(): ConversionSettings {
  return {
    deadliness: 1.0,
    durability: 1.0,
    targetLevel: undefined,
    targetTier: undefined,
    role: undefined,
    outputProfile: 'osr_generic',
    outputPackId: 'osr_generic',
    conversionProfileId: 'osr_generic_v1',
  };
}

export function validateSettings(settings: ConversionSettings): ConversionSettings {
  return {
    ...settings,
    deadliness: Math.max(0.5, Math.min(2.0, settings.deadliness)),
    durability: Math.max(0.5, Math.min(2.0, settings.durability)),
    targetLevel: settings.targetLevel !== undefined
      ? Math.max(0, Math.min(20, settings.targetLevel))
      : undefined,
    targetTier: settings.targetTier !== undefined
      ? Math.max(1, Math.min(5, settings.targetTier)) as ConversionSettings['targetTier']
      : undefined,
    conversionProfileId: settings.conversionProfileId ?? 'osr_generic_v1',
    outputPackId: settings.outputPackId ?? 'osr_generic',
  };
}

/** @deprecated Use CONVERSION_PROFILES from profiles/ directly */
export function getProfilePreset(profile: OutputProfile) {
  return OUTPUT_PROFILES[profile].preset;
}
