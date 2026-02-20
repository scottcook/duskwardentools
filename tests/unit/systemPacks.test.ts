import { describe, it, expect } from 'vitest';
import { getPack, SYSTEM_PACKS, searchSrdMonsters } from '@/lib/systemPacks';
import { osrGenericPack }       from '@/lib/systemPacks/packs/osrGeneric';
import { dnd5eSrdPack }         from '@/lib/systemPacks/packs/dnd5eSrd';
import { shadowdarkVerifyPack } from '@/lib/systemPacks/packs/shadowdarkVerify';
import { generateValidationReport } from '@/lib/systemPacks/validateUtils';
import type { ParsedCreatureData } from '@/types';
import type { ConvertOptions, ConvertedStat, ReferenceStatblock } from '@/lib/systemPacks/types';

// ─────────────────────────────────────────────────────────────────────────────
// Shared fixtures
// ─────────────────────────────────────────────────────────────────────────────

const baseParsed: ParsedCreatureData = {
  name: 'Orc',
  ac: 13,
  hp: 30,
  movement: '30 ft',
  attacks: [{ name: 'Greataxe', bonus: 5, damage: '1d12+3' }],
  cr: '1/2',
};

const defaultOptions: ConvertOptions = {
  deadliness: 1.0,
  durability: 1.0,
};

// ─────────────────────────────────────────────────────────────────────────────
// Registry
// ─────────────────────────────────────────────────────────────────────────────

