/**
 * Normalize and validate OCR output before inserting into the Scribe paste field.
 *
 * Handles common printed stat-block OCR failure modes:
 * - Box border characters, horizontal rules, and bullet noise
 * - Character confusions in dice (ld6 -> 1d6, 1dB -> 1d8, etc.) and labels (THACO -> THAC0)
 * - 2-row ability score tables (STR DEX CON... followed by scores on the next line)
 * - Hard-wrapped multi-line traits and 5E attack blocks ("Melee Weapon Attack... \n Hit: ...")
 * - 3-tier validation ('valid' | 'partial' | 'invalid') so near-miss scans can be recovered
 */

import {
  looksLikeFieldLabelLine,
  parseStatBlock,
  systemLabelForParse,
  type ParseResult,
} from './parseStatBlock'

export const MIN_SCAN_TEXT_LENGTH = 30

export type ScanValidationStatus = 'valid' | 'partial' | 'invalid'

export interface ScannedStatBlockValidation {
  normalizedText: string
  parseResult: ParseResult
  status: ScanValidationStatus
  isRecognized: boolean
  isUsable: boolean
  reasons: string[]
  systemLabel: string
}

const DECORATIVE_RULE_RE = /^[\s|¦‖!•·*_~—–=-]{3,}$/
const LEADING_BORDER_RE = /^[|¦‖!•·~_—–\s]+/
const TRAILING_BORDER_RE = /[|¦‖~_•·]+\s*$/

/**
 * Repair common OCR character confusions inside a single line of stat-block text.
 */
