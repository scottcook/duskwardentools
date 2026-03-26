import { parseStatBlock } from '.';
import { detectSourceSystem, type SourceSystemDetection } from './detectSourceSystem';

export const MIN_SCAN_TEXT_LENGTH = 40;
const MIN_SCAN_CONFIDENCE = 0.5;

export interface ScannedStatBlockValidation {
  normalizedText: string;
  detection: SourceSystemDetection | null;
  parseResult: ReturnType<typeof parseStatBlock>;
  isRecognized: boolean;
  reasons: string[];
}

export function normalizeScannedText(text: string): string {
  return text
    .replace(/\r/g, '')
    .split('\n')
    .map((line) => line.replace(/[ \t]+/g, ' ').trim())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function validateScannedStatBlock(text: string): ScannedStatBlockValidation {
  const normalizedText = normalizeScannedText(text);
  const detection = detectSourceSystem(normalizedText);
  const parseResult = parseStatBlock(normalizedText, detection?.system);
  const { data } = parseResult;
  const reasons: string[] = [];

  const hasName = Boolean(data.name && data.name !== 'Unknown Creature');
  const hasAc = data.ac !== undefined;
  const hasHpOrAttacks = data.hp !== undefined || Boolean(data.attacks?.length);

  if (normalizedText.length < MIN_SCAN_TEXT_LENGTH) {
    reasons.push('The scan did not extract enough readable text.');
  }
  if (!parseResult.success || parseResult.confidence < MIN_SCAN_CONFIDENCE) {
    reasons.push('The extracted text does not confidently match a monster stat block.');
  }
  if (!hasName) {
    reasons.push('No creature name could be identified.');
  }
  if (!hasAc) {
    reasons.push('No Armor Class value could be identified.');
  }
  if (!hasHpOrAttacks) {
    reasons.push('No hit points or attacks could be identified.');
  }

  return {
    normalizedText,
    detection,
    parseResult,
    isRecognized: reasons.length === 0,
    reasons,
  };
}
