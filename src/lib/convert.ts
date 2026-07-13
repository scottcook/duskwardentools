/**
 * Monster transmutation — renders the neutral "forge" model into a target
 * system's stat block.
 *
 * Source values are preserved in `sourceProfile`. Cross-system values use
 * published target-system tables where those exist. Systems without a
 * canonical conversion formula expose explicit overrides and conservative
 * runnable defaults instead of presenting invented arithmetic as source truth.
 */
import {
  FIVE_E_CR,
  averageDamage,
  averageHitPoints,
  dccCombatStats,
  estimateFiveECr,
  fiveEProficiency,
  formatDccSaves,
  knaveHitPoints,
  morkBorgDamage,
  oseAttack,
  oseExperience,
  oseMovement,
  oseSaves,
  parseHitDice,
  pf2eBenchmarks,
  shadowdarkHitPoints,
  type MonsterRole,
} from './systemRules'

export interface TargetOverrides {
  hp?: string
  ac?: string
  level?: string
  attackBonus?: string
  stats?: string
  saves?: string
  initiative?: string
  actionDice?: string
  crit?: string
}

/** Exact values captured from the source before neutral conversion. */
export interface ForgeSourceProfile {
  system?: string
  hp?: number
  hitDice?: string
  level?: number
  challenge?: string
  size?: string
  movement?: string
  attackBonus?: number
  initiative?: number
  actionDice?: string
  crit?: string
  perception?: number
  frequency?: string
  numberAppearing?: string
  lairChance?: string
  treasureType?: string
  magicResistance?: string
  intelligence?: string
  psionics?: string
  thac0?: number
  xp?: number
}

export interface ForgeMonster {
  name: string
  ep: string
  hd: number | string
  ac: number | string
  speed: number | string
  ml: number | string
  al: 'L' | 'N' | 'C' | string
  kind: string
  /** Optional source-provided ability scores/modifiers; otherwise derived. */
  stats?: string
  /** Optional source-provided saves; otherwise derived for systems that need them. */
  saves?: string
  /** Explicit target-system values supplied after reviewing a warning. */
  statsOverride?: string
  savesOverride?: string
  role?: MonsterRole
  sourceProfile?: ForgeSourceProfile
  targetOverrides?: Record<string, TargetOverrides>
  atkText: string
  traitsText: string
}

export interface ParsedAttack {
  n: string
  d: string
  note: string
}
export interface ParsedTrait {
  h: string
  d: string
}
export interface StatRow {
  k: string
  v: string
}
export interface FormattedBlock {
  badge: string
  title: string
  ep: string
  rows: StatRow[]
  sections: ParsedTrait[]
}

/** The design's five bundled specimens — used as the converter's defaults. */
export const BEASTS: ForgeMonster[] = [
  {
    name: 'Ghoul',
    ep: 'grave-fed, ever hungry',
    hd: 2,
    ac: 12,
    speed: 30,
    ml: 9,
    al: 'C',
    kind: 'undead',
    atkText: '2 Claws 1d4 (paralysis); Bite 1d6',
    traitsText:
      'Paralytic Touch: A creature clawed must save or be paralyzed 1d4 rounds. Elves are immune.\nCarrion Stench: First whiff, save or retch — no attacks for 1 round.',
  },
  {
    name: 'Barrow Wight',
    ep: 'cold hands beneath old kings’ gold',
    hd: 4,
    ac: 14,
    speed: 25,
    ml: 12,
    al: 'C',
    kind: 'undead',
    atkText: 'Chill Touch 1d6 (drain)',
    traitsText:
      'Life Drain: On a hit, save or lose one level of vigor. The slain rise at moonset.\nOld Oaths: Cannot cross running water or an unbroken line of salt.',
  },
  {
    name: 'Rot Hound',
    ep: 'it smelled you three rooms ago',
    hd: 1,
    ac: 12,
    speed: 40,
    ml: 7,
    al: 'N',
    kind: 'beast',
    atkText: 'Bite 1d6 (grave-rot)',
    traitsText:
      'Grave Rot: Bitten, save or waste 1 STR each dawn until blessed.\nPack Howl: While two or more howl, morale checks against them are at −2.',
  },
  {
    name: 'Cave Leech',
    ep: 'the ceiling drips, then feeds',
    hd: 3,
    ac: 11,
    speed: 15,
    ml: 8,
    al: 'N',
    kind: 'aberration',
    atkText: 'Lash 1d4 (attach)',
    traitsText:
      'Blood Drain: Once attached it drains 1d4 HP per round, no roll. Fire makes it let go.\nRubbery Hide: Blunt weapons deal half damage.',
  },
  {
    name: 'Ashen Cultist',
    ep: 'sings while the city burns',
    hd: 1,
    ac: 13,
    speed: 30,
    ml: 10,
    al: 'C',
    kind: 'humanoid',
    atkText: 'Sickle 1d6; Ash Flask 1d4 (blind)',
    traitsText:
      'Fanatic Zeal: Never checks morale while the Ash-Bishop lives.\nAsh Veil: The first missile against them each fight is lost in the choking cloud.',
  },
]

