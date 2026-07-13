/**
 * Published monster-building rules and deterministic helpers.
 *
 * Keep rules data here rather than scattering arithmetic through renderers.
 * Sources:
 * - D&D 5E (2014) DMG, "Monster Statistics by Challenge Rating"
 * - OSE Classic Fantasy SRD, Combat Tables and Awarding XP
 * - Pathfinder 2E Remaster GM Core, Building Creatures tables 2-2, 2-5–2-10
 * - Knave 1E, Monsters
 */

export type MonsterRole = 'balanced' | 'brute' | 'skirmisher' | 'soldier' | 'spellcaster'

export interface HitDiceProfile {
  count: number
  die: number
  modifier: number
  specialAbilities: number
  fractional: boolean
  notation: string
}

export function parseHitDice(raw: unknown, fallbackCount = 1): HitDiceProfile {
  const notation = String(raw ?? '').trim()
  const specialAbilities = (notation.match(/\*/g) ?? []).length
  const fractional = /(?:^|\s)(?:½|1\s*\/\s*2)(?:\s|$|\*)/.test(notation)
  const dice = notation.match(/(\d+)\s*d\s*(\d+)(?:\s*([+-])\s*(\d+))?/i)
  const classic = notation.match(/(\d+)(?:\s*([+-])\s*(\d+))?/)

  const count = fractional
    ? 0.5
    : Math.max(1, Number(dice?.[1] ?? classic?.[1] ?? fallbackCount) || fallbackCount)
  const die = Math.max(2, Number(dice?.[2] ?? 8) || 8)
  const sign = (dice?.[3] ?? classic?.[2]) === '-' ? -1 : 1
  const modifier = sign * Number(dice?.[4] ?? classic?.[3] ?? 0)
  const cleaned =
    dice?.[0] ??
    `${fractional ? '½' : count}${modifier ? `${modifier > 0 ? '+' : ''}${modifier}` : ''}${
      specialAbilities ? '*'.repeat(specialAbilities) : ''
    }`

  return {
    count,
    die,
    modifier,
    specialAbilities,
    fractional,
    notation: cleaned || String(fallbackCount),
  }
}

export function averageHitPoints(profile: HitDiceProfile): number {
  if (profile.fractional) return Math.max(1, Math.round((profile.die + 1) / 4))
  return Math.max(1, Math.round(profile.count * ((profile.die + 1) / 2) + profile.modifier))
}

export function averageDamage(expression: string): number {
  const match = String(expression).replace(/\s+/g, '').match(/^(\d*)d(\d+)([+-]\d+)?$/i)
  if (!match) return 0
  const count = Number(match[1] || 1)
  const die = Number(match[2])
  const modifier = Number(match[3] || 0)
  return count * ((die + 1) / 2) + modifier
}

/* ------------------------------------------------------------------------ */
/* OSE / B/X                                                                */
/* ------------------------------------------------------------------------ */

export function oseAttack(hd: number, hasPositiveHpModifier = false): {
  thac0: number
  bonus: number
} {
  const effective = Math.max(0, Math.ceil(hd) + (hasPositiveHpModifier ? 1 : 0))
  if (effective <= 1) return { thac0: 19, bonus: 0 }
  if (effective <= 2) return { thac0: 18, bonus: 1 }
  if (effective <= 3) return { thac0: 17, bonus: 2 }
  if (effective <= 4) return { thac0: 16, bonus: 3 }
  if (effective <= 5) return { thac0: 15, bonus: 4 }
  if (effective <= 6) return { thac0: 14, bonus: 5 }
  if (effective <= 7) return { thac0: 13, bonus: 6 }
  if (effective <= 9) return { thac0: 12, bonus: 7 }
  if (effective <= 11) return { thac0: 11, bonus: 8 }
  if (effective <= 13) return { thac0: 10, bonus: 9 }
  if (effective <= 15) return { thac0: 9, bonus: 10 }
  if (effective <= 17) return { thac0: 8, bonus: 11 }
  if (effective <= 19) return { thac0: 7, bonus: 12 }
  if (effective <= 21) return { thac0: 6, bonus: 13 }
  return { thac0: 5, bonus: 14 }
}

