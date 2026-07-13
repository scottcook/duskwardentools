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
})

describe('parseAttacks', () => {
  it('parses repeated attacks and notes', () => {
    const attacks = parseAttacks('2 Claws 1d4 (paralysis); Bite 1d6')
    expect(attacks).toHaveLength(2)
    expect(attacks[0].d).toBe('1d4')
    expect(attacks[1].n).toBe('Bite')
  })
})