describe('System Pack registry', () => {
  it('contains all three MVP packs', () => {
    expect(SYSTEM_PACKS.osr_generic).toBeDefined();
    expect(SYSTEM_PACKS.dnd5e_srd).toBeDefined();
    expect(SYSTEM_PACKS.shadowdark_private_verify).toBeDefined();
  });

  it('getPack returns the correct pack', () => {
    expect(getPack('osr_generic').id).toBe('osr_generic');
    expect(getPack('dnd5e_srd').id).toBe('dnd5e_srd');
    expect(getPack('shadowdark_private_verify').id).toBe('shadowdark_private_verify');
  });

  it('all packs implement required interface', () => {
    for (const pack of Object.values(SYSTEM_PACKS)) {
      expect(typeof pack.parseSourceStatblock).toBe('function');
      expect(typeof pack.convertToTarget).toBe('function');
      expect(typeof pack.validate).toBe('function');
      expect(pack.license).toBeDefined();
      expect(pack.displayName.length).toBeGreaterThan(0);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// OSR Generic
// ─────────────────────────────────────────────────────────────────────────────

describe('osrGenericPack', () => {
  it('converts a creature and stamps outputPackId', () => {
    const out = osrGenericPack.convertToTarget(baseParsed, defaultOptions);
    expect(out.outputPackId).toBe('osr_generic');
    expect(out.hp).toBeGreaterThan(0);
    expect(out.ac).toBeGreaterThan(0);
  });

  it('has lower HP than dnd5e_srd (hpMultiplier 0.85 vs 1.0)', () => {
    const osr = osrGenericPack.convertToTarget(baseParsed, defaultOptions);
    const srd = dnd5eSrdPack.convertToTarget(baseParsed, defaultOptions);
    expect(osr.hp).toBeLessThanOrEqual(srd.hp);
  });

  it('sets showReaction true', () => {
    const out = osrGenericPack.convertToTarget(baseParsed, defaultOptions);
    expect(out.showReaction).toBe(true);
  });

  it('returns a no-reference validation report', () => {
    const out = osrGenericPack.convertToTarget(baseParsed, defaultOptions);
    const report = osrGenericPack.validate(out);
    expect(report.hasReference).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// D&D 5e SRD
// ─────────────────────────────────────────────────────────────────────────────

describe('dnd5eSrdPack', () => {
  it('finds Goblin by name', () => {
    const found = dnd5eSrdPack.findStatblockByName?.('Goblin');
    expect(found).not.toBeNull();
    expect(found?.name).toBe('Goblin');
    expect(found?.ac).toBe(15);
    expect(found?.hp).toBe(7);
  });

  it('findStatblockByName returns null for unknown creature', () => {
    const found = dnd5eSrdPack.findStatblockByName?.('FakeDragon9000');
    expect(found).toBeNull();
  });

  it('enriches parsed data from SRD when creature is recognised', () => {
    const parsed = dnd5eSrdPack.parseSourceStatblock('Goblin\nSpeed 30 ft.');
    expect(parsed.ac).toBe(15);
    expect(parsed.hp).toBe(7);
  });

  it('includes CC-BY attribution in provenance', () => {
    const out = dnd5eSrdPack.convertToTarget(baseParsed, defaultOptions);
    expect(out.provenance.licenseType).toBe('CC-BY-4.0');
    expect(out.provenance.attributionText).toContain('CC-BY');
  });

  it('auto-validates against SRD data for known creatures', () => {
    const goblinParsed = dnd5eSrdPack.findStatblockByName!('Goblin')!;
    const out = dnd5eSrdPack.convertToTarget(goblinParsed, defaultOptions);
    const report = dnd5eSrdPack.validate(out);
    // SRD pack should find a reference automatically for known creatures
    expect(report.hasReference).toBe(true);
    expect(report.diffs.length).toBeGreaterThan(0);
  });

  it('searchSrdMonsters returns partial matches', () => {
    const results = searchSrdMonsters('dragon');
    expect(results.length).toBeGreaterThan(0);
    expect(results.every(r => r.toLowerCase().includes('dragon'))).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Shadowdark Verify
// ─────────────────────────────────────────────────────────────────────────────

describe('shadowdarkVerifyPack', () => {
  it('requiresUserReference is true', () => {
    expect(shadowdarkVerifyPack.requiresUserReference).toBe(true);
  });

  it('produces lower HP than osr_generic (hpMultiplier 0.75 vs 0.85)', () => {
    const sd  = shadowdarkVerifyPack.convertToTarget(baseParsed, defaultOptions);
    const osr = osrGenericPack.convertToTarget(baseParsed, defaultOptions);
    expect(sd.hp).toBeLessThanOrEqual(osr.hp);
  });

  it('sets showMorale false', () => {
    const out = shadowdarkVerifyPack.convertToTarget(baseParsed, defaultOptions);
    expect(out.showMorale).toBe(false);
  });

  it('returns hasReference=false with no reference', () => {
    const out = shadowdarkVerifyPack.convertToTarget(baseParsed, defaultOptions);
    const report = shadowdarkVerifyPack.validate(out);
    expect(report.hasReference).toBe(false);
    expect(report.summary).toContain('Reference field');
  });

  it('returns hasReference=true and diffs when reference provided', () => {
    const out = shadowdarkVerifyPack.convertToTarget(baseParsed, defaultOptions);
    const refText = `Orc\nAC 12\nHP 8\nSpeed 30 ft.\nAttack: Greataxe +3 (1d8+2)`;
    const ref: ReferenceStatblock = { rawText: refText, parsed: {} };
    const report = shadowdarkVerifyPack.validate(out, ref);
    expect(report.hasReference).toBe(true);
    expect(report.diffs.length).toBeGreaterThan(0);
    expect(typeof report.accuracyScore).toBe('number');
    expect(report.accuracyScore).toBeGreaterThanOrEqual(0);
    expect(report.accuracyScore).toBeLessThanOrEqual(100);
  });

  it('does not contain Shadowdark proprietary rules text in output', () => {
    const out = shadowdarkVerifyPack.convertToTarget(baseParsed, defaultOptions);
    const json = JSON.stringify(out);
    // We can't test for specific SD text since we don't have it,
    // but we can assert the pack name and disclaimer are correct
    expect(out.provenance.disclaimer).toContain('not affiliated with The Arcane Library');
    expect(json).not.toContain('Shadowdark RPG Third-Party License text');
  });

  it('provenance has UserProvided license type', () => {
    const out = shadowdarkVerifyPack.convertToTarget(baseParsed, defaultOptions);
    expect(out.provenance.licenseType).toBe('UserProvided');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Validation utilities
// ─────────────────────────────────────────────────────────────────────────────

describe('generateValidationReport', () => {
  const mockConverted: ConvertedStat = {
    name: 'Goblin',
    ac: 15,
    hp: 7,
    movement: '30 ft',
    attacks: [{ name: 'Scimitar', bonus: 4, damage: '1d6+2' }],
    saves: '+3 vs physical effects',
    traits: [],
    specialActions: [],
    morale: 8,
    lootNotes: '1d6 copper',
    threatTier: 1,
    showMorale: true,
    showReaction: false,
    outputPackId: 'dnd5e_srd',
    provenance: {
      packId: 'dnd5e_srd',
      packDisplayName: 'D&D 5e (SRD)',
      licenseType: 'CC-BY-4.0',
      disclaimer: 'test',
      generatedAt: new Date().toISOString(),
    },
  };

  it('returns hasReference=false when no reference supplied', () => {
    const report = generateValidationReport(mockConverted);
    expect(report.hasReference).toBe(false);
    expect(report.diffs).toHaveLength(0);
  });

  it('reports match when reference matches converted', () => {
    const ref: ReferenceStatblock = {
      rawText: 'Goblin\nAC 15\nHP 7\nSpeed 30 ft.',
      parsed: { name: 'Goblin', ac: 15, hp: 7, movement: '30 ft' },
    };
    const report = generateValidationReport(mockConverted, ref);
    expect(report.hasReference).toBe(true);
    const acDiff = report.diffs.find(d => d.field === 'ac');
    expect(acDiff?.status).toBe('match');
    const hpDiff = report.diffs.find(d => d.field === 'hp');
    expect(hpDiff?.status).toBe('match');
  });

  it('reports mismatch when reference HP differs significantly', () => {
    const ref: ReferenceStatblock = {
      rawText: 'Goblin\nAC 15\nHP 100\nSpeed 30 ft.',
      parsed: { name: 'Goblin', ac: 15, hp: 100, movement: '30 ft' },
    };
    const report = generateValidationReport(mockConverted, ref);
    const hpDiff = report.diffs.find(d => d.field === 'hp');
    expect(hpDiff?.status).toBe('mismatch');
  });

  it('accuracy score is 0-100', () => {
    const ref: ReferenceStatblock = {
      rawText: 'Goblin\nAC 15\nHP 7',
      parsed: { name: 'Goblin', ac: 15, hp: 7 },
    };
    const report = generateValidationReport(mockConverted, ref);
    expect(report.accuracyScore).toBeGreaterThanOrEqual(0);
    expect(report.accuracyScore).toBeLessThanOrEqual(100);
  });
});