export function oseSaves(hd: number): string {
  const level = Math.max(1, Math.ceil(hd))
  if (level <= 3) return 'D12 W13 P14 B15 S16'
  if (level <= 6) return 'D10 W11 P12 B13 S14'
  if (level <= 9) return 'D8 W9 P10 B10 S12'
  if (level <= 12) return 'D6 W7 P8 B8 S10'
  if (level <= 15) return 'D4 W5 P6 B5 S8'
  if (level <= 18) return 'D2 W3 P4 B3 S6'
  if (level <= 21) return 'D2 W2 P2 B2 S4'
  return 'D2 W2 P2 B2 S2'
}

export function oseExperience(profile: HitDiceProfile): number {
  const hd = profile.count
  const plus = profile.modifier > 0
  let base: number
  let perAbility: number

  if (hd < 1) [base, perAbility] = [5, 1]
  else if (hd === 1) [base, perAbility] = plus ? [15, 4] : [10, 3]
  else if (hd === 2) [base, perAbility] = plus ? [25, 10] : [20, 5]
  else if (hd === 3) [base, perAbility] = plus ? [50, 25] : [35, 15]
  else if (hd === 4) [base, perAbility] = plus ? [125, 75] : [75, 50]
  else if (hd === 5) [base, perAbility] = plus ? [225, 175] : [175, 125]
  else if (hd === 6) [base, perAbility] = plus ? [350, 300] : [275, 225]
  else if (hd <= 7) [base, perAbility] = [450, 400]
  else if (hd <= 8) [base, perAbility] = [650, 550]
  else if (hd <= 10) [base, perAbility] = [900, 700]
  else if (hd <= 12) [base, perAbility] = [1100, 800]
  else if (hd <= 16) [base, perAbility] = [1350, 950]
  else if (hd <= 20) [base, perAbility] = [2000, 1150]
  else {
    const extra = Math.max(0, Math.ceil(hd) - 21) * 250
    ;[base, perAbility] = [2500 + extra, 2000 + extra]
  }

  return base + perAbility * profile.specialAbilities
}

export function oseMovement(encounterFeet: number): string {
  const encounter = Math.max(0, Math.round(encounterFeet / 10) * 10)
  return `${encounter * 3}′ (${encounter}′)`
}

/* ------------------------------------------------------------------------ */
/* D&D 5E (2014)                                                            */
/* ------------------------------------------------------------------------ */

export interface FiveECrRow {
  cr: string
  value: number
  xp: number
  proficiency: number
  ac: number
  hpMax: number
  attack: number
  damageMax: number
  saveDc: number
}

