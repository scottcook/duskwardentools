import { describe, expect, it } from 'vitest'
import {
  applyAdaptiveThresholdFilter,
  applyStandardDocumentFilter,
  clampCropRect,
  computeTargetDimensions,
  isFullCropRect,
  nextRotationAngle,
} from './imagePreprocess'
import {
  normalizeScannedText,
  validateScannedStatBlock,
} from './scanValidation'

describe('normalizeScannedText', () => {
  it('strips OCR border noise, decorative divider lines, and fixes common OCR typos', () => {
    const rawOcr = `
      | ________________________ |
      | SKELETON
      | Medium undead, lawful evil
      | Arm0r C1ass l3 (armor scraps) |
      | H1t Po1nts l3 (2dB + 4)
      | Speed 30 ft.
      | ------------------------
      | STR DEX CON INT WIS CHA
      | 10 (+0) 14 (+2) 15 (+2) 6 (-2) 8 (-1) 5 (-3)
      | Actions
      | Shortsword. Melee Weapon Attack: +4 to hit, reach 5 ft., one target.
      | H1t: 5 (ldG + 2) piercing damage.
      | Shortbow. Ranged Weapon Attack: +4 to hit, range 80/320 ft., one
      | target. Hit: 5 (1 d 6 + l) piercing damage.
    `

    const normalized = normalizeScannedText(rawOcr)
    expect(normalized).not.toContain('____')
    expect(normalized).not.toContain('----')
    expect(normalized).toContain('Armor Class 13')
    expect(normalized).toContain('Hit Points 13 (2d8 + 4)')
    expect(normalized).toContain(
      'STR 10 (+0) DEX 14 (+2) CON 15 (+2) INT 6 (-2) WIS 8 (-1) CHA 5 (-3)',
    )
    expect(normalized).toContain(
      'Shortsword. Melee Weapon Attack: +4 to hit, reach 5 ft., one target. Hit: 5 (1d6 + 2) piercing damage.',
    )
    expect(normalized).toContain(
      'Shortbow. Ranged Weapon Attack: +4 to hit, range 80/320 ft., one target. Hit: 5 (1d6 + 1) piercing damage.',
    )
  })

  it('repairs OSR THACO and dice confusions', () => {
    const rawOcr = `
      | Cave Goblin
      | AC 6 [l3]
      | HD l-1
      | Att 1 x weapon (ld6)
      | THACO l9
      | MV 60' (20')
      | ML 7
      | AL Chaotic
    `
    const validation = validateScannedStatBlock(rawOcr)
    expect(validation.status).toBe('valid')
    expect(validation.isRecognized).toBe(true)
    expect(validation.parseResult.system).toBe('ose')
    expect(validation.parseResult.forge.name).toBe('Cave Goblin')
    expect(validation.parseResult.forge.ac).toBe(13)
    expect(validation.parseResult.forge.atkText).toContain('1d6')
  })

  it('joins 2-row Shadowdark stat blocks and wrapped traits', () => {
    const rawOcr = `
      Grim Stalker
      AC l4, HP 18, ATK 2 claws +3 (ld8), MV near
      S D C I W Ch
      +2 +3 +1 -1 +1 -2
      AL C, LV 4
      Shadow Blend. In dim light or darkness, the stalker slips between
      torchlight shadows and cannot be targeted by ranged attacks.
    `
    const validation = validateScannedStatBlock(rawOcr)
    expect(validation.status).toBe('valid')
    expect(validation.parseResult.forge.name).toBe('Grim Stalker')
    expect(validation.parseResult.forge.ac).toBe(14)
    expect(validation.parseResult.forge.hd).toBe(4)
    expect(validation.parseResult.forge.stats).toContain('S +2, D +3, C +1')
    expect(validation.parseResult.forge.traitsText).toContain(
      'Shadow Blend: In dim light or darkness, the stalker slips between torchlight shadows and cannot be targeted by ranged attacks.',
    )
  })
})

