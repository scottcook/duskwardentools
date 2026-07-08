/**
 * monstro.cc integration — an independent OSR bestiary with a JSON API.
 *
 * The index lists ~1300 monsters; each detail document is JSON-LD with one
 * "portrayal" (stat block) per sourcebook. We map the chosen portrayal
 * straight into the converter's structured ForgeMonster model instead of
 * round-tripping through flattened text.
 */

import type { ForgeMonster } from './convert'

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

/** Pick the portrayal matching the active sourcebook filter, else the first. */
export function pickPortrayal(
  detail: MonstroDetail,
  sourcebookFilter?: string,
): MonstroPortrayal | undefined {
  const portrayals = Array.isArray(detail['fabio:hasPortrayal'])
    ? detail['fabio:hasPortrayal']
    : []
  if (sourcebookFilter) {
    const match = portrayals.find((p) =>
      (p['fabio:isPartOf']?.['@id'] ?? '').toLowerCase().includes(sourcebookFilter),
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

/** "2*", "2* (9hp)", "3+1" → leading integer (min 1). */
function toHitDice(raw: unknown): number {
  const n = parseInt(String(raw ?? '').trim(), 10)
  return Number.isNaN(n) ? 1 : Math.max(1, n)
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

export function monstroToForge(
  item: MonstroIndexItem,
  detail: MonstroDetail,
  portrayal: MonstroPortrayal,
): ForgeMonster {
  const stats = portrayal.stats ?? {}
  const ep =
    item.description?.trim() ||
    detail['dc:description']?.trim() ||
    portrayal.description?.split(/[.\n]/)[0]?.trim() ||
    ''

  return {
    name: detail['dc:title']?.trim() || detail['schema:name']?.trim() || item.title,
    ep,
    hd: toHitDice(stats.hitDice),
    ac: toAscendingAc(stats.armorClass),
    speed: toSpeed(stats.movement ?? stats.move),
    ml: toMorale(stats.morale),
    al: toAlignment(stats.alignment),
    kind: (item.type ?? '').toLowerCase() || 'monster',
    atkText: toAtkText(stats.attacks, stats.damage),
    traitsText: toTraitsText(portrayal),
  }
}
