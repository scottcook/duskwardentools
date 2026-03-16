import type { SourceSystem } from '@/types';
import type { ConversionProfileId } from '@/lib/conversion/profiles';
import type { SystemPackId } from './types';

export function getParserPackId(sourceSystem: SourceSystem): SystemPackId {
  if (sourceSystem === '5e') return 'dnd5e_srd';
  return 'osr_generic';
}

export function getOutputPackId(
  sourceSystem: SourceSystem,
  conversionProfileId: ConversionProfileId,
): SystemPackId {
  if (conversionProfileId === 'shadowdark_compatible_v1') {
    return 'shadowdark_private_verify';
  }

  if (sourceSystem === '5e') {
    return 'dnd5e_srd';
  }

  return 'osr_generic';
}
