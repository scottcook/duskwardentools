/**
 * Paste-in stat block detection and parsing.
 *
 * Reads a pasted block, guesses the source system from fingerprints, and maps
 * the fields into the neutral ForgeMonster model used by the converter.
 */

import type { ForgeMonster, ForgeSourceProfile } from './convert'
import { averageHitPoints, parseHitDice } from './systemRules'

export type ParseConfidence = 'high' | 'medium' | 'low' | 'none'

export interface ParseResult {
  system: string
  confidence: ParseConfidence
  forge: ForgeMonster
  fieldsFound: string[]
  warnings: string[]
}

const SYSTEMS = [
  'dnd5e',
  'ose',
  'add1',
  'shadowdark',
  'dcc',
  'morkborg',
  'pf2e',
  'knave',
  'bfrpg',
  'osric',
] as const

type SystemId = (typeof SYSTEMS)[number]

const DEFAULT_FORGE: ForgeMonster = {
  name: '',
  ep: '',
  hd: 1,
  ac: 12,
  speed: 30,
  ml: 8,
  al: 'N',
  kind: 'monster',
  stats: '',
  saves: '',
  role: 'balanced',
  atkText: 'Strike 1d6',
  traitsText: '',
}

const DICE_RE = /\d+d\d+(?:\s*[+-]\s*\d+)?/i

/* ------------------------------------------------------------------------ */
/* Detection                                                                */
/* ------------------------------------------------------------------------ */

interface DetectScore {
  system: SystemId
  score: number
  reasons: string[]
}

