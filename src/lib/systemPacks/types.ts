/**
 * System Packs — core type definitions
 *
 * A SystemPack encapsulates all source-system-specific knowledge needed to:
 *   1. Parse an input stat block
 *   2. Convert it deterministically to a Duskwarden output stat card
 *   3. Validate the output against a user-provided reference (when no lawful
 *      canonical data can be embedded)
 *
 * ADDING A NEW PACK: see /README.md#adding-a-system-pack
 */

import type { ParsedCreatureData, Attack, SpecialAction } from '@/types';

// ─────────────────────────────────────────────────────────────────────────────
// Identifiers
// ─────────────────────────────────────────────────────────────────────────────

export type SystemPackId =
  | 'osr_generic'
  | 'dnd5e_srd'
  | 'shadowdark_private_verify';

// ─────────────────────────────────────────────────────────────────────────────
// License metadata
// ─────────────────────────────────────────────────────────────────────────────

export type LicenseType = 'CC-BY-4.0' | 'UserProvided' | 'Internal';

export interface PackLicense {
  type: LicenseType;
  /** Required attribution text for CC-BY content; must appear in exports. */
  attributionText?: string;
  /** Canonical URL or file path of the source data. */
  source?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Parsed / converted stat shapes
// ─────────────────────────────────────────────────────────────────────────────

/** Re-export for packs that want the shared ParsedCreatureData */
export type { ParsedCreatureData };

/** The canonical converted stat card produced by a pack */
export interface ConvertedStat {
  name: string;
  ac: number;
  hp: number;
  movement: string;
  attacks: Attack[];
  saves: string;
  traits: string[];
  specialActions: SpecialAction[];
  morale: number;
  lootNotes: string;
  /** 1–5 threat tier */
  threatTier: number;
  showMorale: boolean;
  showReaction: boolean;
  /** Which pack produced this output */
  outputPackId: SystemPackId;
  /** Provenance block embedded in exports */
  provenance: ProvenanceBlock;
  /** Legacy compat: matches OutputCreatureData.outputProfile */
  outputProfile?: string;
}

export interface ProvenanceBlock {
  packId: SystemPackId;
  packDisplayName: string;
  licenseType: LicenseType;
  attributionText?: string;
  disclaimer: string;
  generatedAt: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Conversion options
// ─────────────────────────────────────────────────────────────────────────────

export interface ConvertOptions {
  deadliness: number;      // 0.5–2.0
  durability: number;      // 0.5–2.0
  targetLevel?: number;
  role?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Validation
// ─────────────────────────────────────────────────────────────────────────────

export interface ReferenceStatblock {
  /** Raw text the user pasted from their own book */
  rawText: string;
  /** Parsed fields extracted from the reference text */
  parsed: Partial<ConvertedStat>;
}

export type FieldMatchStatus = 'match' | 'mismatch' | 'missing' | 'extra';

export interface FieldDiff {
  field: string;
  status: FieldMatchStatus;
  converted: unknown;
  reference: unknown;
  /** Suggested value to use if user clicks "Apply Reference" */
  suggested?: unknown;
}

export interface ValidationReport {
  /** 0–100 */
  accuracyScore: number;
  diffs: FieldDiff[];
  /** Human-readable summary */
  summary: string;
  /** Whether reference was provided at all */
  hasReference: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// System Pack interface
// ─────────────────────────────────────────────────────────────────────────────

export interface SystemPack {
  id: SystemPackId;
  displayName: string;
  /** Short description shown in the UI */
  description: string;
  license: PackLicense;
  /**
   * Whether the pack can look up an existing stat block by name from its
   * embedded data (e.g., SRD monsters.json).
   */
  canAutoFindStatblocks: boolean;
  /**
   * Whether the user MUST paste a reference stat block for the output to be
   * verified (e.g., Shadowdark private verify mode).
   */
  requiresUserReference: boolean;

  /** Parse raw text into structured ParsedCreatureData */
  parseSourceStatblock(inputText: string): ParsedCreatureData;

  /**
   * Look up a canonical stat block by creature name.
   * Returns null if the pack has no embedded data or the creature is not found.
   */
  findStatblockByName?(name: string): ParsedCreatureData | null;

  /** Convert parsed data to a ConvertedStat using this pack's rules */
  convertToTarget(parsed: ParsedCreatureData, options: ConvertOptions): ConvertedStat;

  /**
   * Validate a converted stat against an optional user-provided reference.
   * Always returns a report (hasReference=false if none provided).
   */
  validate(converted: ConvertedStat, reference?: ReferenceStatblock): ValidationReport;
}