export const FIVE_E_CR: FiveECrRow[] = [
  { cr: '0', value: 0, xp: 10, proficiency: 2, ac: 13, hpMax: 6, attack: 3, damageMax: 1, saveDc: 13 },
  { cr: '1/8', value: 0.125, xp: 25, proficiency: 2, ac: 13, hpMax: 35, attack: 3, damageMax: 3, saveDc: 13 },
  { cr: '1/4', value: 0.25, xp: 50, proficiency: 2, ac: 13, hpMax: 49, attack: 3, damageMax: 5, saveDc: 13 },
  { cr: '1/2', value: 0.5, xp: 100, proficiency: 2, ac: 13, hpMax: 70, attack: 3, damageMax: 8, saveDc: 13 },
  { cr: '1', value: 1, xp: 200, proficiency: 2, ac: 13, hpMax: 85, attack: 3, damageMax: 14, saveDc: 13 },
  { cr: '2', value: 2, xp: 450, proficiency: 2, ac: 13, hpMax: 100, attack: 3, damageMax: 20, saveDc: 13 },
  { cr: '3', value: 3, xp: 700, proficiency: 2, ac: 13, hpMax: 115, attack: 4, damageMax: 26, saveDc: 13 },
  { cr: '4', value: 4, xp: 1100, proficiency: 2, ac: 14, hpMax: 130, attack: 5, damageMax: 32, saveDc: 14 },
  { cr: '5', value: 5, xp: 1800, proficiency: 3, ac: 15, hpMax: 145, attack: 6, damageMax: 38, saveDc: 15 },
  { cr: '6', value: 6, xp: 2300, proficiency: 3, ac: 15, hpMax: 160, attack: 6, damageMax: 44, saveDc: 15 },
  { cr: '7', value: 7, xp: 2900, proficiency: 3, ac: 15, hpMax: 175, attack: 6, damageMax: 50, saveDc: 15 },
  { cr: '8', value: 8, xp: 3900, proficiency: 3, ac: 16, hpMax: 190, attack: 7, damageMax: 56, saveDc: 16 },
  { cr: '9', value: 9, xp: 5000, proficiency: 4, ac: 16, hpMax: 205, attack: 7, damageMax: 62, saveDc: 16 },
  { cr: '10', value: 10, xp: 5900, proficiency: 4, ac: 17, hpMax: 220, attack: 7, damageMax: 68, saveDc: 16 },
  { cr: '11', value: 11, xp: 7200, proficiency: 4, ac: 17, hpMax: 235, attack: 8, damageMax: 74, saveDc: 17 },
  { cr: '12', value: 12, xp: 8400, proficiency: 4, ac: 17, hpMax: 250, attack: 8, damageMax: 80, saveDc: 17 },
  { cr: '13', value: 13, xp: 10000, proficiency: 5, ac: 18, hpMax: 265, attack: 8, damageMax: 86, saveDc: 18 },
  { cr: '14', value: 14, xp: 11500, proficiency: 5, ac: 18, hpMax: 280, attack: 8, damageMax: 92, saveDc: 18 },
  { cr: '15', value: 15, xp: 13000, proficiency: 5, ac: 18, hpMax: 295, attack: 8, damageMax: 98, saveDc: 18 },
  { cr: '16', value: 16, xp: 15000, proficiency: 5, ac: 18, hpMax: 310, attack: 9, damageMax: 104, saveDc: 18 },
  { cr: '17', value: 17, xp: 18000, proficiency: 6, ac: 19, hpMax: 325, attack: 10, damageMax: 110, saveDc: 19 },
  { cr: '18', value: 18, xp: 20000, proficiency: 6, ac: 19, hpMax: 340, attack: 10, damageMax: 116, saveDc: 19 },
  { cr: '19', value: 19, xp: 22000, proficiency: 6, ac: 19, hpMax: 355, attack: 10, damageMax: 122, saveDc: 19 },
  { cr: '20', value: 20, xp: 25000, proficiency: 6, ac: 19, hpMax: 400, attack: 10, damageMax: 140, saveDc: 19 },
  { cr: '21', value: 21, xp: 33000, proficiency: 7, ac: 19, hpMax: 445, attack: 11, damageMax: 158, saveDc: 20 },
  { cr: '22', value: 22, xp: 41000, proficiency: 7, ac: 19, hpMax: 490, attack: 11, damageMax: 176, saveDc: 20 },
  { cr: '23', value: 23, xp: 50000, proficiency: 7, ac: 19, hpMax: 535, attack: 11, damageMax: 194, saveDc: 20 },
  { cr: '24', value: 24, xp: 62000, proficiency: 7, ac: 19, hpMax: 580, attack: 12, damageMax: 212, saveDc: 21 },
  { cr: '25', value: 25, xp: 75000, proficiency: 8, ac: 19, hpMax: 625, attack: 12, damageMax: 230, saveDc: 21 },
  { cr: '26', value: 26, xp: 90000, proficiency: 8, ac: 19, hpMax: 670, attack: 12, damageMax: 248, saveDc: 21 },
  { cr: '27', value: 27, xp: 105000, proficiency: 8, ac: 19, hpMax: 715, attack: 13, damageMax: 266, saveDc: 22 },
  { cr: '28', value: 28, xp: 120000, proficiency: 8, ac: 19, hpMax: 760, attack: 13, damageMax: 284, saveDc: 22 },
  { cr: '29', value: 29, xp: 135000, proficiency: 9, ac: 19, hpMax: 805, attack: 13, damageMax: 302, saveDc: 22 },
  { cr: '30', value: 30, xp: 155000, proficiency: 9, ac: 19, hpMax: 850, attack: 14, damageMax: 320, saveDc: 23 },
]

function rowForMaximum(value: number, field: 'hpMax' | 'damageMax'): number {
  const index = FIVE_E_CR.findIndex((row) => value <= row[field])
  return index < 0 ? FIVE_E_CR.length - 1 : index
}

function adjustCrIndex(index: number, actual: number, expected: number): number {
  const steps = Math.trunc((actual - expected) / 2)
  return Math.max(0, Math.min(FIVE_E_CR.length - 1, index + steps))
}

