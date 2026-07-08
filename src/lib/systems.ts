/**
 * System identifiers. The DB stores short codes in `parsed_json.system`
 * ('5e', 'ose', 'bx', 'bfrpg', 'adnd1e', 'cairn', 'other'); the design's
 * converter uses its own set ('dnd5e', 'shadowdark', ...). We keep one label
 * map that covers both so a creature from any origin renders a clean badge.
 */
export const SYSTEM_LABELS: Record<string, string> = {
  // DB codes
  '5e': 'D&D 5E',
  ose: 'OSE / B/X',
  bx: 'B/X',
  bfrpg: 'Basic Fantasy',
  adnd1e: 'AD&D 1E',
  cairn: 'Cairn',
  other: 'Other',
  // Converter codes
  dnd5e: 'D&D 5E',
  add1: 'AD&D 1E',
  shadowdark: 'Shadowdark',
  dcc: 'DCC',
  morkborg: 'Mörk Borg',
  pf2e: 'Pathfinder 2E',
  knave: 'Knave',
}

export function systemLabel(code?: string | null): string {
  if (!code) return 'Unknown'
  return SYSTEM_LABELS[code] ?? code.toUpperCase()
}

/** Systems offered by the converter's source/target selectors (from design). */
export const CONVERTER_SYSTEMS: { value: string; label: string }[] = [
  { value: 'dnd5e', label: 'D&D 5E' },
  { value: 'ose', label: 'OSE / B/X' },
  { value: 'add1', label: 'AD&D 1E' },
  { value: 'shadowdark', label: 'Shadowdark' },
  { value: 'dcc', label: 'DCC' },
  { value: 'morkborg', label: 'Mörk Borg' },
  { value: 'pf2e', label: 'Pathfinder 2E' },
  { value: 'knave', label: 'Knave' },
]