describe('validateScannedStatBlock 3-tier classification', () => {
  it('marks a complete multi-line 5E OCR scan as valid', () => {
    const rawOcr = `
      42
      ANKHEG
      Large monstrosity, unaligned
      Armor Class 14 (natural armor), 11 while prone
      Hit Points 39 (6d10 + 6)
      Speed 30 ft., burrow 10 ft.
      STR DEX CON INT WIS CHA
      17 (+3) 11 (+0) 13 (+1) 1 (-5) 13 (+1) 6 (-2)
      Senses darkvision 60 ft., tremorsense 60 ft.
      Challenge 2 (450 XP)
      Actions
      Bite. Melee Weapon Attack: +5 to hit, reach 5 ft., one target.
      Hit: 10 (2d6 + 3) slashing damage plus 3 (1d6) acid damage.
      Acid Spray (Recharge 6). The ankheg spits acid in a line that is 30 feet
      long and 5 feet wide.
    `
    const result = validateScannedStatBlock(rawOcr)
    expect(result.status).toBe('valid')
    expect(result.isRecognized).toBe(true)
    expect(result.isUsable).toBe(true)
    expect(result.reasons).toHaveLength(0)
    expect(result.parseResult.forge.name).toBe('ANKHEG')
    expect(result.parseResult.forge.ac).toBe(14)
    expect(result.parseResult.forge.hd).toBe(6)
    expect(result.parseResult.forge.atkText).toContain('Bite 2d6+3')
  })

  it('classifies a nameless or missing-AC stat block scan as partial so user can recover it', () => {
    const namelessScan = `
      Armor Class: 15
      Hit Dice: 4
      Move: 120' (40')
      Attacks: 2 claws / 1 bite
      Damage: 1d4 / 1d4 / 1d8
      Morale: 9
      Alignment: Chaotic
    `
    const partial = validateScannedStatBlock(namelessScan)
    expect(partial.status).toBe('partial')
    expect(partial.isRecognized).toBe(false)
    expect(partial.isUsable).toBe(true)
    expect(partial.reasons).toContain('No creature name could be identified.')

    // Simulating the user adding a creature name in the live editor
    const recovered = validateScannedStatBlock(`Cave Bear\n${partial.normalizedText}`)
    expect(recovered.status).toBe('valid')
    expect(recovered.isRecognized).toBe(true)
    expect(recovered.parseResult.forge.name).toBe('Cave Bear')
  })

  it('rejects non-stat-block text as invalid', () => {
    const loreParagraph = `
      The old road winds through the marshes of Dunmere where travellers
      rarely return after dusk. Local innkeepers warn strangers to carry
      extra oil and never follow the pale lanterns.
    `
    const invalid = validateScannedStatBlock(loreParagraph)
    expect(invalid.status).toBe('invalid')
    expect(invalid.isRecognized).toBe(false)
    expect(invalid.isUsable).toBe(false)
    expect(invalid.reasons.length).toBeGreaterThan(0)
  })
})

describe('imagePreprocess pixel filters and geometry helpers', () => {
  it('clamps crop rectangles and cycles rotation angles', () => {
    const clamped = clampCropRect({ x: -0.2, y: 0.95, width: 2, height: 0.5 })
    expect(clamped.x).toBe(0)
    expect(clamped.y).toBeLessThanOrEqual(0.92)
    expect(clamped.width).toBe(1)
    expect(clamped.height).toBeGreaterThanOrEqual(0.08)

    expect(isFullCropRect({ x: 0, y: 0, width: 1, height: 1 })).toBe(true)
    expect(isFullCropRect({ x: 0.05, y: 0.05, width: 0.9, height: 0.9 })).toBe(false)
    expect(nextRotationAngle(0)).toBe(90)
    expect(nextRotationAngle(270)).toBe(0)
  })

  it('upscales small crops and caps large dimensions', () => {
    const upscaled = computeTargetDimensions(500, 400)
    expect(upscaled.width).toBe(900)
    expect(upscaled.height).toBe(720)

    const downscaled = computeTargetDimensions(4000, 3000)
    expect(downscaled.width).toBe(2400)
    expect(downscaled.height).toBe(1800)
  })

  it('auto-inverts dark-background stat blocks and stretches contrast in standard filter', () => {
    // 6x6 image: dark background (value 25) with one bright glyph pixel (value 220)
    const width = 6
    const height = 6
    const rgba = new Uint8ClampedArray(width * height * 4)
    for (let i = 0; i < width * height; i++) {
      const v = i === 14 ? 220 : 25
      rgba[i * 4] = v
      rgba[i * 4 + 1] = v
      rgba[i * 4 + 2] = v
      rgba[i * 4 + 3] = 255
    }

    applyStandardDocumentFilter(rgba, width, height)
    // Background should now be inverted to bright white (255) and glyph pixel should be dark (0)
    expect(rgba[0]).toBe(255)
    expect(rgba[14 * 4]).toBe(0)
  })

  it('binaries shadowed backgrounds in adaptive threshold filter', () => {
    const width = 10
    const height = 10
    const rgba = new Uint8ClampedArray(width * height * 4)
    for (let i = 0; i < width * height; i++) {
      const isInk = i === 44 || i === 45
      const v = isInk ? 30 : 200
      rgba[i * 4] = v
      rgba[i * 4 + 1] = v
      rgba[i * 4 + 2] = v
      rgba[i * 4 + 3] = 255
    }

    applyAdaptiveThresholdFilter(rgba, width, height)
    expect(rgba[0]).toBe(255)
    expect(rgba[44 * 4]).toBe(0)
  })
})
