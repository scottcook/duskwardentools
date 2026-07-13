import { describe, expect, it } from 'vitest'
import { format } from './convert'
import {
  extractCreatureName,
  looksLikeFieldLabelLine,
  normalizeStatBlockText,
  parseStatBlock,
} from './parseStatBlock'

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