function nearestCr(value: number): FiveECrRow {
  return FIVE_E_CR.reduce((best, row) =>
    Math.abs(row.value - value) < Math.abs(best.value - value) ? row : best,
  )
}

export function estimateFiveECr(
  hp: number,
  ac: number,
  damagePerRound: number,
  attackBonus: number,
): FiveECrRow {
  const defensiveBase = rowForMaximum(Math.max(1, hp), 'hpMax')
  const defensive = adjustCrIndex(defensiveBase, ac, FIVE_E_CR[defensiveBase].ac)
  const offensiveBase = rowForMaximum(Math.max(0, damagePerRound), 'damageMax')
  const offensive = adjustCrIndex(
    offensiveBase,
    attackBonus,
    FIVE_E_CR[offensiveBase].attack,
  )
  return nearestCr((FIVE_E_CR[defensive].value + FIVE_E_CR[offensive].value) / 2)
}

export function fiveEProficiency(challenge: string | number): number {
  const value =
    typeof challenge === 'number'
      ? challenge
      : challenge.includes('/')
        ? Number(challenge.split('/')[0]) / Number(challenge.split('/')[1])
        : Number(challenge)
  return nearestCr(Number.isFinite(value) ? value : 0).proficiency
}

/* ------------------------------------------------------------------------ */
/* Pathfinder 2E Remaster                                                   */
/* ------------------------------------------------------------------------ */

type PfTier = 'high' | 'moderate' | 'low'

const PF_AC: Record<PfTier, number[]> = {
  high: [15, 16, 16, 18, 19, 21, 22, 24, 25, 27, 28, 30, 31, 33, 34, 36, 37, 39, 40, 42, 43, 45, 46, 48, 49, 51],
  moderate: [14, 15, 15, 17, 18, 20, 21, 23, 24, 26, 27, 29, 30, 32, 33, 35, 36, 38, 39, 41, 42, 44, 45, 47, 48, 50],
  low: [12, 13, 13, 15, 16, 18, 19, 21, 22, 24, 25, 27, 28, 30, 31, 33, 34, 36, 37, 39, 40, 42, 43, 45, 46, 48],
}

const PF_HP: Record<PfTier, number[]> = {
  high: [9, 19, 25, 38, 56, 75, 94, 119, 144, 169, 194, 219, 244, 269, 294, 319, 344, 369, 394, 419, 444, 469, 500, 538, 575, 625],
  moderate: [8, 15, 20, 30, 45, 60, 75, 95, 115, 135, 155, 175, 195, 215, 235, 255, 275, 295, 315, 335, 355, 375, 400, 430, 460, 500],
  low: [6, 12, 15, 23, 34, 45, 56, 71, 86, 101, 116, 131, 146, 161, 176, 191, 206, 221, 236, 251, 266, 281, 300, 323, 345, 375],
}

const PF_SAVE: Record<PfTier, number[]> = {
  high: [8, 9, 10, 11, 12, 14, 15, 17, 18, 19, 21, 22, 24, 25, 26, 28, 29, 30, 32, 33, 35, 36, 38, 39, 40, 42],
  moderate: [5, 6, 7, 8, 9, 11, 12, 14, 15, 16, 18, 19, 21, 22, 23, 25, 26, 28, 29, 30, 32, 33, 35, 36, 37, 38],
  low: [2, 3, 4, 5, 6, 8, 9, 11, 12, 13, 15, 16, 18, 19, 20, 22, 23, 25, 26, 27, 29, 30, 32, 33, 34, 36],
}

const PF_PERCEPTION = [5, 6, 7, 8, 9, 11, 12, 14, 15, 16, 18, 19, 21, 22, 23, 25, 26, 28, 29, 30, 32, 33, 35, 36, 37, 38]

const PF_STRIKE: Record<PfTier, number[]> = {
  high: [8, 8, 9, 11, 12, 14, 15, 17, 18, 20, 21, 23, 24, 26, 27, 29, 30, 32, 33, 35, 36, 38, 39, 41, 42, 44],
  moderate: [6, 6, 7, 9, 10, 12, 13, 15, 16, 18, 19, 21, 22, 24, 25, 27, 28, 30, 31, 33, 34, 36, 37, 39, 40, 42],
  low: [4, 4, 5, 7, 8, 9, 11, 12, 13, 15, 16, 17, 19, 20, 21, 23, 24, 25, 27, 28, 29, 31, 32, 33, 35, 36],
}