function repairOcrLineTokens(line: string): string {
  let s = line
    // Normalize unicode dashes, quotes, and multiplication symbols
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/\s+/g, ' ')
    .trim()

  // Strip box borders and leading bullet noise (preserve leading '-' for negative AC / armor dice)
  s = s.replace(LEADING_BORDER_RE, '').replace(TRAILING_BORDER_RE, '').trim()

  // Fix common OCR label typos
  s = s
    .replace(/\bTHAC[OQo0]{1,2}\b/gi, 'THAC0')
    .replace(/\bArm[o0]u?r\s+C[1lI|!]ass\b/gi, 'Armor Class')
    .replace(/\bArm[o0]u?r\s+Class\b/gi, 'Armor Class')
    .replace(/\bArm[o0]u?r\s+Rat[1lI|!]ng\b/gi, 'Armor Rating')
    .replace(/\bH[1lI|!]t\s+Po[1lI|!]nts?\b/gi, 'Hit Points')
    .replace(/\bH[1lI|!]t\s+D[1lI|!]ce\b/gi, 'Hit Dice')
    .replace(/\bChallen[gq]e\b/gi, 'Challenge')
    .replace(/\bPercept[1lI|!]on\b/gi, 'Perception')
    .replace(/\bAl[1lI|!]gnment\b/gi, 'Alignment')
    .replace(/\bFeroc[1lI|!]ty\b/gi, 'Ferocity')
    .replace(/\bMovem?ent\b/gi, 'Movement')
    .replace(/\bH[1lI|!]t\s*[.:]\s*/gi, 'Hit: ')

  // Fix leading 'l' or 'I' misread for digit '1' right after core numeric labels
  s = s.replace(
    /\b(Armor Class|Armor Rating|AC|Hit Points|HP|Hit Dice|HD|THAC0|Morale|ML|Speed|Move|MV|Level|LV|Ferocity|Creature)(\s*:?\s+)[lI|!](\d*\b)/gi,
    (_, label: string, sep: string, rest: string) => `${label}${sep}1${rest}`,
  )
  // Fix leading 'l' or 'I' inside bracketed/parenthesized numbers like "[l3]" -> "[13]"
  s = s.replace(/(\[[+-]?|\([+-]?)[lI|!](\d+)/g, '$11$2')

  // Fix OCR dice confusions:
  // 1. ld6, Id8, |d4, !d10 -> 1d6, 1d8, 1d4, 1d10
  s = s.replace(/(^|[\s(+-])[lI|!][dD](\d+\b)/g, '$11d$2')
  // 2. ldB / 1dB -> 1d8, 1dO / 1d0 -> 1d10, 1dG -> 1d6, 1dA -> 1d4
  s = s.replace(/(^|[\s(+-])([lI|!]|\d+)[dD][B](\b)/g, (_, pre: string, cnt: string, post: string) => {
    const n = /^[lI|!]$/.test(cnt) ? '1' : cnt
    return `${pre}${n}d8${post}`
  })
  s = s.replace(/(^|[\s(+-])([lI|!]|\d+)[dD][O0](\b)/g, (_, pre: string, cnt: string, post: string) => {
    const n = /^[lI|!]$/.test(cnt) ? '1' : cnt
    return `${pre}${n}d10${post}`
  })
  s = s.replace(/(^|[\s(+-])([lI|!]|\d+)[dD][G](\b)/g, (_, pre: string, cnt: string, post: string) => {
    const n = /^[lI|!]$/.test(cnt) ? '1' : cnt
    return `${pre}${n}d6${post}`
  })
  // 3. Spaced dice from OCR: "2 d8" or "1 d 6" -> "2d8", "1d6"
  s = s.replace(/\b(\d+)\s+[dD]\s*(2|3|4|6|8|10|12|20|100)\b/g, '$1d$2')
  // 4. Dice modifier with 'l' or 'I': "1d6 + l" -> "1d6 + 1"
  s = s.replace(/(\b\d+d\d+\s*[+−-]\s*)[lI|!](\b)/gi, '$11$2')

  return s
}

const SIX_ABILITY_HEADER_RE =
  /^STR[\s|¦,]+DEX[\s|¦,]+CON[\s|¦,]+INT[\s|¦,]+WIS[\s|¦,]+CHA$/i

const SHADOWDARK_ABILITY_HEADER_RE =
  /^S[\s|¦,]+D[\s|¦,]+C[\s|¦,]+I[\s|¦,]+W[\s|¦,]+Ch$/i

/**
 * Join 2-row (or 3-row split) ability tables into a single parseable line:
 *   STR DEX CON INT WIS CHA
 *   13 (+1) 15 (+2) 10 (+0) 7 (-2) 10 (+0) 6 (-2)
 * -> "STR 13 (+1) DEX 15 (+2) CON 10 (+0) INT 7 (-2) WIS 10 (+0) CHA 6 (-2)"
 */
function joinTwoRowAbilityTables(lines: string[]): string[] {
  const out: string[] = []
  let i = 0

  while (i < lines.length) {
    const line = lines[i]
    if (SIX_ABILITY_HEADER_RE.test(line) && i + 1 < lines.length) {
      const labels = ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA']
      const combined = lines[i + 1] + (i + 2 < lines.length ? ' ' + lines[i + 2] : '')
      const scorePattern = /\b(\d{1,2})\s*(?:\(\s*([+−-]?\s*\d+)\s*\))?/g
      const matchesLine1 = Array.from(lines[i + 1].matchAll(scorePattern))

      if (matchesLine1.length >= 6) {
        const formatted = labels
          .map((lbl, idx) => {
            const m = matchesLine1[idx]
            const mod = m[2] ? ` (${m[2].replace(/\s+/g, '')})` : ''
            return `${lbl} ${m[1]}${mod}`
          })
          .join(' ')
        out.push(formatted)
        i += 2
        continue
      }

      const matchesTwoLines = Array.from(combined.matchAll(scorePattern))
      if (
        matchesLine1.length >= 3 &&
        matchesLine1.length < 6 &&
        matchesTwoLines.length >= 6 &&
        !looksLikeFieldLabelLine(lines[i + 2] ?? '')
      ) {
        const formatted = labels
          .map((lbl, idx) => {
            const m = matchesTwoLines[idx]
            const mod = m[2] ? ` (${m[2].replace(/\s+/g, '')})` : ''
            return `${lbl} ${m[1]}${mod}`
          })
          .join(' ')
        out.push(formatted)
        i += 3
        continue
      }
    }

    if (SHADOWDARK_ABILITY_HEADER_RE.test(line) && i + 1 < lines.length) {
      const labels = ['S', 'D', 'C', 'I', 'W', 'Ch']
      const modMatches = Array.from(lines[i + 1].matchAll(/[+−-]?\d+/g))
      if (modMatches.length >= 6) {
        const formatted =
          'Stats ' +
          labels
            .map((lbl, idx) => {
              const raw = modMatches[idx][0]
              const signed = /^[+−-]/.test(raw) ? raw : `+${raw}`
              return `${lbl} ${signed}`
            })
            .join(', ')
        out.push(formatted)
        i += 2
        continue
      }
    }

    out.push(line)
    i += 1
  }

  return out
}

const SECTION_HEADER_RE =
  /^(?:actions?|traits?|reactions?|legendary actions?|lair actions?|bonus actions?|special abilities|monster attacks?)\s*:?\s*$/i

const TYPE_ALIGNMENT_LINE_RE =
  /^(?:tiny|small|medium|large|huge|gargantuan)\s+[a-z]/i

const SUPPLEMENTAL_LABEL_RE =
  /^(?:Saving Throws|Skills|Damage (?:Vulnerabilities|Resistances|Immunities)|Condition Immunities|Senses|Languages|Challenge|Proficiency Bonus|Gear|Items)\b/i

const ATTACK_CONTINUATION_RE =
  /^(?:Hit\s*:|(?:Melee|Ranged|Melee or Ranged)\s+(?:Weapon|Spell)\s+Attack\s*:?|[+−-]\d+\s+to\s+hit\b|reach\s+\d+|range\s+\d+|one\s+(?:target|creature)\b)/i

const TRAIT_OR_ACTION_START_RE =
  /^[A-Z][A-Za-z0-9 '’-]{1,36}(?:\s*\([^)]{1,24}\))?[.:]\s+\S/

/**
 * Reflow hard-wrapped OCR lines back into logical stat-block lines.
 */
function reflowWrappedLines(lines: string[]): string[] {
  const result: string[] = []

  for (let i = 0; i < lines.length; i++) {
    const current = lines[i]
    if (!current) continue

    if (result.length === 0) {
      result.push(current)
      continue
    }

    const prev = result[result.length - 1]

    // Never join onto the first title line, section header, or 5E size/type line
    const prevIsHeaderOrTitle =
      result.length === 1 ||
      SECTION_HEADER_RE.test(prev) ||
      TYPE_ALIGNMENT_LINE_RE.test(prev) ||
      /^STR\s+\d+/i.test(prev)

    // Always join explicit 5E attack continuation lines ("Hit: ...", "Melee Weapon Attack: ...", "reach 5 ft...")
    if (ATTACK_CONTINUATION_RE.test(current) && !SECTION_HEADER_RE.test(prev)) {
      result[result.length - 1] = `${prev} ${current}`
      continue
    }

    // Never join if current line is a known field label, section header, ability line, or new trait/action
    if (
      SECTION_HEADER_RE.test(current) ||
      TYPE_ALIGNMENT_LINE_RE.test(current) ||
      looksLikeFieldLabelLine(current) ||
      SUPPLEMENTAL_LABEL_RE.test(current) ||
      /^STR\s+\d+/i.test(current) ||
      /^\d+\.\s+\S/.test(current) ||
      TRAIT_OR_ACTION_START_RE.test(current)
    ) {
      result.push(current)
      continue
    }

    if (prevIsHeaderOrTitle) {
      result.push(current)
      continue
    }

    // Join hyphenated line wraps ("para-\nlyzed" -> "paralyzed")
    if (/[a-z]-$/i.test(prev) && /^[a-z]/.test(current)) {
      result[result.length - 1] = `${prev.slice(0, -1)}${current}`
      continue
    }

    // Join soft-wrapped continuation lines (starts with lowercase, parenthetical, or prev line ends mid-clause)
    const startsLikeContinuation =
      /^[a-z(]/.test(current) ||
      /^(?:\d+d\d+|\d+\s*\(\d+d\d+)/i.test(current)
    const prevEndsOpen =
      /[,;:/+−-]$/.test(prev) ||
      /\b(?:and|or|to|of|in|on|for|with|from|by|at|as|into|than|that|which|must|can|is|are|be|a|an|the|plus|reach|range|dc|hit)\s*$/i.test(
        prev,
      )

    if (startsLikeContinuation || prevEndsOpen) {
      result[result.length - 1] = `${prev} ${current}`
      continue
    }

    result.push(current)
  }

  return result
}

export function normalizeScannedText(text: string): string {
  const rawLines = text
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split('\n')

  const cleanedLines: string[] = []
  for (const raw of rawLines) {
    const trimmed = raw.trim()
    if (!trimmed || DECORATIVE_RULE_RE.test(trimmed)) continue
    const repaired = repairOcrLineTokens(trimmed)
    if (!repaired || DECORATIVE_RULE_RE.test(repaired)) continue
    cleanedLines.push(repaired)
  }

  const withTablesJoined = joinTwoRowAbilityTables(cleanedLines)
  const reflowed = reflowWrappedLines(withTablesJoined)

  return reflowed.join('\n').trim()
}

export function validateScannedStatBlock(text: string): ScannedStatBlockValidation {
  const normalizedText = normalizeScannedText(text)
  const parseResult = parseStatBlock(normalizedText)
  const { fieldsFound, confidence } = parseResult
  const reasons: string[] = []

  const hasName = fieldsFound.includes('name')
  const hasAc = fieldsFound.includes('ac')
  const hasHdOrAttacks =
    fieldsFound.includes('hd') ||
    fieldsFound.includes('hp') ||
    fieldsFound.includes('attacks')

  if (normalizedText.length < MIN_SCAN_TEXT_LENGTH) {
    reasons.push('The scan did not extract enough readable text.')
  }
  if (fieldsFound.length < 2 || (confidence === 'none' && fieldsFound.length < 3)) {
    reasons.push('The extracted text does not confidently match a monster stat block.')
  }
  if (!hasName) {
    reasons.push('No creature name could be identified.')
  }
  if (!hasAc) {
    reasons.push('No Armor Class value could be identified.')
  }
  if (!hasHdOrAttacks) {
    reasons.push('No hit points / hit dice or attacks could be identified.')
  }

  let status: ScanValidationStatus = 'invalid'
  if (reasons.length === 0) {
    status = 'valid'
  } else if (fieldsFound.length >= 2 && (hasAc || hasHdOrAttacks)) {
    status = 'partial'
  }

  return {
    normalizedText,
    parseResult,
    status,
    isRecognized: status === 'valid',
    isUsable: status === 'valid' || status === 'partial',
    reasons,
    systemLabel: systemLabelForParse(parseResult.system),
  }
}
