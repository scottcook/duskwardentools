import { describe, expect, it } from 'vitest'
import {
  averageHitPoints,
  dccCombatStats,
  dccCritTable,
  formatDccSaves,
  knaveHitPoints,
  morkBorgDamage,
  oseAttack,
  oseExperience,
  oseMovement,
  oseSaves,
  parseHitDice,
  pf2eBenchmarks,
  shadowdarkHitPoints,
} from './systemRules'

describe('parseHitDice', () => {
  it('preserves special ability stars and modifiers', () => {
    const profile = parseHitDice('3+1*')
    expect(profile.count).toBe(3)
    expect(profile.modifier).toBe(1)
    expect(profile.specialAbilities).toBe(1)
    expect(profile.notation).toBe('3+1*')
  })

  it('handles fractional hit dice', () => {
    expect(parseHitDice('½').fractional).toBe(true)
    expect(parseHitDice('½').count).toBe(0.5)
  })
})

describe('OSE rules', () => {
  it('uses the published THAC0 ladder through high HD', () => {
    expect(oseAttack(16).thac0).toBe(8)
    expect(oseAttack(22).thac0).toBe(5)
  })

  it('awards XP for HD beyond 12', () => {
    expect(oseExperience(parseHitDice('14'))).toBeGreaterThan(1100)
  })

  it('uses 3× encounter movement notation', () => {
    expect(oseMovement(30)).toBe("90′ (30′)")
  })

  it('tracks fighter-equivalent saves by HD band', () => {
    expect(oseSaves(4)).toBe('D10 W11 P12 B13 S14')
    expect(oseSaves(18)).toBe('D2 W3 P4 B3 S6')
  })
})

describe('target helpers', () => {
  it('derives average hit points from dice profiles', () => {
    expect(averageHitPoints(parseHitDice('2d8+2'))).toBe(11)
  })

  it('uses Knave 4× HD and Shadowdark level×4 + CON', () => {
    expect(knaveHitPoints(3)).toBe(12)
    expect(shadowdarkHitPoints(3, 2)).toBe(14)
  })

  it('preserves Mörk Borg damage expressions', () => {
    expect(morkBorgDamage('1d6')).toBe('d6')
    expect(morkBorgDamage('2d8')).toBe('2d8')
  })
})

describe('DCC tables', () => {
  it('assigns published combat values by HD', () => {
    const stats = dccCombatStats(4, 2, 'humanoid', 'balanced')
    expect(stats.attackBonus).toBe(4)
    expect(formatDccSaves(stats.fortitude, stats.reflex, stats.will)).toBe(
      'Fort +4, Ref +1, Will +1',
    )
  })

  it('boosts undead will saves', () => {
    const stats = dccCombatStats(4, 1, 'undead', 'balanced')
    expect(stats.will).toBeGreaterThan(stats.reflex)
  })

  it('selects undead crit tables', () => {
    expect(dccCritTable(6, true)).toMatch(/^Table U\//)
  })
})

describe('PF2E benchmarks', () => {
  it('maps creature level to GM Core moderate benchmarks', () => {
    const row = pf2eBenchmarks(3, 'balanced')
    expect(row.level).toBe(3)
    expect(row.ac).toBe(18)
    expect(row.hp).toBe(45)
  })
})