const PF_DAMAGE: Record<PfTier, string[]> = {
  high: [
    '1d4+1', '1d6+2', '1d6+3', '1d10+4', '1d10+6', '2d8+5', '2d8+7',
    '2d8+9', '2d10+9', '2d10+11', '2d10+13', '2d12+13', '2d12+15',
    '3d10+14', '3d10+16', '3d10+18', '3d12+17', '3d12+18', '3d12+19',
    '3d12+20', '4d10+20', '4d10+22', '4d10+24', '4d10+26', '4d12+24',
    '4d12+26',
  ],
  moderate: [
    '1d4', '1d4+2', '1d6+2', '1d8+4', '1d8+6', '2d6+5', '2d6+6',
    '2d6+8', '2d8+8', '2d8+9', '2d8+11', '2d10+11', '2d10+12',
    '3d8+12', '3d8+14', '3d8+15', '3d10+14', '3d10+15', '3d10+16',
    '3d10+17', '4d8+17', '4d8+19', '4d8+20', '4d8+22', '4d10+20',
    '4d10+22',
  ],
  low: [
    '1d4', '1d4+1', '1d4+2', '1d6+3', '1d6+5', '2d4+4', '2d4+6',
    '2d4+7', '2d6+6', '2d6+8', '2d6+9', '2d6+10', '2d8+10',
    '3d6+10', '3d6+11', '3d6+13', '3d6+14', '3d6+15', '3d6+16',
    '3d6+17', '4d6+14', '4d6+15', '4d6+17', '4d6+18', '4d6+19',
    '4d6+21',
  ],
}

function pfIndex(level: number): number {
  return Math.max(0, Math.min(25, Math.round(level) + 1))
}

export interface Pf2eBenchmarks {
  level: number
  ac: number
  hp: number
  perception: number
  fortitude: number
  reflex: number
  will: number
  strike: number
  damage: string
}

export function pf2eBenchmarks(level: number, role: MonsterRole = 'balanced'): Pf2eBenchmarks {
  const boundedLevel = Math.max(-1, Math.min(24, Math.round(level)))
  const i = pfIndex(boundedLevel)
  const acTier: PfTier = role === 'soldier' ? 'high' : role === 'spellcaster' || role === 'brute' ? 'low' : 'moderate'
  const hpTier: PfTier = role === 'brute' ? 'high' : role === 'spellcaster' || role === 'skirmisher' ? 'low' : 'moderate'
  const attackTier: PfTier = role === 'spellcaster' ? 'low' : role === 'balanced' ? 'moderate' : 'high'
  const damageTier: PfTier = role === 'brute' || role === 'soldier' ? 'high' : role === 'spellcaster' ? 'low' : 'moderate'

  const saveTiers: Record<MonsterRole, [PfTier, PfTier, PfTier]> = {
    balanced: ['high', 'moderate', 'low'],
    brute: ['high', 'low', 'low'],
    skirmisher: ['low', 'high', 'moderate'],
    soldier: ['high', 'moderate', 'low'],
    spellcaster: ['low', 'moderate', 'high'],
  }
  const [fort, reflex, will] = saveTiers[role]

  return {
    level: boundedLevel,
    ac: PF_AC[acTier][i],
    hp: PF_HP[hpTier][i],
    perception: PF_PERCEPTION[i],
    fortitude: PF_SAVE[fort][i],
    reflex: PF_SAVE[reflex][i],
    will: PF_SAVE[will][i],
    strike: PF_STRIKE[attackTier][i],
    damage: PF_DAMAGE[damageTier][i],
  }
}

/* ------------------------------------------------------------------------ */
/* Other target helpers                                                     */
/* ------------------------------------------------------------------------ */

export function shadowdarkHitPoints(level: number, constitutionModifier = 0): number {
  return Math.max(1, Math.round(level * 4 + constitutionModifier))
}

export function knaveHitPoints(hd: number): number {
  return Math.max(1, Math.round(hd * 4))
}

/** Preserve the whole damage expression; only remove the redundant leading 1. */
export function morkBorgDamage(expression: string): string {
  return String(expression).trim().replace(/^1d/i, 'd')
}

/* ------------------------------------------------------------------------ */
/* Dungeon Crawl Classics — community quick-reference tables (HD 1–20)      */
/* ------------------------------------------------------------------------ */

