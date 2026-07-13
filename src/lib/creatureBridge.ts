/**
 * Bridges the converter's neutral "forge" model (ForgeMonster) and the DB's
 * Entry / parsed_json shape — so a converted creature can be saved into the
 * real library, and a library creature can be loaded back into the forge.
 */
import type {
  Entry,
  NewCreature,
  ParsedCreature,
  CreatureAttack,
  CreatureAction,
  CreatureSource,
  OutputCreature,
  OutputStatRow,
} from './types'
import { ForgeMonster, ForgeSourceProfile, format, parseAttacks, parseTraits, plain } from './convert'
import { averageHitPoints, parseHitDice } from './systemRules'
import { normalizeSourceSystem } from './systems'

const AL_LABEL: Record<string, string> = { L: 'Lawful', N: 'Neutral', C: 'Chaotic' }

function firstInt(s: string, fallback: number): number {
  const m = String(s).match(/\d+/)
  return m ? parseInt(m[0], 10) : fallback
}

function rowValue(rows: OutputStatRow[] | undefined, labels: string[]): string {
  const wanted = labels.map((label) => label.toLowerCase())
  return (
    rows?.find((row) => wanted.includes(row.k.toLowerCase()))?.v?.trim() ??
    ''
  )
}

function firstNumber(value: string): number | undefined {
  const match = value.match(/-?\d+/)
  return match ? Number(match[0]) : undefined
}

function ascendingAcFromOutput(
  rows: OutputStatRow[] | undefined,
  targetSystem: string,
): number | undefined {
  const acRaw = rowValue(rows, ['AC', 'Armor Class'])
  if (!acRaw) return undefined
  const bracket = acRaw.match(/\[(\d+)\]/)?.[1]
  if (bracket) return Number(bracket)
  const n = firstNumber(acRaw)
  if (n === undefined) return undefined
  if (targetSystem === 'add1' && n <= 10) return 20 - n
  if (targetSystem === 'ose' && n <= 9 && !acRaw.includes('[')) return 19 - n
  return n
}

function forgeHitPoints(m: ForgeMonster, srcSystem: string): number {
  const hd = Math.max(1, +m.hd || 1)
  const profile = m.sourceProfile
  if (profile?.hp !== undefined) return profile.hp
  const hdProfile = parseHitDice(profile?.hitDice ?? m.hd, hd)
  const block = format(srcSystem, m, srcSystem)
  const fromOutput = firstNumber(rowValue(block.rows, ['HP', 'Hit Points']))
  return fromOutput ?? averageHitPoints(hdProfile)
}

function forgeLevel(m: ForgeMonster, srcSystem: string): number | undefined {
  if (m.sourceProfile?.level !== undefined) return m.sourceProfile.level
  if (srcSystem === 'pf2e') return Math.max(-1, Math.ceil(+m.hd || 1) - 1)
  if (srcSystem === 'shadowdark') return Math.ceil(+m.hd || 1)
  return Math.ceil(+m.hd || 1)
}

function readSourceProfile(parsed: ParsedCreature): ForgeSourceProfile | undefined {
  const raw = parsed.sourceProfile
  return raw && typeof raw === 'object' ? (raw as ForgeSourceProfile) : undefined
}

function generatedSourceText(m: ForgeMonster, sourceSystem: string): string {
  const details = [
    `Source system: ${sourceSystem}`,
    m.ep && `Description: ${m.ep}`,
    `HD / Level: ${m.hd}`,
    `AC (ascending): ${m.ac}`,
    `Speed: ${m.speed} ft`,
    `Morale: ${m.ml}`,
    `Alignment: ${AL_LABEL[m.al as string] || m.al}`,
    m.kind && `Kind: ${m.kind}`,
    m.stats && `Stats / abilities: ${m.stats}`,
    m.saves && `Saves: ${m.saves}`,
    m.atkText && `Attacks: ${m.atkText}`,
    m.traitsText && `Special traits:\n${m.traitsText}`,
  ].filter(Boolean)
  return [m.name.toUpperCase(), ...details].join('\n')
}

