import { describe, expect, it } from 'vitest'
import { BEASTS } from './convert'
import {
  blockingWarnings,
  getConversionWarnings,
  infoWarnings,
} from './conversionValidation'

describe('getConversionWarnings', () => {
  it('treats default specimen cross-system stats as info, not blocking', () => {
    const warnings = getConversionWarnings(BEASTS[0], 'dnd5e', 'shadowdark', new Set())
    expect(blockingWarnings(warnings)).toHaveLength(0)
    const notes = infoWarnings(warnings)
    expect(notes.length).toBeGreaterThan(0)
    expect(notes.some((w) => w.field === 'statsOverride')).toBe(true)
  })

  it('blocks when essential forge fields are blank', () => {
    const warnings = getConversionWarnings(
      { ...BEASTS[0], name: '', atkText: '' },
      'dnd5e',
      'shadowdark',
      new Set(),
    )
    const blocking = blockingWarnings(warnings)
    expect(blocking.map((w) => w.field).sort()).toEqual(['atkText', 'name'])
  })

  it('marks present-but-missing-from-source essentials as info', () => {
    const warnings = getConversionWarnings(
      BEASTS[0],
      'ose',
      'ose',
      new Set(['speed', 'atkText']),
    )
    expect(blockingWarnings(warnings)).toHaveLength(0)
    const notes = infoWarnings(warnings)
    expect(notes.some((w) => w.field === 'speed' && w.severity === 'info')).toBe(true)
    expect(notes.some((w) => w.field === 'atkText' && w.severity === 'info')).toBe(true)
  })

  it('stays silent for same-system conversion when saves are present', () => {
    const warnings = getConversionWarnings(
      { ...BEASTS[0], saves: 'D12 W13 P14 B15 S16' },
      'ose',
      'ose',
      new Set(),
    )
    expect(warnings).toHaveLength(0)
  })

  it('notes derived OSE saves for cross-system conversion without blocking', () => {
    const warnings = getConversionWarnings(BEASTS[0], 'dnd5e', 'ose', new Set())
    expect(blockingWarnings(warnings)).toHaveLength(0)
    expect(infoWarnings(warnings).some((w) => w.field === 'savesOverride')).toBe(true)
  })
})
