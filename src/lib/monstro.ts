/**
 * monstro.cc integration — an independent OSR bestiary with a JSON API.
 *
 * The index lists ~1300 monsters; each detail document is JSON-LD with one
 * "portrayal" (stat block) per sourcebook. We map the chosen portrayal
 * straight into the converter's structured ForgeMonster model instead of
 * round-tripping through flattened text.
 */

import type { ForgeMonster, ForgeSourceProfile } from './convert'
import { averageHitPoints, parseHitDice } from './systemRules'

export interface MonstroIndexItem {
  title: string
  slug: string
  description?: string | null
  type?: string | null
  biome?: string | null
  sourcebooks?: string[]
  url?: string
}

export interface MonstroPortrayal {
  'dc:source'?: string
  description?: string | null
  specialAbilities?: Array<{ name?: string; description?: string | null }> | null
  stats?: Record<string, unknown> | null
  'fabio:isPartOf'?: {
    '@id'?: string
    'schema:name'?: string
  }
}

export interface MonstroDetail {
  slug?: string
  'dc:title'?: string
  'dc:description'?: string
  'schema:name'?: string
  'fabio:hasPortrayal'?: MonstroPortrayal[]
}

export const SOURCEBOOK_OPTIONS = [
  { value: '', label: 'All sourcebooks' },
  { value: 'bfrpg', label: 'Basic Fantasy RPG' },
  { value: 'ose', label: 'Old-School Essentials' },
  { value: 'carcass-crawler', label: 'Carcass Crawler' },
  { value: 'osric', label: 'OSRIC' },
  { value: 'field-guide-omnibus', label: 'Field Guide' },
] as const

export function sourcebookLabel(slug?: string): string {
  if (!slug) return 'unknown source'
  const match = SOURCEBOOK_OPTIONS.find((o) => o.value && slug.includes(o.value))
  return match?.label ?? slug.replace(/-/g, ' ')
}

function sourcebookIdForPortrayal(portrayal: MonstroPortrayal): string {
  const id = portrayal['fabio:isPartOf']?.['@id'] ?? ''
  return id.split('/').filter(Boolean).pop()?.toLowerCase() ?? ''
}

export function portrayalSourcebook(portrayal: MonstroPortrayal): {
  id: string
  label: string
} {
  const id = sourcebookIdForPortrayal(portrayal)
  const label =
    portrayal['fabio:isPartOf']?.['schema:name']?.trim() ||
    portrayal['dc:source']?.trim() ||
    sourcebookLabel(id)
  return { id, label }
}

/** Converter source-system code represented by a Monstro portrayal. */
export function portrayalSourceSystem(portrayal: MonstroPortrayal): string {
  const { id, label } = portrayalSourcebook(portrayal)
  const source = `${id} ${label}`.toLowerCase()
  if (source.includes('bfrpg') || source.includes('basic fantasy')) return 'bfrpg'
  if (source.includes('osric')) return 'osric'
  if (
    source.includes('ose') ||
    source.includes('old-school essentials') ||
    source.includes('carcass crawler')
  ) {
    return 'ose'
  }
  return 'other'
}

/** Show every available source instead of implying that the first will be used. */
export function sourcebookSummary(sourcebooks: string[] = [], activeFilter = ''): string {
  if (activeFilter) return sourcebookLabel(activeFilter)
  const labels = Array.from(new Set(sourcebooks.map(sourcebookLabel)))
  return labels.length > 0 ? labels.join(' · ') : 'unknown source'
}

/* ------------------------------------------------------------------------ */
/* Fetchers (index cached in module memory for the session)                 */
/* ------------------------------------------------------------------------ */

let indexCache: MonstroIndexItem[] | null = null

export async function fetchMonsterIndex(): Promise<MonstroIndexItem[]> {
  if (indexCache) return indexCache
  const res = await fetch('https://monstro.cc/monster/index.json')
  if (!res.ok) throw new Error('Failed to load the monstro.cc bestiary')
  const data = (await res.json()) as { items?: MonstroIndexItem[] }
  indexCache = Array.isArray(data.items) ? data.items : []
  return indexCache
}

export async function fetchMonsterDetail(slug: string): Promise<MonstroDetail> {
  const res = await fetch(`https://monstro.cc/monster/${slug}/index.json`)
  if (!res.ok) throw new Error('Failed to load monster details')
  return (await res.json()) as MonstroDetail
}

/**
 * Pick the active sourcebook. With "All sourcebooks", prefer the index's
 * advertised order so the row label and imported portrayal cannot disagree.
 */
export function pickPortrayal(
  detail: MonstroDetail,
  sourcebookFilter?: string,
  preferredSourcebooks: string[] = [],
): MonstroPortrayal | undefined {
  const portrayals = Array.isArray(detail['fabio:hasPortrayal'])
    ? detail['fabio:hasPortrayal']
    : []
  const preferences = sourcebookFilter ? [sourcebookFilter] : preferredSourcebooks
  for (const preference of preferences) {
    const match = portrayals.find((p) =>
      (p['fabio:isPartOf']?.['@id'] ?? '').toLowerCase().includes(preference.toLowerCase()),
    )
    if (match) return match
  }
  return portrayals[0]
}

