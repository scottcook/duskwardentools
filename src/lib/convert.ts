/**
 * Monster transmutation — renders the neutral "forge" model into a target
 * system's stat block.
 *
 * Each system section below follows that game's published math as closely as
 * a heuristic converter can:
 *  - OSE/B/X:   monster attack matrix (THAC0), fighter-equivalent saves,
 *               XP-by-HD award table, 19 − AC descending conversion.
 *  - AD&D 1E:   20 − AC descending conversion (1E unarmored = AC 10),
 *               Monster Manual field order.
 *  - D&D 5E:    HP = HD×d8 average + CON mod × HD (dice expression matches
 *               the total), attack = proficiency + best ability mod,
 *               CR/XP ladder by HD.
 *  - Shadowdark: level = HD, attack bonus = level, stats derived from
 *               HD/speed/kind.
 *  - DCC:       Init from speed, saves ≈ half HD, SP line, Action Die.
 *  - Mörk Borg: player-facing (no attack bonus), armor as damage reduction
 *               dice, no alignment.
 *  - PF2E:      GM Core creature-building benchmarks (moderate road) keyed
 *               to level = HD − 1.
 *  - Knave:     attack bonus = HD, Knave armor tier names.
 */

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

/** B/X / OSE monster attack matrix: HD → [THAC0, attack bonus]. */
function oseThac0(hd: number): [number, number] {
  if (hd <= 7) return [20 - hd, hd - 1] // HD 1 → 19 [0], HD 2 → 18 [+1] …
  if (hd <= 9) return [12, 7]
  if (hd <= 11) return [11, 8]
  if (hd <= 13) return [10, 9]
  return [9, 10]
}

/** OSE XP awards by HD (base values, no special-ability bonus). */
const OSE_XP: Record<number, number> = {
  1: 10, 2: 20, 3: 35, 4: 75, 5: 175, 6: 275, 7: 450, 8: 650,
  9: 900, 10: 900, 11: 1100, 12: 1100,
}

/** 5E CR ladder by HD with the PHB XP value for each rating. */
const CR_BY_HD: string[] = [
  '1/4 (50 XP)', // HD 1
  '1 (200 XP)', // HD 2
  '2 (450 XP)', // HD 3
  '3 (700 XP)', // HD 4
  '4 (1,100 XP)', // HD 5
  '5 (1,800 XP)', // HD 6
  '6 (2,300 XP)', // HD 7
  '7 (2,900 XP)', // HD 8
  '8 (3,900 XP)', // HD 9
  '9 (5,000 XP)', // HD 10
  '10 (5,900 XP)', // HD 11
  '11 (7,200 XP)', // HD 12
]

