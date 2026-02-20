export type EntryType = 'creature' | 'adventure_note';

export type CreatureRole = 'brute' | 'skirmisher' | 'caster' | 'boss' | 'minion' | 'support';

export type SourceSystem = '5e' | 'bx' | 'ose' | 'other';

export type ThreatTier = 1 | 2 | 3 | 4 | 5;

/** Output profile controls tuning presets and formatting toggles. */
export type OutputProfile =
  | 'duskwarden_default'
  | 'osr_generic'
  | 'shadowdark_compatible';

export interface OutputProfilePreset {
  hpMultiplier: number;
  damageMultiplier: number;
  moraleDefault: number;
  showMorale: boolean;
  showReaction: boolean;
  showDistanceBands: boolean;
}

export const OUTPUT_PROFILES: Record<OutputProfile, { label: string; preset: OutputProfilePreset }> = {
  duskwarden_default: {
    label: 'Duskwarden Stat Card (Default)',
    preset: {
      hpMultiplier: 1.0,
      damageMultiplier: 1.0,
      moraleDefault: 9,
      showMorale: true,
      showReaction: false,
      showDistanceBands: false,
    },
  },
  osr_generic: {
    label: 'OSR Generic (B/X / OSE-ish)',
    preset: {
      hpMultiplier: 0.85,
      damageMultiplier: 0.9,
      moraleDefault: 8,
      showMorale: true,
      showReaction: true,
      showDistanceBands: false,
    },
  },
  shadowdark_compatible: {
    label: 'For use with Shadowdark RPG (compatibility profile)',
    preset: {
      hpMultiplier: 0.75,
      damageMultiplier: 1.0,
      moraleDefault: 9,
      showMorale: false,
      showReaction: false,
      showDistanceBands: false,
    },
  },
};

export interface Profile {
  id: string;
  display_name: string | null;
  created_at: string;
}

export interface Project {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface ParsedCreatureData {
  name?: string;
  ac?: number;
  hp?: number;
  movement?: string;
  attacks?: Attack[];
  abilities?: Ability[];
  saves?: string;
  specialActions?: SpecialAction[];
  cr?: string;
  level?: number;
  system?: SourceSystem;
}

export interface Attack {
  name: string;
  bonus?: number;
  damage?: string;
  description?: string;
}

export interface Ability {
  name: string;
  modifier?: number;
  score?: number;
}

export interface SpecialAction {
  name: string;
  description: string;
  recharge?: string;
}

export type { SystemPackId, ProvenanceBlock } from '@/lib/systemPacks/types';
import type { SystemPackId, ProvenanceBlock } from '@/lib/systemPacks/types';
export type { ConversionProfileId, CreatureRole as ConversionRole } from '@/lib/conversion/profiles';
import type { ConversionProfileId, CreatureRole as ConversionRole } from '@/lib/conversion/profiles';

/** Tuning metadata stored alongside every converted stat card */
export interface ConversionTuning {
  /** The profile used e.g. 'shadowdark_compatible_v1' */
  profileId: ConversionProfileId;
  /** Role used for role-modifier lookup */
  role: ConversionRole;
  /** HP multiplier applied by user sliders (default 1.0) */
  hpMultiplier: number;
  /** Damage multiplier applied by user sliders (default 1.0) */
  damageMultiplier: number;
  /** The numeric targets that the engine aimed for */
  targets: {
    acTarget: number;
    hpTarget: number;
    attackBonusTarget: number;
    dprTarget: number;
    moraleTarget?: number;
  };
  provenance: {
    sourceSystem: string;
    outputSystem: string;
    version: string;
  };
}

export interface OutputCreatureData {
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
  threatTier: ThreatTier;
  /** Legacy profile field — kept for backward compat with existing entries */
  outputProfile: OutputProfile;
  /** System pack that produced this output (required for new entries) */
  outputPackId: SystemPackId;
  showMorale: boolean;
  showReaction: boolean;
  /** Provenance block embedded in exports */
  provenance?: ProvenanceBlock;
  /** Tuning metadata — target bands, role, multipliers */
  tuning?: ConversionTuning;
}

export interface Entry {
  id: string;
  user_id: string;
  project_id: string | null;
  type: EntryType;
  title: string;
  tags: string[];
  source_text: string | null;
  parsed_json: ParsedCreatureData | null;
  output_json: OutputCreatureData | null;
  created_at: string;
  updated_at: string;
}

export interface EntryVersion {
  id: string;
  entry_id: string;
  user_id: string;
  snapshot_json: Record<string, unknown>;
  created_at: string;
}

export interface ConversionSettings {
  deadliness: number;
  durability: number;
  targetLevel?: number;
  role?: CreatureRole;
  outputProfile: OutputProfile;
  /** Active system pack id — drives conversion logic */
  outputPackId: SystemPackId;
  /** Active conversion profile id — drives balance targets */
  conversionProfileId: ConversionProfileId;
}

export interface WizardState {
  step: 1 | 2 | 3 | 4;
  sourceText: string;
  sourceSystem: SourceSystem;
  metadata: {
    intendedLevel?: number;
    role?: CreatureRole;
  };
  parsedData: ParsedCreatureData | null;
  settings: ConversionSettings;
  outputData: OutputCreatureData | null;
  /** Reference stat block (Shadowdark verify mode) — private, never sent publicly */
  referenceStatblock?: string;
  /** Validation report from the active pack's validate() */
  validationReport?: import('@/lib/systemPacks/types').ValidationReport;
}
