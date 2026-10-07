import { describe, expect, it } from 'vitest'
import { format } from './convert'
import { entryToForge } from './creatureBridge'
import {
  extractCreatureName,
  looksLikeFieldLabelLine,
  normalizeStatBlockText,
  parseStatBlock,
} from './parseStatBlock'
import type { Entry } from './types'

const NAMELESS_OSR = `Armor Class: -2 [21 or better if using ascending AC]
Hit Dice: 12+ (roughly 60-96 hp)
Move: 120' (40')
Attacks: 1 touch
Damage: 1d10 + paralyzation (see special)
No. Appearing: 1d4 (1d4)
Save As: Fighter: 12
Morale: 12
Treasure Type: E
Alignment: Chaotic
XP: 2,300`

const NAMELESS_SOFT_WRAP = NAMELESS_OSR.replace(/\n/g, ' ')

describe('normalizeStatBlockText', () => {
  it('reflows a soft-wrapped labeled paste into real lines', () => {
    const normalized = normalizeStatBlockText(NAMELESS_SOFT_WRAP)
    expect(normalized.split('\n').length).toBeGreaterThanOrEqual(5)
    expect(normalized).toMatch(/^Armor Class:/i)
    expect(normalized).toMatch(/\nHit Dice:/i)
  })
})

describe('extractCreatureName', () => {
  it('rejects lines that are labeled stats', () => {
    expect(looksLikeFieldLabelLine('Armor Class: -2 [21]')).toBe(true)
    expect(extractCreatureName(NAMELESS_OSR)).toBe('')
  })

  it('keeps a normal leading creature name', () => {
    expect(extractCreatureName('Ghoul\nArmor Class 12\nHit Dice 2')).toBe('Ghoul')
  })
})

describe('parseStatBlock nameless OSR paste', () => {
  it('does not use the whole paste as the card title', () => {
    const result = parseStatBlock(NAMELESS_OSR)
    expect(result.forge.name).toBe('Unknown Creature')
    expect(result.forge.name.length).toBeLessThan(40)
    expect(result.fieldsFound).not.toContain('name')

    const block = format('shadowdark', result.forge, result.system)
    expect(block.title).toBe('Unknown Creature')
    expect(block.title).not.toMatch(/Armor Class/i)
  })

  it('handles soft-wrapped pastes the same way', () => {
    const result = parseStatBlock(NAMELESS_SOFT_WRAP)
    expect(result.forge.name).toBe('Unknown Creature')
    const block = format('shadowdark', result.forge, result.system)
    expect(block.title).toBe('Unknown Creature')
  })

  it('still extracts combat essentials for conversion', () => {
    const result = parseStatBlock(NAMELESS_OSR)
    expect(result.forge.ac).toBe(21)
    expect(String(result.forge.hd)).toMatch(/^12/)
    expect(result.forge.speed).toBe(40)
    expect(result.forge.atkText.toLowerCase()).toMatch(/touch/)
    expect(result.forge.atkText).toMatch(/1d10/)
    expect(result.forge.al).toBe('C')
    expect(result.forge.ml).toBe(12)

    const block = format('shadowdark', result.forge, result.system)
    expect(block.rows.some((row) => row.k === 'AC' && row.v.includes('21'))).toBe(true)
    expect(block.rows.some((row) => row.k === 'LV')).toBe(true)
  })

  it('keeps titled pastes working (scribe sample shape)', () => {
    const result = parseStatBlock(`GHOUL
Medium undead, chaotic evil
Armor Class 12
Hit Points 9 (2d8)
Speed 30 ft.
Actions: Claws +4 (1d4) plus paralysis; Bite +4 (1d6)
Challenge 1 (200 XP)`)
    expect(result.forge.name.toLowerCase()).toBe('ghoul')
    const block = format('shadowdark', result.forge, result.system)
    expect(block.title.toLowerCase()).toBe('ghoul')
  })
})

const ASH_WIGHT = `Ash Wight
Ferocity: 2
Size: Average
Movement: 8 m (per turn)
Armor Rating: 4
HP: 22
Skills: Awareness 12, Evade 14
Monster Attacks: 1. Chill touch — 1D8 (drain); 2. Grasp — 1D6; 3. Chill touch — 1D8 (drain)
Life Drain: The touch steals warmth.`

describe('parseStatBlock Dragonbane', () => {
  it('detects a Dragonbane block and keeps exact values through format', () => {
    const result = parseStatBlock(ASH_WIGHT)
    expect(result.system).toBe('dragonbane')
    expect(result.confidence).toBe('high')
    expect(result.forge.name).toBe('Ash Wight')
    expect(result.forge.hd).toBe(6)
    expect(result.forge.ac).toBe(15)
    expect(result.forge.speed).toBe(24)
    expect(result.forge.stats).toBe('Awareness 12, Evade 14')
    expect(result.forge.atkText.toLowerCase()).toContain('chill touch')
    expect(result.forge.atkText.toLowerCase()).toContain('grasp')
    expect(result.forge.atkText.match(/chill touch/gi)).toHaveLength(1)
    expect(result.forge.sourceProfile).toMatchObject({
      hp: 22,
      ferocity: 2,
      armorRating: 4,
      skills: 'Awareness 12, Evade 14',
    })

    const block = format('dragonbane', result.forge, result.system)
    expect(block.rows.find((row) => row.k === 'Ferocity')?.v).toBe('2')
    expect(block.rows.find((row) => row.k === 'HP')?.v).toBe('22')
    expect(block.rows.find((row) => row.k === 'Armor Rating')?.v).toBe('4')
    expect(block.rows.find((row) => row.k === 'Movement')?.v).toBe('8 m (per turn)')
    expect(block.rows.find((row) => row.k === 'Skills')?.v).toBe('Awareness 12, Evade 14')
    expect(block.rows.find((row) => row.k === 'Monster Attacks')?.v).toMatch(/Chill touch — 1D8 \(drain\)/)
    expect(block.rows.find((row) => row.k === 'Monster Attacks')?.v).toMatch(/Grasp — 1D6/)
    expect(block.rows.find((row) => row.k === 'Monster Attacks')?.v).toMatch(/Hits automatically/)
    expect(block.sections.some((section) => section.h === 'Life Drain')).toBe(true)
  })

  it('does not treat a compact Mörk Borg block as Dragonbane', () => {
    const result = parseStatBlock(`Grave Rat
HP 8
Morale 7
Armor: -d4
Attack: bite d6`)
    expect(result.system).not.toBe('dragonbane')
  })

  it('reads a saved Dragonbane movement row in meters back into feet', () => {
    const entry = {
      id: '1',
      user_id: 'device',
      project_id: null,
      type: 'creature',
      title: 'Ash Wight',
      tags: [],
      source_text: null,
      parsed_json: { name: 'Ash Wight', system: 'dragonbane' },
      output_json: {
        system: 'dragonbane',
        rows: [{ k: 'Movement', v: '10 m (per turn)' }],
      },
      created_at: '',
      updated_at: '',
    } satisfies Entry
    expect(entryToForge(entry).speed).toBe(30)
  })
})