const mod = (score: number) => Math.floor((score - 10) / 2)

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
  const hd = Math.max(1, +m.hd || 1)
  const asc = +m.ac || 10
  const mv = +m.speed || 30
  const ml = +m.ml || 8
  const hp = Math.max(1, Math.round(hd * 4.5)) // HD × d8 average
  const dscBX = 19 - asc // B/X: unarmored = AC 9 [10]
  const dsc1e = 20 - asc // AD&D: unarmored = AC 10
  const A = parseAttacks(m.atkText)
  const T = parseTraits(m.traitsText)
  const AL = AL_LABEL[m.al as string] || 'Neutral'
  const kind = lo(m.kind || '')
  const sourceStats =
    String(m.statsOverride || '').trim() || statsForTarget(sourceSystem, sys, m.stats)
  const sourceSaves =
    String(m.savesOverride || '').trim() ||
    (sourceSystem === sys ? String(m.saves || '').trim() : '')
  const beastly = /beast|animal|vermin|ooze/.test(kind)
  const mindless = /undead|construct|plant/.test(kind)

  let badge = ''
  let rows: StatRow[] = []

  if (sys === 'dnd5e') {
    // Ability array: STR scales with HD, DEX fixed brute-average, CON funds
    // bonus HP, INT/CHA follow creature kind.
    const str = 10 + Math.min(hd, 8)
    const dex = 14
    const con = 10 + Math.min(hd, 6)
    const int = beastly ? 3 : mindless ? 6 : /humanoid|fey|fiend/.test(kind) ? 10 : 7
    const cha = beastly || mindless ? 6 : 10
    const conBonus = mod(con) * hd
    const hp5e = hp + conBonus
    const prof = hd <= 4 ? 2 : hd <= 8 ? 3 : 4
    const atk = prof + Math.max(mod(str), mod(dex))
    badge = 'Dungeons & Dragons · Fifth Edition'
    rows = [
      { k: 'Armor Class', v: String(asc) },
      {
        k: 'Hit Points',
        v: hp5e + ' (' + hd + 'd8' + (conBonus > 0 ? '+' + conBonus : '') + ')',
      },
      { k: 'Speed', v: mv + ' ft.' },
      {
        k: 'Abilities',
        v: sourceStats || `STR ${str}, DEX ${dex}, CON ${con}, INT ${int}, WIS 10, CHA ${cha}`,
      },
      {
        k: 'Actions',
        v: A.map(
          (a) => a.n + ' ' + hit(atk) + ' to hit (' + a.d + (a.note ? ', ' + a.note : '') + ')',
        ).join(' or '),
      },
      { k: 'Challenge', v: CR_BY_HD[Math.min(hd, 12) - 1] },
    ]
  } else if (sys === 'ose') {
    // Monsters save as fighters of level = HD (OSE monster save table).
    const sv =
      hd <= 3
        ? 'D12 W13 P14 B15 S16'
        : hd <= 6
          ? 'D10 W11 P12 B13 S14'
          : hd <= 9
            ? 'D8 W9 P10 B10 S12'
            : 'D6 W7 P8 B8 S10'
    const [thac0, ab] = oseThac0(hd)
    badge = 'Old-School Essentials · B/X'
    rows = [
      { k: 'AC', v: dscBX + ' [' + asc + ']' },
      { k: 'HD', v: hd + ' (' + hp + ' hp)' },
      {
        k: 'Att',
        v: A.map((a) => {
          const p = atkParts(a.n)
          return p.count + ' × ' + p.name + ' (' + a.d + (a.note ? ' + ' + a.note : '') + ')'
        }).join(', '),
      },
      { k: 'THAC0', v: thac0 + ' [' + hit(ab) + ']' },
      { k: 'MV', v: mv * 4 + '′ (' + Math.round((mv * 4) / 30) * 10 + '′)' },
      { k: 'SV', v: sourceSaves || sv },
      { k: 'ML', v: String(ml) },
      { k: 'AL', v: AL },
      { k: 'XP', v: String(OSE_XP[Math.min(hd, 12)] || 1100) },
    ]
  } else if (sys === 'add1') {
    const natt = A.reduce((n, a) => n + atkParts(a.n).count, 0)
    const intel = beastly ? 'Animal' : mindless ? 'Low' : 'Average'
    badge = 'Advanced D&D · First Edition'
    rows = [
      { k: 'Frequency', v: 'Uncommon' },
      { k: 'No. Appearing', v: '2–8' },
      { k: 'Armor Class', v: String(dsc1e) },
      { k: 'Move', v: Math.round((mv * 2) / 5) + '″' },
      { k: 'Hit Dice', v: String(hd) },
      { k: '% in Lair', v: '25%' },
      { k: 'Treasure Type', v: 'Nil' },
      { k: 'No. of Attacks', v: String(natt) },
      { k: 'Damage/Attack', v: A.map((a) => a.d).join(' / ') },
      { k: 'Special Attacks', v: T[0] ? T[0].h : 'Nil' },
      { k: 'Special Defenses', v: T[1] ? T[1].h : 'Nil' },
      { k: 'Magic Resistance', v: 'Standard' },
      { k: 'Intelligence', v: intel },
      { k: 'Alignment', v: AL },
      { k: 'Size', v: 'M' },
    ]
  } else if (sys === 'shadowdark') {
    // Level = HD; attack bonus = level; stats derived from HD, speed, kind.
    const s = Math.min(hd, 4)
    const d = mv >= 40 ? 3 : mv >= 30 ? 2 : mv >= 20 ? 0 : -1
    const i = beastly ? -3 : mindless ? -2 : 0
    const ch = beastly || mindless ? -2 : 0
    badge = 'Shadowdark RPG'
    rows = [
      { k: 'AC', v: String(asc) },
      { k: 'HP', v: String(hp) },
      {
        k: 'ATK',
        v: A.map((a) => {
          const p = atkParts(a.n)
          return (
            (p.count > 1 ? p.count + ' ' : '') +
            p.name +
            ' ' +
            hit(hd) +
            ' (' +
            a.d +
            (a.note ? ' + ' + a.note : '') +
            ')'
          )
        }).join(' and '),
      },
      { k: 'MV', v: mv >= 40 ? 'double near' : mv <= 15 ? 'close' : 'near' },
      {
        k: 'Stats',
        v: sourceStats || `S ${hit(s)}, D ${hit(d)}, C +0, I ${hit(i)}, W +0, Ch ${hit(ch)}`,
      },
      { k: 'AL', v: (m.al as string) || 'N' },
      { k: 'LV', v: String(hd) },
    ]
  } else if (sys === 'dcc') {
    const init = mv >= 40 ? 2 : mv <= 15 ? -1 : 1
    badge = 'Dungeon Crawl Classics'
    rows = [
      { k: 'Init', v: hit(init) },
      {
        k: 'Atk',
        v: A.map(
          (a) =>
            lo(a.n) + ' ' + hit(hd) + ' melee (' + a.d + (a.note ? ' plus ' + a.note : '') + ')',
        ).join(' or '),
      },
      { k: 'AC', v: String(asc) },
      { k: 'HD', v: hd + 'd8 (' + hp + ' hp)' },
      { k: 'MV', v: mv + '′' },
      { k: 'Act', v: '1d20' },
      { k: 'SP', v: T.length ? T.map((t) => lo(t.h)).join(', ') : 'none' },
      {
        k: 'SV',
        v: sourceSaves ||
          'Fort ' +
          hit(Math.ceil(hd / 2)) +
          ', Ref ' +
          hit(Math.ceil(hd / 2)) +
          ', Will ' +
          hit(Math.floor(hd / 2)),
      },
      { k: 'AL', v: (m.al as string) || 'N' },
    ]
  } else if (sys === 'morkborg') {
    // Player-facing: no attack bonus, no alignment; armor is a DR die.
    const arm =
      asc >= 16
        ? '−d6 (heavy plate)'
        : asc >= 14
          ? '−d4 (heavy hide)'
          : asc >= 12
            ? '−d2 (scraps)'
            : 'none'
    badge = 'Mörk Borg'
    rows = [
      { k: 'HP', v: String(Math.max(4, hd * 4)) },
      { k: 'Morale', v: String(ml) },
      { k: 'Armor', v: arm },
      {
        k: 'Attack',
        v: A.map(
          (a) =>
            atkParts(a.n).name.replace(/^\d+\s*/, '') +
            ' d' +
            a.d.split('d')[1] +
            (a.note ? ' (' + a.note + ')' : ''),
        ).join(' or '),
      },
    ]
  } else if (sys === 'pf2e') {
    // GM Core creature-building benchmarks, moderate road, level = HD − 1.
    const lvl = hd - 1
    const ac2e = Math.floor(15 + lvl * 1.5)
    const hp2e = lvl <= 0 ? 15 : 10 * lvl + 10
    const dmgBonus = lvl + 2
    badge = 'Pathfinder · Second Edition'
    rows = [
      { k: 'Level', v: 'Creature ' + lvl },
      { k: 'Perception', v: hit(lvl + 6) },
      { k: 'AC', v: String(ac2e) },
      { k: 'HP', v: String(hp2e) },
      {
        k: 'Saves',
        v:
          sourceSaves ||
          'Fort ' + hit(lvl + 5) + ', Ref ' + hit(lvl + 6) + ', Will ' + hit(lvl + 4),
      },
      { k: 'Speed', v: mv + ' feet' },
      {
        k: 'Strikes',
        v: A.map((a) => {
          const dice = /[+-]/.test(a.d) ? a.d : a.d + '+' + dmgBonus
          return lo(a.n) + ' ' + hit(lvl + 7) + ' (' + dice + (a.note ? ' plus ' + a.note : '') + ')'
        }).join('; '),
      },
    ]
  } else {
    // Knave: attack bonus = HD; armor names from the Knave armor table.
    const armName =
      asc >= 16
        ? 'plate'
        : asc >= 15
          ? 'half plate'
          : asc >= 14
            ? 'chain'
            : asc >= 13
              ? 'brigandine'
              : asc >= 12
                ? 'gambeson'
                : 'no armor'
    badge = 'Knave'
    rows = [
      { k: 'HD', v: hd + ' (' + hp + ' hp)' },
      { k: 'AC', v: asc + ' (as ' + armName + ')' },
      {
        k: 'Atk',
        v: A.map(
          (a) => lo(a.n) + ' ' + hit(hd) + ' (' + a.d + (a.note ? ', ' + a.note : '') + ')',
        ).join(', '),
      },
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