export interface ForgeSaveContext {
  sourceText?: string | null
  source?: CreatureSource
  sourceFields?: string[]
}

/** Build a `NewCreature` (ready to insert) from the forge + chosen systems. */
export function forgeToNewCreature(
  m: ForgeMonster,
  srcSystem: string,
  tgtSystem: string,
  context: ForgeSaveContext = {},
): NewCreature {
  const attacks: CreatureAttack[] = parseAttacks(m.atkText).map((a) => ({
    name: a.n.trim(),
    damage: a.d,
    note: a.note || undefined,
  }))
  const specialActions: CreatureAction[] = parseTraits(m.traitsText).map((t) => ({
    name: t.h,
    description: t.d || undefined,
  }))

  const parsed_json: ParsedCreature = {
    name: m.name,
    system: srcSystem,
    level: forgeLevel(m, srcSystem),
    ac: +m.ac || undefined,
    hp: forgeHitPoints(m, srcSystem),
    morale: +m.ml || undefined,
    movement: (+m.speed || 30) + ' ft',
    alignment: AL_LABEL[m.al as string] || undefined,
    kind: m.kind || undefined,
    stats: m.stats?.trim() || undefined,
    saves: m.saves?.trim() || undefined,
    attacks,
    specialActions,
    description: m.ep || undefined,
    source: context.source,
    sourceFields: context.sourceFields,
    sourceProfile: m.sourceProfile as Record<string, unknown> | undefined,
    hitDice: String(m.sourceProfile?.hitDice ?? m.hd),
    role: m.role,
    targetOverrides: m.targetOverrides,
  }

  const block = format(tgtSystem, m, srcSystem)
  const output_json: OutputCreature = {
    name: block.title,
    system: tgtSystem,
    sourceSystem: srcSystem,
    badge: block.badge,
    ac: ascendingAcFromOutput(block.rows, tgtSystem) ?? (+m.ac || undefined),
    hp: firstNumber(rowValue(block.rows, ['HP', 'Hit Points'])),
    morale: firstNumber(rowValue(block.rows, ['ML', 'Morale'])),
    movement: rowValue(block.rows, ['MV', 'Move', 'Speed']) || undefined,
    saves: rowValue(block.rows, ['SV', 'Saves', 'Saving Throws']) || undefined,
    attacks,
    specialActions,
    description: block.ep || undefined,
    rows: block.rows,
    sections: block.sections,
    text: plain(block),
    generatedBy: 'duskwarden-converter',
    outputProfile: tgtSystem,
  }

  return {
    title: m.name || 'Nameless Thing',
    tags: [],
    source_text: context.sourceText?.trim() || generatedSourceText(m, srcSystem),
    parsed_json,
    output_json,
  }
}

/** Original/source system retained for another conversion pass. */
export function entrySourceSystem(e: Entry): string {
  return normalizeSourceSystem(
    e.parsed_json?.system ||
      e.output_json?.sourceSystem ||
      e.output_json?.system,
  )
}

/** Fields positively identified in the original source, when recorded. */
export function entrySourceFields(e: Entry): string[] {
  const recorded = e.parsed_json?.sourceFields
  if (Array.isArray(recorded)) return recorded.filter((field): field is string => typeof field === 'string')

  const p = e.parsed_json
  if (!p) return []
  const fields: string[] = []
  if (p.name) fields.push('name')
  if (p.level !== undefined || p.hp !== undefined) fields.push('hd')
  if (p.ac !== undefined) fields.push('ac')
  if (p.movement) fields.push('speed')
  if (p.morale !== undefined) fields.push('morale')
  if (p.alignment) fields.push('alignment')
  if (p.kind) fields.push('kind')
  if (p.stats) fields.push('stats')
  if (p.saves) fields.push('saves')
  if (p.attacks?.length) fields.push('attacks')
  if (p.specialActions?.length) fields.push('traits')
  return fields
}

