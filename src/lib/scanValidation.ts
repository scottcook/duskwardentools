/**
 * Validate OCR output before inserting into the Scribe paste field.
 * Rejects photos that don't look like a monster stat block so garbage
 * never lands in the converter by accident.
 */

import { parseStatBlock, systemLabelForParse, type ParseResult } from './parseStatBlock'

export const MIN_SCAN_TEXT_LENGTH = 40

export interface ScannedStatBlockValidation {
  normalizedText: string
  parseResult: ParseResult
  isRecognized: boolean
  reasons: string[]
  systemLabel: string
}

export function normalizeScannedText(text: string): string {
  return text
    .replace(/\r/g, '')
    .split('\n')
    .map((line) => line.replace(/[ \t]+/g, ' ').trim())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

export function validateScannedStatBlock(text: string): ScannedStatBlockValidation {
  const normalizedText = normalizeScannedText(text)
  const parseResult = parseStatBlock(normalizedText)
  const { forge, fieldsFound, confidence } = parseResult
  const reasons: string[] = []

  const hasName = Boolean(forge.name && forge.name.trim().length > 0)
  const hasAc = fieldsFound.includes('ac')
  const hasHdOrAttacks = fieldsFound.includes('hd') || fieldsFound.includes('attacks')

  if (normalizedText.length < MIN_SCAN_TEXT_LENGTH) {
    reasons.push('The scan did not extract enough readable text.')
  }
  if (confidence === 'none' || fieldsFound.length < 2) {
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

  return {
    normalizedText,
    parseResult,
    isRecognized: reasons.length === 0,
    reasons,
    systemLabel: systemLabelForParse(parseResult.system),
  }
}
