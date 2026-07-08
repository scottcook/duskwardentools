/**
 * Read helpers that turn a raw `Entry` (creature) into the values the UI
 * needs. All defensive against missing / malformed JSON, because the library
 * holds 160+ real, heterogeneous entries.
 */
import type { Entry, CreatureAttack, CreatureAction } from './types'

export interface StatChip {
  label: string
  value: string
}

export function creatureName(e: Entry): string {
  return e.parsed_json?.name?.trim() || e.title?.trim() || 'Nameless Thing'
}

export function creatureSystem(e: Entry): string | undefined {
  return e.parsed_json?.system || undefined
}

/** A short flavour line, if any — the app stores it under description. */
export function creatureEpithet(e: Entry): string {
  const d = e.parsed_json?.description || e.output_json?.description || ''
  return String(d).trim()
}

function num(v: unknown): number | undefined {
  const n = typeof v === 'string' ? parseFloat(v) : (v as number)
  return typeof n === 'number' && !Number.isNaN(n) ? n : undefined
}

/** Compact stat chips shown on a creature card. Prefers parsed, falls to output. */
export function statChips(e: Entry): StatChip[] {
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
  const a = e.parsed_json?.attacks ?? e.output_json?.attacks
  return Array.isArray(a) ? a : []
}

export function creatureActions(e: Entry): CreatureAction[] {
  const a = e.parsed_json?.specialActions ?? e.output_json?.specialActions
  return Array.isArray(a) ? a : []
}

export function attacksSummary(e: Entry): string {
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
  ]
  return parts.filter(Boolean).join(' ').toLowerCase()
}