function scoreSystem(text: string): DetectScore[] {
  const t = text.toLowerCase()
  const scores: DetectScore[] = SYSTEMS.map((system) => ({ system, score: 0, reasons: [] }))

  const bump = (id: SystemId, n: number, reason: string) => {
    const row = scores.find((s) => s.system === id)!
    row.score += n
    row.reasons.push(reason)
  }

  if (/\bchallenge\s*(?:rating|\d|\/)/i.test(text) || /\b\d+\s*\(\d+\s*xp\)/i.test(text)) {
    bump('dnd5e', 4, 'challenge/XP')
  }
  if (/\barmor class\b/i.test(text) && /\bhit points\b/i.test(text)) bump('dnd5e', 2, '5E labels')
  if (/\bstr\b.*\bdex\b.*\bcon\b/i.test(text)) bump('dnd5e', 2, 'ability block')
  if (/\bactions?\s*:/i.test(text)) bump('dnd5e', 2, 'actions section')

  if (/\bthac0\b/i.test(text)) bump('ose', 5, 'THAC0')
  if (/\bac\s*\d+\s*\[\d+\]/i.test(text)) bump('ose', 4, 'AC bracket notation')
  if (/\bsv\s+d\d+/i.test(text) || /\bd\d+\s+w\d+\s+p\d+/i.test(text)) bump('ose', 3, 'B/X saves')
  if (/\bhd\s*\d+\*?\b/i.test(text) && !/\bhit points\b/i.test(text)) bump('ose', 1, 'HD line')
  if (/\bxp\s*\d+/i.test(text) && /\bml\b/i.test(text)) bump('ose', 2, 'XP + ML')

  if (/%\s*in\s+lair/i.test(text)) bump('add1', 5, '% in Lair')
  if (/\bno\.\s*appearing\b/i.test(text)) bump('add1', 4, 'No. Appearing')
  if (/\btreasure type\b/i.test(text)) bump('add1', 4, 'Treasure Type')
  if (/\bmagic resistance\b/i.test(text)) bump('add1', 3, 'Magic Resistance')
  if (/\bfrequency\b/i.test(text) && /\bintelligence\b/i.test(text)) bump('add1', 2, 'MM fields')
  if (/\bmove\s*\d+\s*[″"]/i.test(text) && !/\bthac0\b/i.test(text)) bump('add1', 2, 'move inches')

  if (/\blv\s*\d+/i.test(text) && /\bnear\b/i.test(text)) bump('shadowdark', 4, 'LV + near')
  if (/\bstats\s*s\s*[+-]/i.test(text)) bump('shadowdark', 4, 'Shadowdark stats')
  if (/\batk\s*:/i.test(text) && /\bmv\s*:/i.test(text) && /\bal\s*[lnc]\b/i.test(text)) {
    bump('shadowdark', 3, 'SD stat lines')
  }

  if (/\bact\s*:\s*1d20/i.test(text)) bump('dcc', 5, 'Action Die')
  if (/\binit\s*[+-]/i.test(text) && /\bsv\s*:\s*fort/i.test(text)) bump('dcc', 3, 'DCC saves')
  if (/\bsp\s*:/i.test(text) && /\bhd\s*\d+d\d+/i.test(text)) bump('dcc', 2, 'DCC SP line')

  if (/\barmor\s*:\s*[−-]?d\d/i.test(text)) bump('morkborg', 5, 'Mörk Borg armor die')
  if (/\battack\s*:\s*[^+]*d\d/i.test(text) && !/\barmor class\b/i.test(text)) bump('morkborg', 2, 'MB attack line')
  if (/\bhp\s*\d+/i.test(text) && /\bmorale\s*\d+/i.test(text) && t.split('\n').length <= 8) {
    bump('morkborg', 2, 'compact MB block')
  }

  if (/\bcreature\s+\d+/i.test(text)) bump('pf2e', 4, 'Creature level')
  if (/\bperception\s*[+-]/i.test(text) && /\bstrikes?\s*:/i.test(text)) bump('pf2e', 4, 'PF2E strikes')
  if (/\bfort\s*[+-].*\bref\s*[+-].*\bwill\s*[+-]/i.test(text)) bump('pf2e', 3, 'PF2E saves')

  if (/\batk\s*:\s*.*\+\d+\s*\(\d+d/i.test(text) && /\bml\s*\d+/i.test(text)) bump('knave', 3, 'Knave atk bonus')
  if (/\bas\s+(?:no armor|gambeson|chain|plate)\b/i.test(text)) bump('knave', 4, 'Knave armor tier')

  if (/\bsave as\s*:/i.test(text) && /\bno\.\s*of\s*attacks\s*:/i.test(text)) {
    bump('bfrpg', 6, 'Basic Fantasy monster fields')
  }
  if (/\barmor class\s*:\s*1\d\b/i.test(text) && /\bmorale\s*:\s*\d+/i.test(text)) {
    bump('bfrpg', 3, 'ascending AC + morale')
  }

  if (/\bno\.\s*encountered\s*:/i.test(text)) bump('osric', 5, 'OSRIC encounter field')
  if (/\blair probability\s*:/i.test(text)) bump('osric', 4, 'OSRIC lair field')
  if (/\blevel\s*\/\s*xp\s*:/i.test(text)) bump('osric', 4, 'OSRIC level/XP')
  if (/\bspecial defences\s*:/i.test(text)) bump('osric', 2, 'OSRIC spelling')

  return scores.sort((a, b) => b.score - a.score)
}

export function detectSourceSystem(text: string): { system: string; confidence: ParseConfidence } {
  const trimmed = text.trim()
  if (trimmed.length < 24) return { system: 'dnd5e', confidence: 'none' }

  const scores = scoreSystem(trimmed)
  const top = scores[0]
  const second = scores[1]

  if (!top || top.score < 2) return { system: 'dnd5e', confidence: 'none' }
  if (top.score >= 5 && (!second || top.score - second.score >= 2)) {
    return { system: top.system, confidence: 'high' }
  }
  if (top.score >= 3) return { system: top.system, confidence: 'medium' }
  return { system: top.system, confidence: 'low' }
}

/* ------------------------------------------------------------------------ */
/* Shared extraction helpers                                                */
/* ------------------------------------------------------------------------ */

function lineValue(text: string, label: RegExp): string {
  const m = text.match(label)
  return m?.[1]?.trim() ?? ''
}

function firstLine(text: string): string {
  return text.split('\n').map((l) => l.trim()).find(Boolean) ?? ''
}

function toHitDice(raw: string): number {
  return parseHitDice(raw).count
}

function toAscendingAc(raw: string): number {
  const text = raw.trim()
  const bracket = text.match(/\[(\d+)\]/)
  if (bracket) return Number(bracket[1])
  const n = parseInt(text, 10)
  if (Number.isNaN(n)) return 12
  // B/X descending (≤9) or AD&D descending (≤10) — use 19−n as B/X default;
  // AD&D-only blocks are parsed separately when detected.
  if (n <= 9) return 19 - n
  return n
}

function toAdndAscendingAc(raw: string): number {
  const n = parseInt(raw, 10)
  if (Number.isNaN(n)) return 12
  if (n <= 10) return 20 - n
  return n
}

function toMorale(raw: string): number {
  const n = parseInt(raw, 10)
  return Number.isNaN(n) ? 8 : Math.min(12, Math.max(2, n))
}

function toAlignment(raw: string): 'L' | 'N' | 'C' {
  const t = raw.toLowerCase()
  if (/\ble\b|\blawful\b|\bl\b/.test(t) && !/\bchaotic\b|\bce\b|\bc\b/.test(t)) return 'L'
  if (/\bce\b|\bchaotic\b|\bc\b/.test(t)) return 'C'
  return 'N'
}

function toSpeedFeet(raw: string): number {
  const text = raw.trim()
  const paren = text.match(/\((\d+)/)
  if (paren) return Number(paren[1])
  const near = text.toLowerCase()
  if (near.includes('double near')) return 40
  if (near.includes('near')) return 30
  if (near.includes('close')) return 15
  const inch = text.match(/(\d+)\s*[″"]/)
  if (inch) return Math.round(Number(inch[1]) * 2.5)
  const n = parseInt(text, 10)
  if (Number.isNaN(n)) return 30
  if (n > 60) return Math.round(n / 4)
  return n
}

function stripName(name: string): string {
  return name.replace(/[#*]+/g, '').trim()
}

function titleCase(s: string): string {
  return s.replace(/\b\w/g, (c) => c.toUpperCase())
}

/** Normalize attack lines into forge atkText: "Name 1d6 (note); …" */
function normalizeAttacks(raw: string): string {
  if (!raw.trim()) return DEFAULT_FORGE.atkText

  const chunks = raw
    .split(/\s*(?:;\s*|\s+and\s+|\s*,\s*(?=[A-Za-z\d]))/i)
    .map((s) => s.trim())
    .filter(Boolean)

  const parts = chunks.map((chunk) => {
    let s = chunk
      .replace(/\s+[+-]\d+(?:\s+to\s+hit|\s+melee|\s+ranged|\s+for\s+strikes?)?/gi, '')
      .replace(/\([^)]*?\+\d+[^)]*?\)/g, (m) => m.replace(/(\d+d\d+)\s*\+\s*\d+/i, '$1'))
      .trim()

    const diceMatch = s.match(DICE_RE)
    const dice = diceMatch?.[0]?.replace(/\s+/g, '') ?? '1d6'

    let note = ''
    const paren = s.match(/\(([^)]+)\)/)
    if (paren && !DICE_RE.test(paren[1])) note = paren[1].replace(/\s*plus\s*/gi, ' ').trim()
    else if (paren && DICE_RE.test(paren[1])) {
      const inner = paren[1].replace(DICE_RE, '').replace(/[+,]/g, ' ').replace(/\bplus\b/gi, ' ').trim()
      if (inner) note = inner
    } else {
      const plusNote = s.match(/\bplus\s+(.+)$/i)
      if (plusNote) note = plusNote[1].trim()
    }

    let name = s
      .replace(/\([^)]*\)/g, '')
      .replace(DICE_RE, '')
      .replace(/\bplus\b.+/i, '')
      .replace(/\b(?:piercing|slashing|bludgeoning|cold|fire|acid|lightning|poison)\b/gi, '')
      .replace(/\s+/g, ' ')
      .trim()

    name = name.replace(/^(\d+)\s+/, (_, n) => `${n} `)

    if (!name) name = 'Attack'
    return `${name} ${dice}${note ? ` (${note})` : ''}`
  })

  return parts.length ? parts.join('; ') : DEFAULT_FORGE.atkText
}

function firstBonus(raw: string): number | undefined {
  const match = raw.match(/([+−-]\d+)\s*(?:to hit|melee|missile fire|ranged|for strikes?)/i)
  if (!match) return undefined
  const value = Number(match[1].replace('−', '-'))
  return Number.isFinite(value) ? value : undefined
}

function firstNumber(raw: string): number | undefined {
  const match = raw.match(/-?\d+/)
  return match ? Number(match[0]) : undefined
}

function sourceProfile(
  system: string,
  values: Omit<ForgeSourceProfile, 'system'>,
): ForgeSourceProfile {
  return { system, ...values }
}

function parseFiveEActions(text: string): {
  atkText: string
  attackBonus?: number
} {
  const lines = text.split('\n').map((line) => line.trim()).filter(Boolean)
  const actionsIndex = lines.findIndex((line) => /^actions?\s*:?\s*$/i.test(line))
  const candidates =
    actionsIndex >= 0
      ? lines.slice(actionsIndex + 1).filter((line) =>
          !/^(?:reactions?|legendary actions?|lair actions?|bonus actions?)\s*:?\s*$/i.test(line),
        )
      : lines
  const attacks: string[] = []
  const bonuses: number[] = []

  for (const line of candidates) {
    const action = line.match(
      /^([A-Z][A-Za-z '\-]+)\.\s+(?:Melee|Ranged|Melee or Ranged)[^:]*:\s*([+−-]\d+)\s+to hit.*?\bHit:\s*(?:\d+\s*)?\((\d+d\d+(?:\s*[+-]\s*\d+)?)\)(.*)$/i,
    )
    if (!action) continue
    const bonus = Number(action[2].replace('−', '-'))
    const note = action[4]
      .replace(/^[,.\s]+/, '')
      .replace(/\b(?:bludgeoning|piercing|slashing)\s+damage\b\.?/i, '')
      .trim()
    attacks.push(
      `${action[1].trim()} ${action[3].replace(/\s+/g, '')}${note ? ` (${note})` : ''}`,
    )
    if (Number.isFinite(bonus)) bonuses.push(bonus)
  }

  if (attacks.length > 0) {
    return {
      atkText: attacks.join('; '),
      attackBonus: bonuses.length ? Math.max(...bonuses) : undefined,
    }
  }

  const compact =
    lineValue(text, /actions?\s*:?\s*([^\n]+)/i) ||
    lineValue(text, /(?:multiattack|attack)\s*:?\s*([^\n]+)/i)
  return { atkText: normalizeAttacks(compact), attackBonus: firstBonus(compact) }
}

function collectTraits(text: string, skipPatterns: RegExp[]): string {
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean)
  const traits: string[] = []

  for (const line of lines) {
    if (skipPatterns.some((re) => re.test(line))) continue
    const trait = line.match(/^([A-Z][A-Za-z .'-]+)\.\s+(.+)$/)
    if (trait) {
      traits.push(`${trait[1].trim()}: ${trait[2].trim()}`)
      continue
    }
    const colon = line.match(/^([A-Z][A-Za-z .'-]+):\s+(.+)$/)
    if (colon && !/^(AC|HP|HD|MV|ML|AL|ATK|Att|Speed|Armor|Init|Act|SV|SP|Level|Perception)/i.test(colon[1])) {
      traits.push(`${colon[1].trim()}: ${colon[2].trim()}`)
    }
  }

  return traits.join('\n')
}

function mergeForge(
  partial: Partial<ForgeMonster>,
  found: string[],
): { forge: ForgeMonster; fieldsFound: string[] } {
  const forge = { ...DEFAULT_FORGE, ...partial }
  if (!forge.name) forge.name = 'Unknown Creature'
  return { forge, fieldsFound: found }
}

/* ------------------------------------------------------------------------ */
/* Per-system parsers                                                       */
/* ------------------------------------------------------------------------ */

function parse5e(text: string): { forge: Partial<ForgeMonster>; fieldsFound: string[]; warnings: string[] } {
  const fields: string[] = []
  const warnings: string[] = []
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean)

  let name = stripName(firstLine(text))
  if (name) fields.push('name')

  const typeLine = lines[1] ?? ''
  const typeMatch = typeLine.match(
    /^(?:tiny|small|medium|large|huge|gargantuan)\s+([a-z]+(?:\s+[a-z]+)?)\s*,?\s*(.*)$/i,
  )
  const size = typeLine.match(/^(tiny|small|medium|large|huge|gargantuan)\b/i)?.[1]
  let kind = 'monster'
  let al: 'L' | 'N' | 'C' = 'N'
  let ep = ''
  if (typeMatch) {
    kind = typeMatch[1].toLowerCase()
    if (typeMatch[2]) al = toAlignment(typeMatch[2])
    fields.push('kind', 'alignment')
  } else if (/medium|small|large|tiny|huge|gargantuan|undead|beast|humanoid/i.test(typeLine)) {
    kind = typeLine.split(/[,\s]/).find((w) => /undead|beast|humanoid|aberration|fiend|monstrosity|dragon|plant|construct|ooze/i.test(w))?.toLowerCase() ?? 'monster'
    al = toAlignment(typeLine)
    fields.push('kind', 'alignment')
  }

  const acRaw = lineValue(text, /(?:armor class|ac)\s*:?\s*([^\n]+)/i)
  const ac = acRaw ? firstNumber(acRaw) ?? DEFAULT_FORGE.ac : DEFAULT_FORGE.ac
  if (acRaw) fields.push('ac')

  const hpLine = lineValue(text, /hit points?\s*:?\s*([^\n]+)/i)
  const exactHp = firstNumber(hpLine)
  let hd = DEFAULT_FORGE.hd
  const hdFromParen = hpLine.match(/\((\d+d\d+(?:\s*[+-]\s*\d+)?)\)/i)
  if (hdFromParen) {
    hd = toHitDice(hdFromParen[1])
    fields.push('hd')
  } else if (exactHp !== undefined) {
    warnings.push('Hit Points had no hit-dice expression; exact HP was preserved but HD needs review.')
  }

  const speedRaw = lineValue(text, /speed\s*:?\s*([^\n]+)/i)
  const speed = speedRaw ? toSpeedFeet(speedRaw) : DEFAULT_FORGE.speed
  if (speedRaw) fields.push('speed')

  const parsedActions = parseFiveEActions(text)
  const atkText = parsedActions.atkText
  if (atkText !== DEFAULT_FORGE.atkText) fields.push('attacks')
  const challengeRaw = lineValue(text, /\bchallenge\s*:?\s*(\d+\/\d+|\d+)/i)

  const traitsText = collectTraits(text, [
    /^[A-Z][A-Za-z .'-]+\s*,/i,
    /^(?:armor class|hit points?|speed|str|dex|con|int|wis|cha|actions?|challenge)/i,
    /^[A-Z]{2,}\s+\d+/,
  ])

  if (traitsText) fields.push('traits')

  return {
    forge: {
      name,
      ep,
      hd,
      ac,
      speed,
      ml: DEFAULT_FORGE.ml,
      al,
      kind,
      atkText,
      traitsText,
      sourceProfile: sourceProfile('dnd5e', {
        hp: exactHp,
        hitDice: hdFromParen?.[1]?.replace(/\s+/g, ''),
        challenge: challengeRaw || undefined,
        size: size ? titleCase(size) : undefined,
        movement: speedRaw || undefined,
        attackBonus: parsedActions.attackBonus,
      }),
    },
    fieldsFound: fields,
    warnings,
  }
}

function parseOse(text: string): { forge: Partial<ForgeMonster>; fieldsFound: string[]; warnings: string[] } {
  const fields: string[] = []
  const name = stripName(firstLine(text))
  if (name) fields.push('name')

  const acRaw = lineValue(text, /\bac\s*:?\s*([^\n]+)/i)
  const ac = acRaw ? toAscendingAc(acRaw) : DEFAULT_FORGE.ac
  if (acRaw) fields.push('ac')

  const hdRaw = lineValue(text, /\bhd\s*:?\s*([^\n]+)/i)
  const hdProfile = parseHitDice(hdRaw, DEFAULT_FORGE.hd as number)
  const hd = hdRaw ? hdProfile.notation : DEFAULT_FORGE.hd
  if (hdRaw) fields.push('hd')
  const exactHp = hdRaw.match(/\((\d+)\s*hp\)/i)?.[1]

  const attRaw = lineValue(text, /\batt\s*:?\s*([^\n]+)/i)
  const atkText = attRaw
    ? normalizeAttacks(attRaw.replace(/\s*[×x]\s*/gi, ' ').replace(/\+/g, ' '))
    : DEFAULT_FORGE.atkText
  if (attRaw) fields.push('attacks')

  const mvRaw = lineValue(text, /\bmv\s*:?\s*([^\n]+)/i)
  const speed = mvRaw ? toSpeedFeet(mvRaw) : DEFAULT_FORGE.speed
  if (mvRaw) fields.push('speed')

  const mlRaw = lineValue(text, /\bml\s*:?\s*(\d+)/i)
  const ml = mlRaw ? toMorale(mlRaw) : DEFAULT_FORGE.ml
  if (mlRaw) fields.push('morale')

  const alRaw = lineValue(text, /\bal\s*:?\s*([^\n]+)/i)
  const al = alRaw ? toAlignment(alRaw) : DEFAULT_FORGE.al
  if (alRaw) fields.push('alignment')
  const thac0Raw = lineValue(text, /\bthac0\s*:?\s*(\d+)/i)
  const xpRaw = lineValue(text, /\bxp\s*:?\s*([\d,]+)/i)
  const svRaw = lineValue(text, /\bsv\s*:?\s*([^\n]+)/i)

  const traitsText = collectTraits(text, [/^(?:AC|HD|Att|THAC0|MV|SV|ML|AL|XP)\b/i])
  if (svRaw) fields.push('saves')

  return {
    forge: {
      name,
      ep: '',
      hd,
      ac,
      speed,
      ml,
      al,
      kind: 'monster',
      saves: svRaw || undefined,
      atkText,
      traitsText,
      sourceProfile: sourceProfile('ose', {
        hp: exactHp ? Number(exactHp) : averageHitPoints(hdProfile),
        hitDice: hdProfile.notation,
        movement: mvRaw || undefined,
        thac0: thac0Raw ? Number(thac0Raw) : undefined,
        xp: xpRaw ? Number(xpRaw.replace(/,/g, '')) : undefined,
        attackBonus: firstBonus(attRaw),
      }),
    },
    fieldsFound: fields,
    warnings: [],
  }
}

function parseAdd1(text: string): { forge: Partial<ForgeMonster>; fieldsFound: string[]; warnings: string[] } {
  const fields: string[] = []
  const name = stripName(firstLine(text))
  if (name) fields.push('name')

  const acRaw = lineValue(text, /(?:armor class|ac)\s*:?\s*(\d+)/i)
  const ac = acRaw ? toAdndAscendingAc(acRaw) : DEFAULT_FORGE.ac
  if (acRaw) fields.push('ac')

  const hdRaw = lineValue(text, /hit dice\s*:?\s*([^\n]+)/i)
  const hdProfile = parseHitDice(hdRaw, DEFAULT_FORGE.hd as number)
  const hd = hdRaw ? hdProfile.notation : DEFAULT_FORGE.hd
  if (hdRaw) fields.push('hd')

  const moveRaw = lineValue(text, /move\s*:?\s*([^\n]+)/i)
  const moveInches = moveRaw.match(/(\d+)\s*[″"]/)
  const speed = moveInches
    ? Math.round(Number(moveInches[1]) * 2.5)
    : moveRaw
      ? toSpeedFeet(moveRaw)
      : DEFAULT_FORGE.speed
  if (moveRaw) fields.push('speed')

  const natt = lineValue(text, /no\.\s*of\s*attacks\s*:?\s*(\d+)/i)
  const dmg = lineValue(text, /damage\/attack\s*:?\s*([^\n]+)/i)
  let atkText = DEFAULT_FORGE.atkText
  if (dmg) {
    const dice = dmg.split('/').map((d) => d.trim())
    const count = natt ? parseInt(natt, 10) : dice.length
    if (count > 1 && dice.length === 1) {
      atkText = `${count} × Attack ${dice[0]}`
    } else {
      atkText = dice.map((d, i) => `Attack ${i + 1} ${d}`).join('; ')
    }
    fields.push('attacks')
  }

  const sa = lineValue(text, /special attacks?\s*:?\s*([^\n]+)/i)
  const sd = lineValue(text, /special defenses?\s*:?\s*([^\n]+)/i)
  const intel = lineValue(text, /intelligence\s*:?\s*([^\n]+)/i)
  const alRaw = lineValue(text, /alignment\s*:?\s*([^\n]+)/i)
  const frequency = lineValue(text, /frequency\s*:?\s*([^\n]+)/i)
  const numberAppearing =
    lineValue(text, /no\.\s*(?:appearing|encountered)\s*:?\s*([^\n]+)/i)
  const lairChance = lineValue(text, /(?:%\s*in\s*lair|lair probability)\s*:?\s*([^\n]+)/i)
  const treasureType = lineValue(text, /treasure(?:\s+type)?\s*:?\s*([^\n]+)/i)
  const magicResistance = lineValue(text, /magic resistance\s*:?\s*([^\n]+)/i)
  const size = lineValue(text, /size\s*:?\s*([^\n]+)/i)
  const psionics = lineValue(text, /psionic ability\s*:?\s*([^\n]+)/i)
  const xpText = lineValue(text, /(?:level\s*\/\s*)?x\.?p\.?(?:\s+value)?\s*:?\s*([^\n]+)/i)
  const xp = xpText.match(/[\d,]+/)?.[0]

  const traits: string[] = []
  if (sa && !/^nil$/i.test(sa)) traits.push(`${sa}: see special attack`)
  if (sd && !/^nil$/i.test(sd)) traits.push(`${sd}: see special defense`)
  const traitsText = traits.join('\n')
  if (traitsText) fields.push('traits')

  const kind = /animal/i.test(intel)
    ? 'beast'
    : /undead/i.test(text)
      ? 'undead'
      : /construct/i.test(text)
        ? 'construct'
        : /plant/i.test(text)
          ? 'plant'
          : 'monster'
  const al = alRaw ? toAlignment(alRaw) : DEFAULT_FORGE.al
  if (alRaw) fields.push('alignment')

  return {
    forge: {
      name,
      ep: '',
      hd,
      ac,
      speed,
      ml: DEFAULT_FORGE.ml,
      al,
      kind,
      atkText,
      traitsText,
      sourceProfile: sourceProfile('add1', {
        hp: averageHitPoints(hdProfile),
        hitDice: hdProfile.notation,
        movement: moveRaw || undefined,
        frequency: frequency || undefined,
        numberAppearing: numberAppearing || undefined,
        lairChance: lairChance || undefined,
        treasureType: treasureType || undefined,
        magicResistance: magicResistance || undefined,
        intelligence: intel || undefined,
        size: size || undefined,
        psionics: psionics || undefined,
        xp: xp ? Number(xp.replace(/,/g, '')) : undefined,
      }),
    },
    fieldsFound: fields,
    warnings: [],
  }
}

function parseShadowdark(text: string): { forge: Partial<ForgeMonster>; fieldsFound: string[]; warnings: string[] } {
  const fields: string[] = []
  const name = stripName(firstLine(text))
  if (name) fields.push('name')

  const acRaw = lineValue(text, /\bac\s*:?\s*(\d+)/i)
  const ac = acRaw ? Number(acRaw) : DEFAULT_FORGE.ac
  if (acRaw) fields.push('ac')

  const hdRaw = lineValue(text, /\blv\s*:?\s*(\d+)/i) || lineValue(text, /\bhd\s*:?\s*([^\n]+)/i)
  const hd = hdRaw ? toHitDice(hdRaw) : DEFAULT_FORGE.hd
  if (hdRaw) fields.push('hd')
  const hpRaw = lineValue(text, /\bhp\s*:?\s*(\d+)/i)

  const atkRaw = lineValue(text, /\batk\s*:?\s*([^\n]+)/i)
  const atkText = atkRaw ? normalizeAttacks(atkRaw) : DEFAULT_FORGE.atkText
  if (atkRaw) fields.push('attacks')

  const mvRaw = lineValue(text, /\bmv\s*:?\s*([^\n]+)/i)
  const speed = mvRaw ? toSpeedFeet(mvRaw) : DEFAULT_FORGE.speed
  if (mvRaw) fields.push('speed')

  const alRaw = lineValue(text, /\bal\s*:?\s*([^\n]+)/i)
  const al = alRaw ? toAlignment(alRaw) : DEFAULT_FORGE.al
  if (alRaw) fields.push('alignment')

  const traitsText = collectTraits(text, [/^(?:AC|HP|ATK|MV|Stats|AL|LV)\b/i])

  return {
    forge: {
      name,
      ep: '',
      hd,
      ac,
      speed,
      ml: DEFAULT_FORGE.ml,
      al,
      kind: 'monster',
      atkText,
      traitsText,
      sourceProfile: sourceProfile('shadowdark', {
        hp: hpRaw ? Number(hpRaw) : undefined,
        level: Number(hd),
        movement: mvRaw || undefined,
        attackBonus: firstBonus(atkRaw),
      }),
    },
    fieldsFound: fields,
    warnings: [],
  }
}

function parseDcc(text: string): { forge: Partial<ForgeMonster>; fieldsFound: string[]; warnings: string[] } {
  const fields: string[] = []
  const name = stripName(firstLine(text))
  if (name) fields.push('name')

  const acRaw = lineValue(text, /\bac\s*:?\s*(\d+)/i)
  const ac = acRaw ? Number(acRaw) : DEFAULT_FORGE.ac
  if (acRaw) fields.push('ac')

  const hdRaw = lineValue(text, /\bhd\s*:?\s*([^\n]+)/i)
  const hdProfile = parseHitDice(hdRaw, DEFAULT_FORGE.hd as number)
  const hd = hdRaw ? hdProfile.notation : DEFAULT_FORGE.hd
  if (hdRaw) fields.push('hd')
  const exactHp = hdRaw?.match(/\((\d+)\s*hp\)/i)?.[1]

  const atkRaw = lineValue(text, /\batk\s*:?\s*([^\n]+)/i)
  const atkText = atkRaw ? normalizeAttacks(atkRaw) : DEFAULT_FORGE.atkText
  if (atkRaw) fields.push('attacks')

  const mvRaw = lineValue(text, /\bmv\s*:?\s*([^\n]+)/i)
  const speed = mvRaw ? toSpeedFeet(mvRaw) : DEFAULT_FORGE.speed
  if (mvRaw) fields.push('speed')

  const alRaw = lineValue(text, /\bal\s*:?\s*([^\n]+)/i)
  const al = alRaw ? toAlignment(alRaw) : DEFAULT_FORGE.al
  if (alRaw) fields.push('alignment')

  const initRaw = lineValue(text, /\binit\s*:?\s*([^\n]+)/i)
  const actRaw = lineValue(text, /\bact\s*:?\s*([^\n]+)/i)
  const critRaw = lineValue(text, /\bcrit\s*:?\s*([^\n]+)/i)
  const svRaw = lineValue(text, /\bsv\s*:?\s*([^\n]+)/i)

  const spRaw = lineValue(text, /\bsp\s*:?\s*([^\n]+)/i)
  const traitsText =
    spRaw && !/^none$/i.test(spRaw)
      ? spRaw
          .split(',')
          .map((s) => `${titleCase(s.trim())}: see ability`)
          .join('\n')
      : collectTraits(text, [/^(?:Init|Atk|AC|HD|MV|Act|SP|SV|AL)\b/i])
  if (traitsText) fields.push('traits')
  if (svRaw) fields.push('saves')

  return {
    forge: {
      name,
      ep: '',
      hd,
      ac,
      speed,
      ml: DEFAULT_FORGE.ml,
      al,
      kind: 'monster',
      saves: svRaw || undefined,
      atkText,
      traitsText,
      sourceProfile: sourceProfile('dcc', {
        hp: exactHp ? Number(exactHp) : averageHitPoints(hdProfile),
        hitDice: hdProfile.notation,
        movement: mvRaw || undefined,
        attackBonus: firstBonus(atkRaw),
        initiative: firstBonus(initRaw),
        actionDice: actRaw || undefined,
        crit: critRaw || undefined,
      }),
    },
    fieldsFound: fields,
    warnings: [],
  }
}

function parseMorkborg(text: string): { forge: Partial<ForgeMonster>; fieldsFound: string[]; warnings: string[] } {
  const fields: string[] = []
  const name = stripName(firstLine(text))
  if (name) fields.push('name')

  const hpRaw = lineValue(text, /\bhp\s*:?\s*(\d+)/i)
  const hd = hpRaw ? Math.max(1, Math.round(Number(hpRaw) / 4)) : DEFAULT_FORGE.hd
  if (hpRaw) fields.push('hd')

  const mlRaw = lineValue(text, /\bmorale\s*:?\s*(\d+)/i)
  const ml = mlRaw ? toMorale(mlRaw) : DEFAULT_FORGE.ml
  if (mlRaw) fields.push('morale')

  const armRaw = lineValue(text, /\barmor\s*:?\s*([^\n]+)/i)
  let ac = DEFAULT_FORGE.ac
  if (/d6/i.test(armRaw)) ac = 16
  else if (/d4/i.test(armRaw)) ac = 14
  else if (/d2/i.test(armRaw)) ac = 12
  if (armRaw) fields.push('ac')

  const atkRaw = lineValue(text, /\battack\s*:?\s*([^\n]+)/i)
  const atkText = atkRaw
    ? normalizeAttacks(atkRaw.replace(/\bd(\d+)/gi, (_, d) => `1d${d}`))
    : DEFAULT_FORGE.atkText
  if (atkRaw) fields.push('attacks')

  const traitsText = collectTraits(text, [/^(?:HP|Morale|Armor|Attack)\b/i])

  return {
    forge: {
      name,
      ep: '',
      hd,
      ac,
      speed: DEFAULT_FORGE.speed,
      ml,
      al: 'C',
      kind: 'monster',
      atkText,
      traitsText,
      sourceProfile: sourceProfile('morkborg', {
        hp: hpRaw ? Number(hpRaw) : undefined,
        movement: undefined,
      }),
    },
    fieldsFound: fields,
    warnings: [],
  }
}

function parsePf2e(text: string): { forge: Partial<ForgeMonster>; fieldsFound: string[]; warnings: string[] } {
  const fields: string[] = []
  const name = stripName(firstLine(text))
  if (name) fields.push('name')

  const lvlRaw =
    lineValue(text, /creature\s+(-?\d+)/i) || lineValue(text, /(?:level|creature)\s*:?\s*(-?\d+)/i)
  const level = lvlRaw ? Number(lvlRaw) : undefined
  const hd = level !== undefined ? level + 1 : DEFAULT_FORGE.hd
  if (lvlRaw) fields.push('hd')

  const acRaw = lineValue(text, /\bac\s*:?\s*(\d+)/i)
  const ac = acRaw ? Number(acRaw) : DEFAULT_FORGE.ac
  if (acRaw) fields.push('ac')

  const hpRaw = lineValue(text, /\bhp\s*:?\s*(\d+)/i)
  if (hpRaw) fields.push('hp')

  const spdRaw = lineValue(text, /speed\s*:?\s*([^\n]+)/i)
  const speed = spdRaw ? toSpeedFeet(spdRaw) : DEFAULT_FORGE.speed
  if (spdRaw) fields.push('speed')

  const perceptionRaw = lineValue(text, /perception\s*:?\s*([^\n]+)/i)
  const savesRaw = lineValue(text, /\bsaves?\s*:?\s*([^\n]+)/i)
  const strikesRaw = lineValue(text, /strikes?\s*:?\s*([^\n]+)/i)
  const atkText = strikesRaw ? normalizeAttacks(strikesRaw) : DEFAULT_FORGE.atkText
  if (strikesRaw) fields.push('attacks')
  if (savesRaw) fields.push('saves')

  const traitsText = collectTraits(text, [/^(?:Level|Creature|Perception|AC|HP|Saves|Speed|Strikes)\b/i])

  return {
    forge: {
      name,
      ep: '',
      hd,
      ac,
      speed,
      ml: DEFAULT_FORGE.ml,
      al: DEFAULT_FORGE.al,
      kind: 'monster',
      saves: savesRaw || undefined,
      atkText,
      traitsText,
      sourceProfile: sourceProfile('pf2e', {
        level,
        hp: hpRaw ? Number(hpRaw) : undefined,
        movement: spdRaw || undefined,
        attackBonus: firstBonus(strikesRaw),
        perception: firstBonus(perceptionRaw),
      }),
    },
    fieldsFound: fields,
    warnings: [],
  }
}

function parseKnave(text: string): { forge: Partial<ForgeMonster>; fieldsFound: string[]; warnings: string[] } {
  const fields: string[] = []
  const name = stripName(firstLine(text))
  if (name) fields.push('name')

  const hdRaw = lineValue(text, /\bhd\s*:?\s*([^\n]+)/i)
  const hdProfile = parseHitDice(hdRaw, DEFAULT_FORGE.hd as number)
  const hd = hdRaw ? hdProfile.notation : DEFAULT_FORGE.hd
  if (hdRaw) fields.push('hd')

  const acRaw = lineValue(text, /\bac\s*:?\s*(\d+)/i)
  const ac = acRaw ? Number(acRaw) : DEFAULT_FORGE.ac
  if (acRaw) fields.push('ac')

  const atkRaw = lineValue(text, /\batk\s*:?\s*([^\n]+)/i)
  const atkText = atkRaw ? normalizeAttacks(atkRaw) : DEFAULT_FORGE.atkText
  if (atkRaw) fields.push('attacks')

  const mvRaw = lineValue(text, /\bmv\s*:?\s*([^\n]+)/i)
  const speed = mvRaw ? toSpeedFeet(mvRaw) : DEFAULT_FORGE.speed
  if (mvRaw) fields.push('speed')

  const mlRaw = lineValue(text, /\bml\s*:?\s*(\d+)/i)
  const ml = mlRaw ? toMorale(mlRaw) : DEFAULT_FORGE.ml
  if (mlRaw) fields.push('morale')

  const alRaw = lineValue(text, /\bal\s*:?\s*([^\n]+)/i)
  const al = alRaw ? toAlignment(alRaw) : DEFAULT_FORGE.al
  if (alRaw) fields.push('alignment')

  const traitsText = collectTraits(text, [/^(?:HD|AC|Atk|MV|ML|AL)\b/i])

  return {
    forge: {
      name,
      ep: '',
      hd,
      ac,
      speed,
      ml,
      al,
      kind: 'monster',
      atkText,
      traitsText,
      sourceProfile: sourceProfile('knave', {
        hitDice: hdProfile.notation,
        hp: averageHitPoints(hdProfile),
        movement: mvRaw || undefined,
        attackBonus: firstBonus(atkRaw),
      }),
    },
    fieldsFound: fields,
    warnings: [],
  }
}

const PARSERS: Record<SystemId, (text: string) => ReturnType<typeof parse5e>> = {
  dnd5e: parse5e,
  ose: parseOse,
  add1: parseAdd1,
  shadowdark: parseShadowdark,
  dcc: parseDcc,
  morkborg: parseMorkborg,
  pf2e: parsePf2e,
  knave: parseKnave,
  bfrpg: parseOse,
  osric: parseAdd1,
}

/**
 * Stats and saves occur in enough different layouts that extracting them once,
 * after the system-specific structural parse, is more reliable than repeating
 * the same permissive expressions in every parser.
 */
function extractSupplementalFields(text: string): {
  partial: Partial<ForgeMonster>
  fieldsFound: string[]
} {
  const lines = text.split('\n').map((line) => line.trim()).filter(Boolean)
  const partial: Partial<ForgeMonster> = {}
  const fieldsFound: string[] = []

  const labelledStats = lines
    .map((line) => line.match(/^(?:stats?|abilities)\s*:?\s*(.+)$/i)?.[1]?.trim())
    .find(Boolean)
  const abilityLine = lines.find(
    (line) =>
      /\bSTR\b/i.test(line) &&
      /\bDEX\b/i.test(line) &&
      (/\bCON\b/i.test(line) || /\bWIS\b/i.test(line)),
  )
  const shadowdarkStats = lines.find(
    (line) =>
      /^(?:stats?\s*:?\s*)?S\s*[+−-]?\d+/i.test(line) &&
      /\bD\s*[+−-]?\d+/i.test(line) &&
      /\bW\s*[+−-]?\d+/i.test(line),
  )
  const stats = labelledStats || abilityLine || shadowdarkStats
  if (stats) {
    partial.stats = stats
    fieldsFound.push('stats')
  }

  const saves = lines
    .map((line) => line.match(/^(?:saving throws?|saves?|sv)\s*:?\s*(.+)$/i)?.[1]?.trim())
    .find(Boolean)
  if (saves) {
    partial.saves = saves
    fieldsFound.push('saves')
  }

  return { partial, fieldsFound }
}

/* ------------------------------------------------------------------------ */
/* Public API                                                               */
/* ------------------------------------------------------------------------ */

export function parseStatBlock(text: string, forcedSystem?: string): ParseResult {
  const trimmed = text.trim()
  const warnings: string[] = []

  if (trimmed.length < 12) {
    return {
      system: forcedSystem || 'dnd5e',
      confidence: 'none',
      forge: { ...DEFAULT_FORGE },
      fieldsFound: [],
      warnings: ['Paste a stat block to decipher it.'],
    }
  }

  const detection = forcedSystem
    ? { system: forcedSystem, confidence: 'high' as ParseConfidence }
    : detectSourceSystem(trimmed)

  const system = (SYSTEMS.includes(detection.system as SystemId)
    ? detection.system
    : 'dnd5e') as SystemId

  const parsed = PARSERS[system](trimmed)
  const supplemental = extractSupplementalFields(trimmed)
  const { forge, fieldsFound } = mergeForge(
    { ...parsed.forge, ...supplemental.partial },
    Array.from(new Set([...parsed.fieldsFound, ...supplemental.fieldsFound])),
  )

  if (fieldsFound.length < 2) {
    warnings.push('Only a few fields were recognized — review the forge before transmuting.')
    // Fall back to generic 5E-ish parse if specialist parser found little.
    if (system !== 'dnd5e') {
      const fallback = parse5e(trimmed)
      if (fallback.fieldsFound.length > fieldsFound.length) {
        const merged = mergeForge(fallback.forge, fallback.fieldsFound)
        return {
          system: 'dnd5e',
          confidence: 'low',
          forge: merged.forge,
          fieldsFound: merged.fieldsFound,
          warnings: [...warnings, 'Fell back to a generic read — set the source system manually if needed.'],
        }
      }
    }
  }

  return {
    system,
    confidence: detection.confidence,
    forge,
    fieldsFound,
    warnings: [...warnings, ...parsed.warnings],
  }
}

export function systemLabelForParse(code: string): string {
  const labels: Record<string, string> = {
    dnd5e: 'D&D 5E',
    ose: 'OSE / B/X',
    add1: 'AD&D 1E',
    shadowdark: 'Shadowdark',
    dcc: 'DCC',
    morkborg: 'Mörk Borg',
    pf2e: 'Pathfinder 2E',
    knave: 'Knave',
  }
  return labels[code] ?? code
}