/* ------------------------------------------------------------------------ */
/* Portrayal → ForgeMonster mapping                                         */
/* ------------------------------------------------------------------------ */

const DICE_RE = /\d*d\d+(?:\s*[+-]\s*\d+)?/i

/**
 * AC arrives in several notations:
 *   "6 [13]"  — OSE: descending with ascending in brackets → use 13
 *   14        — BFRPG: already ascending
 *   6         — OSRIC/old-school: descending → convert (19 - n)
 */
function toAscendingAc(raw: unknown): number {
  const text = String(raw ?? '').trim()
  const bracket = text.match(/\[(\d+)\]/)
  if (bracket) return Number(bracket[1])
  const n = parseInt(text, 10)
  if (Number.isNaN(n)) return 12
  return n <= 9 ? 19 - n : n
}

/** "2*", "2* (9hp)", "3+1" → structured hit dice profile. */
function toHitDiceProfile(raw: unknown): ReturnType<typeof parseHitDice> {
  return parseHitDice(raw, 1)
}

/** "90' (30')" → 30 (encounter speed); "30'" → 30. */
function toSpeed(raw: unknown): number {
  const text = String(raw ?? '').trim()
  const paren = text.match(/\((\d+)/)
  if (paren) return Number(paren[1])
  const n = parseInt(text, 10)
  return Number.isNaN(n) ? 30 : n
}

function toMorale(raw: unknown): number {
  const n = parseInt(String(raw ?? '').trim(), 10)
  return Number.isNaN(n) ? 8 : Math.min(12, Math.max(2, n))
}

function toAlignment(raw: unknown): 'L' | 'N' | 'C' {
  const text = String(raw ?? '').toLowerCase()
  if (text.startsWith('l')) return 'L'
  if (text.startsWith('c')) return 'C'
  return 'N'
}

/**
 * Build the converter's atkText ("Name dice (note); …") from the two shapes
 * monstro uses:
 *   OSE:   attacks: ["2 × claw (1d3 + paralysis)"]           — dice inline
 *   BFRPG: attacks: ["2 claws", "1 bite"], damage: "1d4 all + paralysis"
 */
function toAtkText(attacks: unknown, damage: unknown): string {
  const list = Array.isArray(attacks)
    ? attacks.map((a) => String(a).trim()).filter(Boolean)
    : typeof attacks === 'string'
      ? attacks.split(/[;,]/).map((a) => a.trim()).filter(Boolean)
      : []
  const damageText = String(damage ?? '').trim()
  const sharedDice = damageText.match(DICE_RE)?.[0]?.replace(/\s+/g, '') ?? ''
  const sharedNote = damageText
    .replace(DICE_RE, '')
    .replace(/\ball\b/gi, ' ')
    .replace(/[+,]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  const parts = list.map((entry) => {
    const cleaned = entry.replace(/[×x]\s*/gi, '').replace(/\s+/g, ' ').trim()
    const paren = cleaned.match(/^(.*?)\s*\((.+)\)\s*$/)
    if (paren) {
      // Dice live inside the parenthetical: "2 claw (1d3 + paralysis)"
      const name = paren[1].trim()
      const inner = paren[2]
      const dice = inner.match(DICE_RE)?.[0]?.replace(/\s+/g, '') || sharedDice || '1d4'
      const note = inner.replace(DICE_RE, '').replace(/[+,]/g, ' ').replace(/\s+/g, ' ').trim()
      return `${name} ${dice}${note ? ` (${note})` : ''}`
    }
    const inlineDice = cleaned.match(DICE_RE)?.[0]?.replace(/\s+/g, '')
    if (inlineDice) {
      const name = cleaned.replace(DICE_RE, '').replace(/\s+/g, ' ').trim()
      return `${name || 'Attack'} ${inlineDice}`
    }
    // Bare attack name — borrow dice/note from the shared damage field.
    return `${cleaned} ${sharedDice || '1d4'}${sharedNote ? ` (${sharedNote})` : ''}`
  })

  return parts.length > 0 ? parts.join('; ') : 'Strike 1d6'
}

function toTraitsText(portrayal: MonstroPortrayal): string {
  return (portrayal.specialAbilities ?? [])
    .map((a) => {
      const name = a.name?.trim()
      const desc = a.description?.replace(/\s+/g, ' ').trim()
      return name && desc ? `${name}: ${desc}` : null
    })
    .filter((line): line is string => Boolean(line))
    .join('\n')
}

function valueText(value: unknown): string {
  if (typeof value === 'string' || typeof value === 'number') return String(value).trim()
  if (Array.isArray(value)) return value.map(valueText).filter(Boolean).join(', ')
  return ''
}

function toStatsText(stats: Record<string, unknown>): string {
  const direct =
    valueText(stats.abilityScores) ||
    valueText(stats.abilities) ||
    valueText(stats.attributeModifiers)
  if (direct) return direct

  const names = [
    ['strength', 'STR'],
    ['dexterity', 'DEX'],
    ['constitution', 'CON'],
    ['intelligence', 'INT'],
    ['wisdom', 'WIS'],
    ['charisma', 'CHA'],
  ] as const
  const values = names
    .map(([key, label]) => {
      const value = valueText(stats[key] ?? stats[label.toLowerCase()])
      return value ? `${label} ${value}` : ''
    })
    .filter(Boolean)
  return values.join(', ')
}

function toSavesText(stats: Record<string, unknown>): string {
  return (
    valueText(stats.savingThrows) ||
    valueText(stats.saves) ||
    valueText(stats.saveAs)
  )
}

export interface MonstroForgeResult {
  forge: ForgeMonster
  fieldsFound: string[]
}

export function monstroToForgeResult(
  item: MonstroIndexItem,
  detail: MonstroDetail,
  portrayal: MonstroPortrayal,
): MonstroForgeResult {
  const stats = portrayal.stats ?? {}
  const statsText = toStatsText(stats)
  const savesText = toSavesText(stats)
  const forge = monstroToForge(item, detail, portrayal)
  const fieldsFound = ['name']

  if (stats.hitDice !== undefined) fieldsFound.push('hd')
  if (stats.armorClass !== undefined) fieldsFound.push('ac')
  if (stats.movement !== undefined || stats.move !== undefined) fieldsFound.push('speed')
  if (stats.morale !== undefined) fieldsFound.push('morale')
  if (stats.alignment !== undefined) fieldsFound.push('alignment')
  if (item.type) fieldsFound.push('kind')
  if (stats.attacks !== undefined || stats.damage !== undefined) fieldsFound.push('attacks')
  if (forge.traitsText) fieldsFound.push('traits')
  if (statsText) fieldsFound.push('stats')
  if (savesText) fieldsFound.push('saves')

  return {
    forge: { ...forge, stats: statsText, saves: savesText },
    fieldsFound,
  }
}

/** Human-readable preservation of the exact Monstro portrayal used. */
export function monstroSourceText(
  item: MonstroIndexItem,
  detail: MonstroDetail,
  portrayal: MonstroPortrayal,
): string {
  const source = portrayalSourcebook(portrayal)
  const name = detail['dc:title']?.trim() || detail['schema:name']?.trim() || item.title
  const stats = Object.entries(portrayal.stats ?? {})
    .map(([key, value]) => `${key}: ${valueText(value) || JSON.stringify(value)}`)
    .join('\n')
  const abilities = (portrayal.specialAbilities ?? [])
    .map((ability) =>
      [ability.name?.trim(), ability.description?.replace(/\s+/g, ' ').trim()]
        .filter(Boolean)
        .join(': '),
    )
    .filter(Boolean)
    .join('\n')

  return [
    name.toUpperCase(),
    `[${source.label}]`,
    portrayal.description?.trim(),
    stats,
    abilities,
  ]
    .filter(Boolean)
    .join('\n\n')
}

export function monstroToForge(
  item: MonstroIndexItem,
  detail: MonstroDetail,
  portrayal: MonstroPortrayal,
): ForgeMonster {
  const stats = portrayal.stats ?? {}
  const sourceSystem = portrayalSourceSystem(portrayal)
  const hdProfile = toHitDiceProfile(stats.hitDice)
  const movement = valueText(stats.movement ?? stats.move)
  const hpMatch = String(stats.hitDice ?? '').match(/\((\d+)\s*hp\)/i)
  const sourceProfile: ForgeSourceProfile = {
    system: sourceSystem,
    hp: hpMatch ? Number(hpMatch[1]) : averageHitPoints(hdProfile),
    hitDice: hdProfile.notation,
    movement: movement || undefined,
    xp: stats.experiencePoints ? Number(String(stats.experiencePoints).replace(/,/g, '')) : undefined,
    thac0: stats.thac0 ? Number(stats.thac0) : undefined,
    attackBonus: stats.thac0 ? 19 - Number(stats.thac0) : undefined,
  }
  const ep =
    item.description?.trim() ||
    detail['dc:description']?.trim() ||
    portrayal.description?.split(/[.\n]/)[0]?.trim() ||
    ''

  return {
    name: detail['dc:title']?.trim() || detail['schema:name']?.trim() || item.title,
    ep,
    hd: hdProfile.notation,
    ac: toAscendingAc(stats.armorClass),
    speed: toSpeed(stats.movement ?? stats.move),
    ml: toMorale(stats.morale),
    al: toAlignment(stats.alignment),
    kind: (item.type ?? '').toLowerCase() || 'monster',
    stats: toStatsText(stats),
    saves: toSavesText(stats),
    sourceProfile,
    atkText: toAtkText(stats.attacks, stats.damage),
    traitsText: toTraitsText(portrayal),
  }
}