export function parseAttacks(t: string): ParsedAttack[] {
  return String(t || '')
    .split(';')
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => {
      const m = s.match(/^(.*?)\s*(\d*d\d+(?:[+-]\d+)?)\s*(?:\((.+)\))?$/)
      return m ? { n: m[1], d: m[2], note: m[3] || '' } : { n: s, d: '1d4', note: '' }
    })
}

export function parseTraits(t: string): ParsedTrait[] {
  return String(t || '')
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => {
      const i = s.indexOf(':')
      return i > 0 ? { h: s.slice(0, i), d: s.slice(i + 1).trim() } : { h: s, d: '' }
    })
}

const AL_LABEL: Record<string, string> = { L: 'Lawful', N: 'Neutral', C: 'Chaotic' }
const hit = (n: number) => (n >= 0 ? '+' : '−') + Math.abs(n)
const lo = (s: string) => String(s).toLowerCase()

const mod = (score: number) => Math.floor((score - 10) / 2)

function finiteNumber(value: unknown): number | undefined {
  if (value === undefined || value === null || String(value).trim() === '') return undefined
  const number = Number(String(value).replace('−', '-'))
  return Number.isFinite(number) ? number : undefined
}

function addDamageModifier(expression: string, modifier: number): string {
  if (!modifier || /[+-]\d+\s*$/.test(expression)) return expression
  return `${expression}${modifier > 0 ? '+' : ''}${modifier}`
}

function damageRoutine(attacks: ParsedAttack[], modifier = 0): number {
  return attacks.reduce((total, attack) => {
    const { count } = atkParts(attack.n)
    return total + count * Math.max(0, averageDamage(addDamageModifier(attack.d, modifier)))
  }, 0)
}

function shadowdarkModifier(stats: string, label: string, fallback: number): number {
  return abilityValue(stats, label) ?? fallback
}

function signed(value: number): string {
  return value >= 0 ? `+${value}` : `−${Math.abs(value)}`
}

function abilityValue(text: string, label: string): number | undefined {
  const match = text.match(new RegExp(`\\b${label}\\b\\s*[:=]?\\s*([+−-]?\\d+)`, 'i'))
  if (!match) return undefined
  const value = Number(match[1].replace('−', '-'))
  return Number.isFinite(value) ? value : undefined
}

/**
 * Translate the two ability formats the app can map without inventing data:
 * D&D scores ↔ Shadowdark modifiers. Other cross-system pairs fall back to
 * target-system derivation and are surfaced as review warnings.
 */
