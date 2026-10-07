import { describe, expect, it } from 'vitest'
import { BEASTS, format, parseAttacks } from './convert'

describe('format', () => {
  it('renders OSE ghoul stats with bracket AC and 3× movement', () => {
    const ghoul = BEASTS[0]
    const block = format('ose', ghoul, 'ose')
    expect(block.rows.find((row) => row.k === 'AC')?.v).toBe('7 [12]')
    expect(block.rows.find((row) => row.k === 'MV')?.v).toBe("90′ (30′)")
    expect(block.rows.find((row) => row.k === 'THAC0')?.v).toBe('18 [+1]')
    expect(block.rows.find((row) => row.k === 'XP')?.v).toBe('20')
  })

  it('preserves exact PF2E source HP and level on same-system output', () => {
    const forge = {
      ...BEASTS[0],
      hd: 4,
      ac: 18,
      sourceProfile: {
        system: 'pf2e',
        level: 3,
        hp: 58,
        attackBonus: 12,
        perception: 11,
      },
    }
    const block = format('pf2e', forge, 'pf2e')
    expect(block.rows.find((row) => row.k === 'Level')?.v).toBe('Creature 3')
    expect(block.rows.find((row) => row.k === 'HP')?.v).toBe('58')
    expect(block.rows.find((row) => row.k === 'AC')?.v).toBe('18')
  })

  it('uses DCC HD-based combat tables for cross-system conversion', () => {
    const ghoul = { ...BEASTS[0], kind: 'undead' }
    const block = format('dcc', ghoul, 'dnd5e')
    expect(block.rows.find((row) => row.k === 'SV')?.v).toContain('Fort +3')
    expect(block.rows.find((row) => row.k === 'Crit')?.v).toMatch(/^Table U\//)
  })

  it('keeps multi-part Mörk Borg damage expressions intact', () => {
    const block = format('morkborg', BEASTS[0], 'ose')
    expect(block.rows.find((row) => row.k === 'Attack')?.v).toContain('d4')
    expect(block.rows.find((row) => row.k === 'Attack')?.v).toContain('d6')
  })

  it('still renders Knave from the final format branch', () => {
    const block = format('knave', BEASTS[0], 'ose')
    expect(block.badge).toContain('Knave')
  })

  it('preserves exact Dragonbane source values on same-system output', () => {
    const forge = {
      ...BEASTS[0],
      hd: 6,
      ac: 15,
      speed: 24,
      stats: 'Awareness 12, Evade 14',
      sourceProfile: {
        system: 'dragonbane',
        hp: 22,
        ferocity: 2,
        armorRating: 4,
        size: 'Average',
        movement: '8 m (per turn)',
        skills: 'Awareness 12, Evade 14',
      },
    }
    const block = format('dragonbane', forge, 'dragonbane')
    expect(block.badge).toBe('Dragonbane')
    expect(block.rows.find((row) => row.k === 'Ferocity')?.v).toBe('2')
    expect(block.rows.find((row) => row.k === 'Armor Rating')?.v).toBe('4')
    expect(block.rows.find((row) => row.k === 'HP')?.v).toBe('22')
    expect(block.rows.find((row) => row.k === 'Movement')?.v).toBe('8 m (per turn)')
    expect(block.rows.find((row) => row.k === 'Skills')?.v).toBe('Awareness 12, Evade 14')
    expect(block.rows.find((row) => row.k === 'Size')?.v).toBe('Average')
    expect(block.rows.map((row) => row.v).join(' ')).not.toMatch(/estimated/)
  })

  it('estimates Dragonbane from hit dice and ascending AC', () => {
    const block = format('dragonbane', { ...BEASTS[0], kind: 'undead' }, 'dnd5e')
    expect(block.rows.find((row) => row.k === 'Ferocity')?.v).toBe('1 · estimated')
    expect(block.rows.find((row) => row.k === 'Armor Rating')?.v).toBe('2 · estimated')
    expect(block.rows.find((row) => row.k === 'HP')?.v).toBe('10 · estimated')
    expect(block.rows.find((row) => row.k === 'Movement')?.v).toBe('10 m (per turn) · estimated')
    expect(block.rows.find((row) => row.k === 'Skills')?.v).toBe('Evade 15')
    const attacks = block.rows.find((row) => row.k === 'Monster Attacks')?.v ?? ''
    expect(attacks).toMatch(/Hits automatically/)
    expect(attacks).toMatch(/repeated D6/)
    expect(attacks).not.toMatch(/\+\d/)
  })

  it('uses a Dragonbane skills override when one is entered', () => {
    const block = format('dragonbane', { ...BEASTS[0], statsOverride: 'Sneaking 16' }, 'dnd5e')
    expect(block.rows.find((row) => row.k === 'Skills')?.v).toBe('Sneaking 16')
  })
})

describe('parseAttacks', () => {
  it('parses repeated attacks and notes', () => {
    const attacks = parseAttacks('2 Claws 1d4 (paralysis); Bite 1d6')
    expect(attacks).toHaveLength(2)
    expect(attacks[0].d).toBe('1d4')
    expect(attacks[1].n).toBe('Bite')
  })
})
