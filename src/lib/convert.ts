/**
 * Monster transmutation — a faithful TypeScript port of the design prototype's
 * conversion engine (project/Duskwarden.dc.html → support.js `format()` et al).
 *
 * The prototype works on a small neutral "forge" model and renders a target
 * system's stat block. We keep the arithmetic and wording identical so the UI
 * matches the approved design pixel-for-pixel in behaviour.
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

/** Render a forge monster into a target system's stat block. */
export function format(sys: string, m: ForgeMonster): FormattedBlock {
  const hd = Math.max(1, +m.hd || 1)
  const asc = +m.ac || 10
  const mv = +m.speed || 30
  const ml = +m.ml || 8
  const hp = Math.max(1, Math.round(hd * 4.5))
  const dsc = 19 - asc
  const A = parseAttacks(m.atkText)
  const T = parseTraits(m.traitsText)
  const AL = AL_LABEL[m.al as string] || 'Neutral'

  let badge = ''
  let rows: StatRow[] = []

  if (sys === 'dnd5e') {
    const cr =
      hd <= 1 ? '1/4 (50 XP)' : hd <= 2 ? '1 (200 XP)' : hd <= 4 ? '3 (700 XP)' : '5 (1,800 XP)'
    badge = 'Dungeons & Dragons · Fifth Edition'
    rows = [
      { k: 'Armor Class', v: String(asc) },
      { k: 'Hit Points', v: hp + ' (' + hd + 'd8' + (hd > 2 ? '+' + hd : '') + ')' },
      { k: 'Speed', v: mv + ' ft.' },
      {
        k: 'Abilities',
        v:
          'STR ' +
          (10 + Math.min(hd, 8)) +
          ', DEX 14, CON ' +
          (10 + Math.min(hd, 6)) +
          ', INT 7, WIS 10, CHA 6',
      },
      {
        k: 'Actions',
        v: A.map(
          (a) => a.n + ' ' + hit(2 + Math.ceil(hd / 2)) + ' to hit (' + a.d + (a.note ? ', ' + a.note : '') + ')',
        ).join(' or '),
      },
      { k: 'Challenge', v: cr },
    ]
  } else if (sys === 'ose') {
    const sv =
      hd <= 3 ? 'D12 W13 P14 B15 S16' : hd <= 6 ? 'D10 W11 P12 B13 S14' : 'D8 W9 P10 B10 S12'
    const xp: Record<number, number> = { 1: 10, 2: 20, 3: 35, 4: 75, 5: 175, 6: 275 }
    badge = 'Old-School Essentials · B/X'
    rows = [
      { k: 'AC', v: dsc + ' [' + asc + ']' },
      { k: 'HD', v: hd + ' (' + hp + ' hp)' },
      {
        k: 'Att',
        v: A.map((a) => lo(a.n) + ' (' + a.d + (a.note ? ', ' + a.note : '') + ')').join(', '),
      },
      { k: 'THAC0', v: 19 - Math.min(hd, 9) + ' [' + hit(Math.min(hd, 9)) + ']' },
      { k: 'MV', v: mv * 4 + '′ (' + Math.round((mv * 4) / 30) * 10 + '′)' },
      { k: 'SV', v: sv },
      { k: 'ML', v: String(ml) },
      { k: 'AL', v: AL },
      { k: 'XP', v: String(xp[hd] || hd * 80) },
    ]
  } else if (sys === 'add1') {
    const natt = A.reduce((n, a) => {
      const c = a.n.match(/^(\d+)\s/)
      return n + (c ? +c[1] : 1)
    }, 0)
    badge = 'Advanced D&D · First Edition'
    rows = [
      { k: 'Frequency', v: 'Uncommon' },
      { k: 'No. Appearing', v: '2–8' },
      { k: 'Armor Class', v: String(dsc) },
      { k: 'Move', v: Math.round((mv * 2) / 5) + '″' },
      { k: 'Hit Dice', v: String(hd) },
      { k: '% in Lair', v: '25%' },
      { k: 'No. of Attacks', v: String(natt) },
      { k: 'Damage/Attack', v: A.map((a) => a.d).join(' / ') },
      { k: 'Special Attacks', v: T[0] ? T[0].h : 'Nil' },
      { k: 'Special Defenses', v: T[1] ? T[1].h : 'Nil' },
      { k: 'Alignment', v: AL },
      { k: 'Size', v: 'M' },
    ]
  } else if (sys === 'shadowdark') {
    badge = 'Shadowdark RPG'
    rows = [
      { k: 'AC', v: String(asc) },
      { k: 'HP', v: String(hp) },
      {
        k: 'ATK',
        v: A.map(
          (a) => lo(a.n) + ' ' + hit(hd) + ' (' + a.d + (a.note ? ', ' + a.note : '') + ')',
        ).join(' and '),
      },
      { k: 'MV', v: mv >= 40 ? 'double near' : mv <= 15 ? 'close' : 'near' },
      {
        k: 'Stats',
        v: 'S ' + hit(Math.min(hd, 4)) + ', D +2, C +0, I −2, W +0, Ch −2',
      },
      { k: 'AL', v: (m.al as string) || 'N' },
      { k: 'LV', v: String(hd) },
    ]
  } else if (sys === 'dcc') {
    badge = 'Dungeon Crawl Classics'
    rows = [
      { k: 'Init', v: '+1' },
      {
        k: 'Atk',
        v: A.map(
          (a) => lo(a.n) + ' ' + hit(hd) + ' melee (' + a.d + (a.note ? ' plus ' + a.note : '') + ')',
        ).join(' or '),
      },
      { k: 'AC', v: String(asc) },
      { k: 'HD', v: hd + 'd8 (' + hp + ' hp)' },
      { k: 'MV', v: mv + '′' },
      { k: 'Act', v: '1d20' },
      {
        k: 'SV',
        v:
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
    const arm = asc >= 14 ? '−d4 (heavy hide)' : asc >= 12 ? '−d2 (scraps)' : 'none'
    badge = 'Mörk Borg'
    rows = [
      { k: 'HP', v: String(Math.max(3, hd * 3)) },
      { k: 'Morale', v: String(ml) },
      { k: 'Armor', v: arm },
      {
        k: 'Attack',
        v: A.map((a) => lo(a.n).replace(/^\d+\s*/, '') + ' d' + a.d.split('d')[1]).join(' or '),
      },
    ]
  } else if (sys === 'pf2e') {
    badge = 'Pathfinder · Second Edition'
    rows = [
      { k: 'Level', v: 'Creature ' + (hd - 1) },
      { k: 'Perception', v: hit(hd + 2) },
      { k: 'AC', v: String(asc + 2) },
      { k: 'HP', v: String(Math.round(hp * 1.5)) },
      {
        k: 'Saves',
        v: 'Fort ' + hit(hd + 3) + ', Ref ' + hit(hd + 4) + ', Will ' + hit(hd + 1),
      },
      { k: 'Speed', v: mv + ' feet' },
      {
        k: 'Strikes',
        v: A.map(
          (a) => lo(a.n) + ' ' + hit(hd + 4) + ' (' + a.d + (a.note ? ' plus ' + a.note : '') + ')',
        ).join('; '),
      },
    ]
  } else {
    badge = 'Knave'
    rows = [
      { k: 'HD', v: String(hd) },
      { k: 'AC', v: asc + ' (as ' + (asc >= 14 ? 'chain' : asc >= 12 ? 'leather' : 'no armor') + ')' },
      { k: 'Atk', v: A.map((a) => lo(a.n) + ' (' + a.d + ')').join(', ') },
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
