/**
 * Types mirroring the existing `public` schema of the Duskwarden Supabase
 * project. Kept deliberately close to the DB columns so the mapping is
 * transparent — see `supabase/schema.sql` for the source of truth.
 */

export type EntryType = 'creature' | 'adventure_note'

/** One attack line inside parsed/output JSON. */
export interface CreatureAttack {
  name: string
  bonus?: number
  damage?: string
  note?: string
}

/** A named special ability / action. */
export interface CreatureAction {
  name: string
  description?: string
}

/** Where an imported source stat block came from. */
export interface CreatureSource {
  provider: 'paste' | 'monstro' | 'library' | 'manual'
  label?: string
  sourcebook?: string
  sourcebookId?: string
  url?: string
}

/** One rendered line in a converted, system-specific stat block. */
export interface OutputStatRow {
  k: string
  v: string
}

/** One rendered trait/action in a converted stat block. */
export interface OutputSection {
  h: string
  d: string
}

/**
 * `parsed_json` — the neutral, pre-conversion reading of a stat block.
 * Fields are all optional because real data is heterogeneous.
 */
export interface ParsedCreature {
  name?: string
  system?: string // '5e' | 'ose' | 'bx' | 'bfrpg' | 'adnd1e' | 'cairn' | 'other' | ...
  level?: number
  ac?: number
  hp?: number
  morale?: number
  movement?: string
  thac0?: number
  saves?: string
  stats?: string
  alignment?: string
  kind?: string
  attacks?: CreatureAttack[]
  specialActions?: CreatureAction[]
  description?: string
  source?: CreatureSource
  /** Forge fields that were actually present in the source, before fallbacks. */
  sourceFields?: string[]
  [key: string]: unknown
}

/** `output_json` — the converted stat block (system-specific). */
export interface OutputCreature {
  name?: string
  system?: string
  sourceSystem?: string
  badge?: string
  ac?: number
  hp?: number
  morale?: number
  movement?: string
  saves?: string
  attacks?: CreatureAttack[]
  traits?: CreatureAction[]
  specialActions?: CreatureAction[]
  description?: string
  lootNotes?: string
  threatTier?: number
  outputProfile?: string
  rows?: OutputStatRow[]
  sections?: OutputSection[]
  text?: string
  generatedBy?: string
  [key: string]: unknown
}

/** A row in `public.entries`. */
export interface Entry {
  id: string
  user_id: string
  project_id: string | null
  type: EntryType
  title: string
  tags: string[]
  source_text: string | null
  parsed_json: ParsedCreature | null
  output_json: OutputCreature | null
  created_at: string
  updated_at: string
}

/** A row in `public.projects`. */
export interface Project {
  id: string
  user_id: string
  name: string
  description: string | null
  created_at: string
  updated_at: string
}

/** A project with a live count of its creatures (joined client-side). */
export interface ProjectWithCount extends Project {
  creature_count: number
}

export interface NewProject {
  name: string
  description?: string
}

/** Payload used when saving a converted creature into the library. */
export interface NewCreature {
  title: string
  project_id?: string | null
  tags?: string[]
  source_text?: string | null
  parsed_json?: ParsedCreature | null
  output_json?: OutputCreature | null
}
