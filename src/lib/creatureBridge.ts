/**
 * Bridges the converter's neutral "forge" model (ForgeMonster) and the DB's
 * Entry / parsed_json shape — so a converted creature can be saved into the
 * real library, and a library creature can be loaded back into the forge.
 */
import type { Entry, NewCreature, ParsedCreature, CreatureAttack, CreatureAction } from './types'
import { ForgeMonster, format, parseAttacks, parseTraits, plain } from './convert'
import {
  creatureName,
  creatureEpithet,
  creatureAttacks,
  creatureActions,
} from './creatureModel'

const AL_LABEL: Record<string, string> = { L: 'Lawful', N: 'Neutral', C: 'Chaotic' }

function firstInt(s: string, fallback: number): number {
  const m = String(s).match(/\d+/)
  return m ? parseInt(m[0], 10) : fallback
}

/** Build a `NewCreature` (ready to insert) from the forge + chosen systems. */
export function forgeToNewCreature(
  m: ForgeMonster,
  srcSystem: string,
  tgtSystem: string,
): NewCreature {
  const hd = Math.max(1, +m.hd || 1)
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
    level: hd,
    ac: +m.ac || undefined,
    hp: Math.max(1, Math.round(hd * 4.5)),
    morale: +m.ml || undefined,
    movement: (+m.speed || 30) + ' ft',
    alignment: AL_LABEL[m.al as string] || undefined,
    attacks,
    specialActions,
    description: m.ep || undefined,
  }

  const block = format(tgtSystem, m)
  const output_json = {
    name: block.title,
    system: tgtSystem,
    badge: block.badge,
    ac: +m.ac || undefined,
    hp: Math.max(1, Math.round(hd * 4.5)),
    attacks,
    specialActions,
    rows: block.rows,
    sections: block.sections,
    text: plain(block),
    generatedBy: 'duskwarden-converter',
  }

  return {
    title: m.name || 'Nameless Thing',
    tags: [],
    source_text: m.atkText || m.traitsText ? plain(format(srcSystem, m)) : null,
    parsed_json,
    output_json,
  }
}

/** Best-effort load of a library creature back into the editable forge. */
export function entryToForge(e: Entry): ForgeMonster {
  const p = e.parsed_json ?? {}
  const hd = p.level ?? (p.hp ? Math.max(1, Math.round((p.hp as number) / 4.5)) : 1)
  const atkText = creatureAttacks(e)
    .map((a) => [a.name, a.damage].filter(Boolean).join(' ') + (a.note ? ` (${a.note})` : ''))
    .filter(Boolean)
    .join('; ')
  const traitsText = creatureActions(e)
    .map((a) => (a.description ? `${a.name}: ${a.description}` : a.name))
    .join('\n')
  const alRaw = (p.alignment || '').toString().toUpperCase()
  const al = alRaw.startsWith('L') ? 'L' : alRaw.startsWith('C') ? 'C' : 'N'

  return {
    name: creatureName(e),
    ep: creatureEpithet(e),
    hd: Number(hd) || 1,
    ac: (p.ac as number) ?? 12,
    speed: p.movement ? firstInt(p.movement as string, 30) : 30,
    ml: (p.morale as number) ?? 8,
    al,
    kind: '',
    atkText,
    traitsText,
  }
}