export function statsForTarget(
  sourceSystem: string,
  targetSystem: string,
  sourceStats?: string,
): string {
  const text = String(sourceStats || '').trim()
  if (!text) return ''
  if (sourceSystem === targetSystem) return text

  if (sourceSystem === 'dnd5e' && targetSystem === 'shadowdark') {
    const labels = [
      ['STR', 'S'],
      ['DEX', 'D'],
      ['CON', 'C'],
      ['INT', 'I'],
      ['WIS', 'W'],
      ['CHA', 'Ch'],
    ] as const
    const values = labels.map(([source]) => abilityValue(text, source))
    if (values.every((value): value is number => value !== undefined)) {
      return labels.map(([, target], index) => `${target} ${signed(mod(values[index]))}`).join(', ')
    }
  }

  if (sourceSystem === 'shadowdark' && targetSystem === 'dnd5e') {
    const labels = [
      ['S', 'STR'],
      ['D', 'DEX'],
      ['C', 'CON'],
      ['I', 'INT'],
      ['W', 'WIS'],
      ['Ch', 'CHA'],
    ] as const
    const values = labels.map(([source]) => abilityValue(text, source))
    if (values.every((value): value is number => value !== undefined)) {
      return labels
        .map(([, target], index) => `${target} ${Math.min(30, Math.max(1, 10 + values[index] * 2))}`)
        .join(', ')
    }
  }

  return ''
}

/** "2 Claws" → { count: 2, name: "claw" }; "Bite" → { count: 1, name: "bite" } */
function atkParts(n: string): { count: number; name: string } {
  const m2 = n.match(/^(\d+)\s+(.*)$/)
  if (!m2) return { count: 1, name: lo(n) }
  // OSE/Shadowdark convention writes repeated attacks in the singular.
  return { count: +m2[1], name: lo(m2[2]).replace(/s$/, '') }
}

