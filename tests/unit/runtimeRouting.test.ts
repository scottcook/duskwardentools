import { describe, expect, it } from 'vitest';
import { getOutputPackId, getParserPackId } from '@/lib/systemPacks/runtime';

describe('system pack runtime routing', () => {
  it('routes 5e parsing through the SRD pack', () => {
    expect(getParserPackId('5e')).toBe('dnd5e_srd');
  });

  it('routes OSE and B/X parsing through the generic old-school pack', () => {
    expect(getParserPackId('ose')).toBe('osr_generic');
    expect(getParserPackId('bx')).toBe('osr_generic');
  });

  it('routes shadowdark-compatible output through the verify pack', () => {
    expect(getOutputPackId('5e', 'shadowdark_compatible_v1')).toBe('shadowdark_private_verify');
    expect(getOutputPackId('ose', 'shadowdark_compatible_v1')).toBe('shadowdark_private_verify');
  });

  it('routes 5e OSR conversions through the SRD attribution pack', () => {
    expect(getOutputPackId('5e', 'osr_generic_v1')).toBe('dnd5e_srd');
  });

  it('routes non-5e OSR conversions through the generic pack', () => {
    expect(getOutputPackId('bx', 'osr_generic_v1')).toBe('osr_generic');
    expect(getOutputPackId('other', 'osr_generic_v1')).toBe('osr_generic');
  });
});