const DCC_GOOD_SAVE = [
  0, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 9, 9, 10, 10, 11, 11, 12,
]
const DCC_POOR_SAVE = [
  0, 0, 0, 1, 1, 1, 2, 2, 2, 3, 3, 3, 4, 4, 4, 5, 5, 5, 6, 6, 6,
]
const DCC_FULL_ATTACK = [
  0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20,
]
const DCC_THREE_QUARTER_ATTACK = [
  0, 0, 1, 2, 3, 3, 4, 5, 6, 6, 7, 8, 9, 9, 10, 11, 12, 12, 13, 14, 15,
]
const DCC_HALF_ATTACK = [
  0, 0, 0, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 9, 9, 10,
]

function dccIndex(hd: number): number {
  return Math.max(1, Math.min(20, Math.ceil(hd)))
}

export interface DccCombatStats {
  attackBonus: number
  fortitude: number
  reflex: number
  will: number
  initiative: number
  actionDice: string
  crit: string
}

/** Map creature kind/role to DCC save and attack columns. */
export function dccCombatStats(
  hd: number,
  totalAttacks: number,
  kind = '',
  role: MonsterRole = 'balanced',
): DccCombatStats {
  const index = dccIndex(hd)
  const good = DCC_GOOD_SAVE[index]
  const poor = DCC_POOR_SAVE[index]
  const beastly = /beast|animal|vermin|ooze|plant|construct/i.test(kind)
  const undead = /undead|un-dead/i.test(kind)
  const mindless = /mindless|ooze/i.test(kind)

  let attackBonus = DCC_FULL_ATTACK[index]
  let fortitude = good
  let reflex = poor
  let will = poor

  if (role === 'skirmisher' || /agile|quick|nimble|thief|rogue/i.test(kind)) {
    attackBonus = DCC_THREE_QUARTER_ATTACK[index]
    reflex = good
  } else if (role === 'spellcaster' || /wizard|mage|priest|cleric|warlock|witch/i.test(kind)) {
    attackBonus = DCC_HALF_ATTACK[index]
    will = good
  } else if (undead) {
    fortitude = good
    will = good
  } else if (beastly && !mindless) {
    fortitude = good
    reflex = good
  } else if (role === 'brute' || role === 'soldier') {
    fortitude = good
  }

  const actionDice = `${Math.max(1, totalAttacks)}d20`
  const crit = dccCritTable(index, undead)

  return {
    attackBonus,
    fortitude,
    reflex,
    will,
    initiative: reflex,
    actionDice,
    crit,
  }
}

/** Table 9-10: crit matrix by HD and broad monster family. */
export function dccCritTable(hd: number, undead = false): string {
  const level = dccIndex(hd)
  const dieByHd = (table: string[], fallback: string): string => {
    const row = table[Math.min(level, table.length - 1)]
    return row ?? fallback
  }

  if (undead) {
    const undeadTable = [
      'U/d4',
      'U/d4',
      'U/d6',
      'U/d6',
      'U/d8',
      'U/d8',
      'U/d10',
      'U/d10',
      'U/d12',
      'U/d12',
      'U/d14',
      'U/d14',
      'U/d16',
      'U/d16',
      'U/d20',
      'U/d20',
      'U/d24',
      'U/d24',
      'U/d30',
      'U/d30',
      'U/d30',
    ]
    return `Table ${dieByHd(undeadTable, 'U/d12')}`
  }

  const defaultTable = [
    'M/d4',
    'M/d4',
    'M/d6',
    'M/d8',
    'M/d8',
    'M/d10',
    'M/d10',
    'M/d12',
    'M/d12',
    'M/d14',
    'M/d14',
    'M/d16',
    'M/d16',
    'M/d20',
    'M/d20',
    'M/d20',
    'M/d24',
    'M/d24',
    'M/d24',
    'M/d30',
    'M/d30',
  ]
  return `Table ${dieByHd(defaultTable, 'M/d12')}`
}

export function formatDccSaves(fortitude: number, reflex: number, will: number): string {
  return `Fort ${fortitude >= 0 ? '+' : ''}${fortitude}, Ref ${reflex >= 0 ? '+' : ''}${reflex}, Will ${will >= 0 ? '+' : ''}${will}`
}