/** Render a forge monster into a target system's stat block. */
export function format(sys: string, m: ForgeMonster, sourceSystem = ''): FormattedBlock {
  const sourceProfile = m.sourceProfile ?? {}
  const hdProfile = parseHitDice(sourceProfile.hitDice || m.hd, 1)
  const hd = Math.max(1, Math.ceil(hdProfile.count))
  const asc = +m.ac || 10
  const mv = +m.speed || 30
  const ml = +m.ml || 8
  const A = parseAttacks(m.atkText)
  const T = parseTraits(m.traitsText)
  const AL = AL_LABEL[m.al as string] || 'Neutral'
  const kind = lo(m.kind || '')
  const role = m.role ?? 'balanced'
  const sameSystem = sourceSystem === sys
  const overrides = m.targetOverrides?.[sys] ?? {}
  const targetAc = finiteNumber(overrides.ac) ?? asc
  const exactHp = sameSystem ? sourceProfile.hp : undefined
  const sourceStats =
    String(overrides.stats || m.statsOverride || '').trim() ||
    statsForTarget(sourceSystem, sys, m.stats)
  const sourceSaves =
    String(overrides.saves || m.savesOverride || '').trim() ||
    (sourceSystem === sys ? String(m.saves || '').trim() : '')
  const beastly = /beast|animal|vermin|ooze/.test(kind)
  const mindless = /mindless|ooze/.test(kind)

  let badge = ''
  let rows: StatRow[] = []

  if (sys === 'dnd5e') {
    const str = abilityValue(sourceStats, 'STR') ?? 10 + Math.min(hd, 8)
    const dex = abilityValue(sourceStats, 'DEX') ?? 12
    const con = abilityValue(sourceStats, 'CON') ?? 10 + Math.min(hd, 6)
    const int =
      abilityValue(sourceStats, 'INT') ??
      (beastly ? 3 : mindless ? 1 : /humanoid|fey|fiend/.test(kind) ? 10 : 7)
    const wis = abilityValue(sourceStats, 'WIS') ?? 10
    const cha = abilityValue(sourceStats, 'CHA') ?? (beastly || mindless ? 6 : 10)
    const abilityAttack = Math.max(mod(str), mod(dex))
    const conBonus = mod(con) * Math.ceil(hdProfile.count)
    const calculatedHp = averageHitPoints({
      ...hdProfile,
      die: sameSystem ? hdProfile.die : 8,
      modifier: sameSystem ? hdProfile.modifier : conBonus,
    })
    const hp5e = Math.max(1, finiteNumber(overrides.hp) ?? exactHp ?? calculatedHp)

    let challenge = sameSystem && sourceProfile.challenge
      ? sourceProfile.challenge
      : undefined
    let proficiency = fiveEProficiency(challenge ?? 0)
    let attackBonus =
      finiteNumber(overrides.attackBonus) ??
      (sameSystem ? sourceProfile.attackBonus : undefined) ??
      proficiency + abilityAttack
    const damageModifier = Math.max(mod(str), mod(dex))
    let damagePerRound = damageRoutine(A, damageModifier)
    let challengeRow = estimateFiveECr(hp5e, targetAc, damagePerRound, attackBonus)

    if (!challenge) {
      proficiency = challengeRow.proficiency
      attackBonus = finiteNumber(overrides.attackBonus) ?? proficiency + abilityAttack
      damagePerRound = damageRoutine(A, damageModifier)
      challengeRow = estimateFiveECr(hp5e, targetAc, damagePerRound, attackBonus)
      challenge = challengeRow.cr
    } else {
      challengeRow = {
        ...challengeRow,
        cr: challenge,
        xp: FIVE_E_CR.find((row) => row.cr === challenge)?.xp ?? challengeRow.xp,
      }
    }

    const totalAttacks = A.reduce((sum, attack) => sum + atkParts(attack.n).count, 0)
    const actionDetails = A.map((attack) => {
      const part = atkParts(attack.n)
      const damage = addDamageModifier(attack.d, damageModifier)
      return `${part.name} ${hit(attackBonus)} to hit (${damage}${attack.note ? `; ${attack.note}` : ''})`
    })
    const actions =
      totalAttacks > 1
        ? `Multiattack. Makes ${totalAttacks} attacks: ${A.map((attack) => {
            const part = atkParts(attack.n)
            return `${part.count} ${part.name}`
          }).join(' and ')}. ${actionDetails.join('; ')}`
        : actionDetails.join('; ')
    const hitDiceText =
      sameSystem && sourceProfile.hitDice
        ? sourceProfile.hitDice
        : `${Math.ceil(hdProfile.count)}d8${conBonus > 0 ? `+${conBonus}` : conBonus < 0 ? conBonus : ''}`

    badge = 'Dungeons & Dragons · Fifth Edition (2014)'
    rows = [
      { k: 'Armor Class', v: String(targetAc) },
      { k: 'Hit Points', v: `${hp5e} (${hitDiceText})` },
      { k: 'Speed', v: mv + ' ft.' },
      {
        k: 'Abilities',
        v: `STR ${str}, DEX ${dex}, CON ${con}, INT ${int}, WIS ${wis}, CHA ${cha}`,
      },
      { k: 'Actions', v: actions },
      {
        k: 'Challenge',
        v: `${challenge} (${challengeRow.xp.toLocaleString()} XP)${
          sameSystem && sourceProfile.challenge ? '' : ' · estimated by 2014 DMG combat benchmarks'
        }`,
      },
    ]
  } else if (sys === 'ose') {
    const profileForXp = {
      ...hdProfile,
      specialAbilities:
        hdProfile.specialAbilities || (sameSystem ? 0 : T.length),
    }
    const targetHp =
      finiteNumber(overrides.hp) ??
      exactHp ??
      averageHitPoints({ ...hdProfile, die: 8 })
    const attack = sameSystem && sourceProfile.thac0 !== undefined
      ? { thac0: sourceProfile.thac0, bonus: 19 - sourceProfile.thac0 }
      : oseAttack(hdProfile.count, hdProfile.modifier > 0)
    const movement =
      sameSystem && sourceProfile.movement
        ? sourceProfile.movement
        : oseMovement(mv)
    const xp =
      sameSystem && sourceProfile.xp !== undefined
        ? sourceProfile.xp
        : oseExperience(profileForXp)
    badge = 'Old-School Essentials · B/X'
    rows = [
      { k: 'AC', v: `${19 - targetAc} [${targetAc}]` },
      { k: 'HD', v: `${hdProfile.notation} (${targetHp} hp)` },
      {
        k: 'Att',
        v: A.map((a) => {
          const p = atkParts(a.n)
          return p.count + ' × ' + p.name + ' (' + a.d + (a.note ? ' + ' + a.note : '') + ')'
        }).join(', '),
      },
      { k: 'THAC0', v: `${attack.thac0} [${hit(attack.bonus)}]` },
      { k: 'MV', v: movement },
      { k: 'SV', v: sourceSaves || oseSaves(hdProfile.count) },
      { k: 'ML', v: String(ml) },
      { k: 'AL', v: AL },
      { k: 'XP', v: String(xp) },
    ]
  } else if (sys === 'add1') {
    const natt = A.reduce((n, a) => n + atkParts(a.n).count, 0)
    const defensiveTraits = T.filter((trait) =>
      /armor|armour|hide|immune|resist|regener|defen|invisible|incorporeal/i.test(
        `${trait.h} ${trait.d}`,
      ),
    )
    const offensiveTraits = T.filter((trait) => !defensiveTraits.includes(trait))
    const intel =
      sourceProfile.intelligence ??
      (beastly ? 'Animal' : mindless ? 'Non-' : 'Average')
    const movement =
      sameSystem && sourceProfile.movement
        ? sourceProfile.movement
        : `${Math.max(1, Math.round((mv * 2) / 5))}″`
    badge = 'Advanced D&D · First Edition'
    rows = [
      { k: 'Frequency', v: sourceProfile.frequency ?? 'Referee’s choice' },
      { k: 'No. Appearing', v: sourceProfile.numberAppearing ?? 'Referee’s choice' },
      { k: 'Armor Class', v: String(20 - targetAc) },
      { k: 'Move', v: movement },
      { k: 'Hit Dice', v: hdProfile.notation },
      { k: '% in Lair', v: sourceProfile.lairChance ?? 'Referee’s choice' },
      { k: 'Treasure Type', v: sourceProfile.treasureType ?? 'Referee’s choice' },
      { k: 'No. of Attacks', v: String(natt) },
      { k: 'Damage/Attack', v: A.map((a) => a.d).join(' / ') },
      {
        k: 'Special Attacks',
        v: offensiveTraits.length ? offensiveTraits.map((trait) => trait.h).join(', ') : 'Nil',
      },
      {
        k: 'Special Defenses',
        v: defensiveTraits.length ? defensiveTraits.map((trait) => trait.h).join(', ') : 'Nil',
      },
      { k: 'Magic Resistance', v: sourceProfile.magicResistance ?? 'Standard' },
      { k: 'Intelligence', v: intel },
      { k: 'Alignment', v: AL },
      { k: 'Size', v: sourceProfile.size ?? 'M' },
      { k: 'Psionic Ability', v: sourceProfile.psionics ?? 'Nil' },
      { k: 'Attack / Saves', v: `Use monster matrices at ${Math.ceil(hdProfile.count)} HD` },
      {
        k: 'Level / X.P. Value',
        v:
          sourceProfile.xp !== undefined
            ? sourceProfile.xp.toLocaleString()
            : 'Calculate from actual HP and special abilities',
      },
    ]
  } else if (sys === 'shadowdark') {
    const level =
      finiteNumber(overrides.level) ??
      (sameSystem ? sourceProfile.level : undefined) ??
      hd
    const s = Math.min(level, 4)
    const d = mv >= 40 ? 3 : mv >= 30 ? 2 : mv >= 20 ? 0 : -1
    const i = beastly ? -3 : mindless ? -2 : 0
    const ch = beastly || mindless ? -2 : 0
    const stats =
      sourceStats || `S ${hit(s)}, D ${hit(d)}, C +0, I ${hit(i)}, W +0, Ch ${hit(ch)}`
    const con = shadowdarkModifier(stats, 'C', 0)
    const strength = shadowdarkModifier(stats, 'S', s)
    const dexterity = shadowdarkModifier(stats, 'D', d)
    const targetHp =
      finiteNumber(overrides.hp) ??
      exactHp ??
      shadowdarkHitPoints(level, con)
    const globalAttack =
      finiteNumber(overrides.attackBonus) ??
      (sameSystem ? sourceProfile.attackBonus : undefined)
    badge = 'Shadowdark RPG'
    rows = [
      { k: 'AC', v: String(targetAc) },
      { k: 'HP', v: String(targetHp) },
      {
        k: 'ATK',
        v: A.map((a) => {
          const p = atkParts(a.n)
          const ranged = /bow|sling|shot|spit|ray|ranged|javelin/i.test(a.n)
          const attack = globalAttack ?? Math.min(level, ranged ? dexterity : strength)
          return (
            (p.count > 1 ? p.count + ' ' : '') +
            p.name +
            ' ' +
            hit(attack) +
            ' (' +
            a.d +
            (a.note ? ' + ' + a.note : '') +
            ')'
          )
        }).join(' and '),
      },
      {
        k: 'MV',
        v:
          sameSystem && sourceProfile.movement
            ? sourceProfile.movement
            : mv >= 50
              ? 'double near'
              : mv <= 15
                ? 'close'
                : 'near',
      },
      { k: 'Stats', v: stats },
      { k: 'AL', v: (m.al as string) || 'N' },
      { k: 'LV', v: String(level) },
    ]
  } else if (sys === 'dcc') {
    const totalAttacks = A.reduce((sum, attack) => sum + atkParts(attack.n).count, 0)
    const derived = dccCombatStats(hdProfile.count, totalAttacks, kind, role)
    const init =
      finiteNumber(overrides.initiative) ??
      (sameSystem ? sourceProfile.initiative : undefined) ??
      derived.initiative
    const attackBonus =
      finiteNumber(overrides.attackBonus) ??
      (sameSystem ? sourceProfile.attackBonus : undefined) ??
      derived.attackBonus
    const actionDice =
      overrides.actionDice ||
      (sameSystem ? sourceProfile.actionDice : undefined) ||
      derived.actionDice
    const crit =
      overrides.crit ||
      (sameSystem ? sourceProfile.crit : undefined) ||
      derived.crit
    const targetHp =
      finiteNumber(overrides.hp) ??
      exactHp ??
      averageHitPoints(hdProfile)
    const savesLine =
      sourceSaves ||
      formatDccSaves(derived.fortitude, derived.reflex, derived.will)
    badge = 'Dungeon Crawl Classics'
    rows = [
      { k: 'Init', v: hit(init) },
      {
        k: 'Atk',
        v: A.map(
          (a) =>
            lo(a.n) +
            ' ' +
            hit(attackBonus) +
            (/bow|sling|shot|spit|ray|ranged|javelin/i.test(a.n) ? ' missile fire' : ' melee') +
            ' (' +
            a.d +
            (a.note ? ' plus ' + a.note : '') +
            ')',
        ).join(' or '),
      },
      { k: 'Crit', v: crit },
      { k: 'AC', v: String(targetAc) },
      { k: 'HD', v: `${hdProfile.notation.includes('d') ? hdProfile.notation : `${hd}d8`} (${targetHp} hp)` },
      { k: 'MV', v: mv + '′' },
      { k: 'Act', v: actionDice },
      {
        k: 'SP',
        v: T.length ? T.map((trait) => `${lo(trait.h)}${trait.d ? ` (${trait.d})` : ''}`).join('; ') : 'none',
      },
      { k: 'SV', v: savesLine },
      { k: 'AL', v: (m.al as string) || 'N' },
    ]
  } else if (sys === 'morkborg') {
    const arm =
      targetAc >= 16
        ? '−d6 (heavy plate)'
        : targetAc >= 14
          ? '−d4 (heavy hide)'
          : targetAc >= 12
            ? '−d2 (scraps)'
            : 'none'
    const targetHp =
      finiteNumber(overrides.hp) ??
      exactHp ??
      Math.max(4, Math.round(hdProfile.count * 4))
    badge = 'Mörk Borg'
    rows = [
      { k: 'HP', v: String(targetHp) },
      { k: 'Morale', v: String(ml) },
      { k: 'Armor', v: arm },
      {
        k: 'Attack',
        v: A.map((a) => {
          const part = atkParts(a.n)
          return `${part.count > 1 ? `${part.count}× ` : ''}${part.name} ${morkBorgDamage(a.d)}${
            a.note ? ` (${a.note})` : ''
          }`
        }).join(' or '),
      },
    ]
  } else if (sys === 'pf2e') {
    const level =
      finiteNumber(overrides.level) ??
      (sameSystem ? sourceProfile.level : undefined) ??
      hd - 1
    const benchmark = pf2eBenchmarks(level, role)
    const targetHp = finiteNumber(overrides.hp) ?? exactHp ?? benchmark.hp
    const attackBonus =
      finiteNumber(overrides.attackBonus) ??
      (sameSystem ? sourceProfile.attackBonus : undefined) ??
      benchmark.strike
    badge = 'Pathfinder · Second Edition'
    rows = [
      { k: 'Level', v: `Creature ${benchmark.level}` },
      {
        k: 'Perception',
        v: hit(
          sameSystem && sourceProfile.perception !== undefined
            ? sourceProfile.perception
            : benchmark.perception,
        ),
      },
      { k: 'AC', v: String(finiteNumber(overrides.ac) ?? (sameSystem ? asc : benchmark.ac)) },
      { k: 'HP', v: String(targetHp) },
      {
        k: 'Saves',
        v:
          sourceSaves ||
          `Fort ${hit(benchmark.fortitude)}, Ref ${hit(benchmark.reflex)}, Will ${hit(benchmark.will)}`,
      },
      { k: 'Speed', v: mv + ' feet' },
      {
        k: 'Strikes',
        v: A.map((a) =>
          `${lo(a.n)} ${hit(attackBonus)} (${
            sameSystem ? a.d : benchmark.damage
          }${a.note ? ` plus ${a.note}` : ''})`,
        ).join('; '),
      },
    ]
  } else {
    const armName =
      targetAc >= 16
        ? 'full plate'
        : targetAc >= 15
          ? 'half plate'
          : targetAc >= 14
            ? 'chain'
            : targetAc >= 13
              ? 'brigandine'
              : targetAc >= 12
                ? 'gambeson'
                : 'no armor'
    const targetHp = finiteNumber(overrides.hp) ?? exactHp ?? knaveHitPoints(hdProfile.count)
    const attackBonus =
      finiteNumber(overrides.attackBonus) ??
      (sameSystem ? sourceProfile.attackBonus : undefined) ??
      hd
    badge = 'Knave · First Edition'
    rows = [
      { k: 'HD', v: `${hdProfile.notation} (${targetHp} hp)` },
      { k: 'AC', v: `${targetAc} (as ${armName})` },
      {
        k: 'Atk',
        v: A.map(
          (a) => lo(a.n) + ' ' + hit(attackBonus) + ' (' + a.d + (a.note ? ', ' + a.note : '') + ')',
        ).join(', '),
      },
      { k: 'Saves', v: `${hit(hd)}; ability defenses ${10 + hd}` },
      { k: 'MV', v: mv + '′' },
      { k: 'ML', v: String(ml) },
      { k: 'AL', v: (m.al as string) || 'N' },
    ]
  }

  return { badge, title: m.name || 'Nameless Thing', ep: m.ep || '', rows, sections: T }
}

/** Plain-text rendering used for the "copy stat block" action. */
export function plain(b: FormattedBlock): string {
  return (
    b.title.toUpperCase() +
    '\n' +
    (b.ep ? b.ep + '\n' : '') +
    '[' +
    b.badge +
    ']\n\n' +
    b.rows.map((r) => r.k + ': ' + r.v).join('\n') +
    (b.sections.length ? '\n\n' + b.sections.map((s) => s.h + '. ' + s.d).join('\n') : '')
  )
}