/** Best-effort load of a library creature back into the editable forge. */
export function entryToForge(e: Entry): ForgeMonster {
  const p = e.parsed_json ?? {}
  const o = e.output_json ?? {}
  const rows = Array.isArray(o.rows) ? o.rows : []
  const srcSystem = entrySourceSystem(e)
  const storedProfile = readSourceProfile(p)
  const hitDiceNotation = String(p.hitDice ?? storedProfile?.hitDice ?? '').trim()
  const pfLevelMatch = rowValue(rows, ['Level']).match(/creature\s+(-?\d+)/i)
  const pfLevel =
    storedProfile?.level ??
    (srcSystem === 'pf2e' && pfLevelMatch ? Number(pfLevelMatch[1]) : undefined)
  const outputHd =
    firstNumber(rowValue(rows, ['HD', 'Hit Dice'])) ??
    (pfLevel !== undefined ? pfLevel + 1 : undefined) ??
    firstNumber(rowValue(rows, ['LV', 'Level'])) ??
    (o.hp ? Math.max(1, Math.round(Number(o.hp) / 4)) : undefined)
  const hdFromProfile = hitDiceNotation ? parseHitDice(hitDiceNotation).count : undefined
  const hdValue =
    pfLevel !== undefined
      ? pfLevel + 1
      : p.level ?? (p.hp ? Math.max(1, Math.round(Number(p.hp) / 4)) : outputHd ?? hdFromProfile ?? 1)
  const attacks = Array.isArray(p.attacks)
    ? p.attacks
    : Array.isArray(o.attacks)
      ? o.attacks
      : []
  const atkText = attacks
    .map((a) => [a.name, a.damage].filter(Boolean).join(' ') + (a.note ? ` (${a.note})` : ''))
    .filter(Boolean)
    .join('; ')
  const actions = Array.isArray(p.specialActions)
    ? p.specialActions
    : Array.isArray(o.specialActions)
      ? o.specialActions
      : []
  const traitsText = actions
    .map((a) => (a.description ? `${a.name}: ${a.description}` : a.name))
    .join('\n')
  const alRaw = (p.alignment || '').toString().toUpperCase()
  const al = alRaw.startsWith('L') ? 'L' : alRaw.startsWith('C') ? 'C' : 'N'
  const outputAc = rowValue(rows, ['AC', 'Armor Class'])
  const bracketAc = outputAc.match(/\[(\d+)\]/)?.[1]
  const outputSpeed = rowValue(rows, ['MV', 'Move', 'Speed'])
  const restoredProfile: ForgeSourceProfile | undefined = storedProfile
    ? {
        ...storedProfile,
        hitDice: storedProfile.hitDice ?? (hitDiceNotation || undefined),
        level: storedProfile.level ?? pfLevel,
        hp: storedProfile.hp ?? (typeof p.hp === 'number' ? p.hp : undefined),
      }
    : hitDiceNotation || pfLevel !== undefined || typeof p.hp === 'number'
      ? {
          system: srcSystem,
          hitDice: hitDiceNotation || undefined,
          level: pfLevel,
          hp: typeof p.hp === 'number' ? p.hp : undefined,
        }
      : undefined

  return {
    name: p.name?.trim() || e.title?.trim() || o.name?.trim() || 'Nameless Thing',
    ep: String(p.description || o.description || '').trim(),
    hd: hitDiceNotation || hdValue,
    ac: Number(p.ac) || Number(bracketAc) || ascendingAcFromOutput(rows, srcSystem) || 12,
    speed: p.movement
      ? firstInt(String(p.movement), 30)
      : outputSpeed
        ? firstInt(outputSpeed, 30)
        : 30,
    ml: Number(p.morale) || Number(o.morale) || 8,
    al,
    kind: p.kind?.trim() || '',
    stats: p.stats?.trim() || '',
    saves: p.saves?.trim() || '',
    statsOverride: '',
    savesOverride: '',
    role: typeof p.role === 'string' ? (p.role as ForgeMonster['role']) : undefined,
    sourceProfile: restoredProfile,
    targetOverrides:
      p.targetOverrides && typeof p.targetOverrides === 'object'
        ? (p.targetOverrides as ForgeMonster['targetOverrides'])
        : undefined,
    atkText: atkText || 'Strike 1d6',
    traitsText,
  }
}
