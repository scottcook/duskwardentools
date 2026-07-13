/**
 * Read helpers that turn a raw `Entry` (creature) into the values the UI
 * needs. All defensive against missing / malformed JSON, because the library
 * holds 160+ real, heterogeneous entries.
 */
import type {
  Entry,
  CreatureAttack,
  CreatureAction,
  OutputSection,
  OutputStatRow,
} from './types'

export interface StatChip {
  label: string
  value: string
}

export function creatureName(e: Entry): string {
  return e.output_json?.name?.trim() || e.parsed_json?.name?.trim() || e.title?.trim() || 'Nameless Thing'
}

export function creatureSystem(e: Entry): string | undefined {
  return e.output_json?.system || e.parsed_json?.system || undefined
}

/** A short flavour line, if any — the app stores it under description. */
export function creatureEpithet(e: Entry): string {
  const d = e.output_json?.description || e.parsed_json?.description || ''
  return String(d).trim()
}

export function convertedRows(e: Entry): OutputStatRow[] {
  const rows = e.output_json?.rows
  if (!Array.isArray(rows)) return []
  return rows.filter(
    (row): row is OutputStatRow =>
      Boolean(row) && typeof row.k === 'string' && typeof row.v === 'string',
  )
}

export function convertedSections(e: Entry): OutputSection[] {
  const sections = e.output_json?.sections
  if (!Array.isArray(sections)) return []
  return sections.filter(
    (section): section is OutputSection =>
      Boolean(section) && typeof section.h === 'string' && typeof section.d === 'string',
  )
}

function num(v: unknown): number | undefined {
  const n = typeof v === 'string' ? parseFloat(v) : (v as number)
  return typeof n === 'number' && !Number.isNaN(n) ? n : undefined
}

/** Compact stat chips shown on a creature card. Converted output is canonical. */
export function statChips(e: Entry): StatChip[] {
  const rows = convertedRows(e)
  if (rows.length > 0) {
    const specs: Array<{ labels: string[]; short: string }> = [
      { labels: ['ac', 'armor class', 'armor'], short: 'AC' },
      { labels: ['hp', 'hit points'], short: 'HP' },
      { labels: ['hd', 'hit dice'], short: 'HD' },
      { labels: ['lv', 'level'], short: 'LV' },
      { labels: ['mv', 'move', 'speed'], short: 'MV' },
      { labels: ['ml', 'morale'], short: 'ML' },
    ]
    return specs.flatMap(({ labels, short }) => {
      const row = rows.find((candidate) => labels.includes(candidate.k.toLowerCase()))
      return row ? [{ label: short, value: row.v }] : []
    })
  }

  const p = e.parsed_json ?? {}
  const o = e.output_json ?? {}
  const chips: StatChip[] = []

  const ac = num(p.ac) ?? num(o.ac)
  const hp = num(p.hp) ?? num(o.hp)
  const lv = num(p.level)
  const mv = (p.movement || o.movement || '').toString().trim()
  const ml = num(p.morale) ?? num(o.morale)

  if (ac !== undefined) chips.push({ label: 'AC', value: String(ac) })
  if (hp !== undefined) chips.push({ label: 'HP', value: String(hp) })
  if (lv !== undefined) chips.push({ label: 'LV', value: String(lv) })
  if (mv) chips.push({ label: 'MV', value: mv })
  if (ml !== undefined && ml > 0) chips.push({ label: 'ML', value: String(ml) })

  return chips
}

export function creatureAttacks(e: Entry): CreatureAttack[] {
  const a = e.output_json?.attacks ?? e.parsed_json?.attacks
  return Array.isArray(a) ? a : []
}

export function creatureActions(e: Entry): CreatureAction[] {
  const sections = convertedSections(e)
  if (sections.length > 0) {
    return sections.map((section) => ({ name: section.h, description: section.d }))
  }
  const a = e.output_json?.specialActions ?? e.parsed_json?.specialActions
  return Array.isArray(a) ? a : []
}

export function attacksSummary(e: Entry): string {
  const outputAttack = convertedRows(e).find((row) =>
    ['actions', 'att', 'atk', 'attack', 'strikes', 'damage/attack'].includes(row.k.toLowerCase()),
  )
  if (outputAttack) return outputAttack.v
  return creatureAttacks(e)
    .map((a) => [a.name, a.damage].filter(Boolean).join(' '))
    .filter(Boolean)
    .join(', ')
}

/** Flattened, lowercased text used for client-side search matching. */
export function searchHaystack(e: Entry): string {
  const parts = [
    e.title,
    creatureName(e),
    creatureEpithet(e),
    creatureSystem(e),
    ...(e.tags ?? []),
    attacksSummary(e),
    ...creatureActions(e).map((a) => a.name),
    e.source_text,
    e.output_json?.text,
  ]
  return parts.filter(Boolean).join(' ').toLowerCase()
}
