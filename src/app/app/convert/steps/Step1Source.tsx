'use client';

import { useState } from 'react';
import { Button, Textarea, Select, Input } from '@/components/ui';
import { CONVERSION_PROFILE_OPTIONS } from '@/lib/conversion/profiles';
import type { SourceSystem, CreatureRole, DetectionConfidence } from '@/types';
import type { ConversionProfileId } from '@/lib/conversion/profiles';
import { Step1ScanBeta } from './Step1ScanBeta';
import { MonstroBrowserModal } from '@/components/features/MonstroBrowserModal';

const EXAMPLE_STATBLOCK = `Goblin
AC 15 (leather armor, shield)
HP 7 (2d6)
Speed 30 ft.
Melee Attack: Scimitar +4 to hit, 1d6+2 slashing damage
Ranged Attack: Shortbow +4 to hit, 1d6+2 piercing damage
CR 1/4`;

interface Step1SourceProps {
  sourceText: string;
  sourceSystem: SourceSystem;
  detectedSourceSystem?: SourceSystem;
  detectedSourceSystemConfidence?: DetectionConfidence;
  hasManualSourceSystemSelection: boolean;
  conversionProfileId: ConversionProfileId;
  creatureName: string;
  creatureDescription: string;
  metadata: { intendedLevel?: number; role?: CreatureRole };
  isValid?: boolean;
  onSourceChange: (text: string) => void;
  onSystemChange: (system: SourceSystem) => void;
  onProfileChange: (profileId: ConversionProfileId) => void;
  onCreatureNameChange: (name: string) => void;
  onDescriptionChange: (desc: string) => void;
  onMetadataChange: (key: 'intendedLevel' | 'role', value: number | CreatureRole | undefined) => void;
  onMonstroSelect?: (
    text: string,
    system: SourceSystem,
    description?: string,
    external?: { source: 'monstro'; slug?: string; url?: string }
  ) => void;
  onNext: () => void;
}

const SOURCE_SYSTEM_OPTIONS = [
  { value: '5e', label: '5e / 5.5e' },
  { value: 'bx', label: 'B/X D&D' },
  { value: 'ose', label: 'OSE' },
  { value: 'bfrpg', label: 'Basic Fantasy RPG' },
  { value: 'cairn', label: 'Cairn' },
  { value: 'adnd1e', label: 'AD&D 1e' },
  { value: 'other', label: 'Other / Generic' },
];

const SOURCE_SYSTEM_LABELS: Record<SourceSystem, string> = {
  '5e': '5e / 5.5e',
  bx: 'B/X D&D',
  ose: 'OSE',
  bfrpg: 'Basic Fantasy RPG',
  cairn: 'Cairn',
  adnd1e: 'AD&D 1e',
  other: 'Other / Generic',
};

const THREAT_TIER_OPTIONS = [
  { value: '', label: 'Auto-detect from CR/HD' },
  { value: '1', label: 'Tier 1 — Trivial' },
  { value: '2', label: 'Tier 2 — Easy' },
  { value: '3', label: 'Tier 3 — Moderate' },
  { value: '4', label: 'Tier 4 — Hard' },
  { value: '5', label: 'Tier 5 — Deadly' },
];

const ROLE_OPTIONS = [
  { value: '', label: 'Auto-detect (recommended)' },
  { value: 'brute', label: 'Brute — High HP, high damage' },
  { value: 'skirmisher', label: 'Skirmisher — Mobile, evasive' },
  { value: 'caster', label: 'Caster — Spells, abilities' },
  { value: 'boss', label: 'Boss — Solo threat, doubled stats' },
  { value: 'minion', label: 'Minion — Low HP, swarm' },
  { value: 'support', label: 'Support — Buffs, healing' },
];

// Profile helper text per option
const PROFILE_HELPER: Record<ConversionProfileId, { note: string; compat?: string }> = {
  osr_generic_v1: {
    note: 'Creates a stat card balanced for old-school (B/X / OSE-style) play with morale and reaction rolls.',
  },
  shadowdark_compatible_v1: {
    note: 'Creates a Shadowdark-ready stat card using target balance math. Does not reproduce official bestiary entries.',
    compat: 'Compatibility profile for use with Shadowdark RPG. Independent tool; not affiliated with The Arcane Library.',
  },
};



export function Step1Source({
  sourceText,
  sourceSystem,
  detectedSourceSystem,
  detectedSourceSystemConfidence,
  hasManualSourceSystemSelection,
  conversionProfileId,
  creatureName,
  creatureDescription,
  metadata,
  isValid,
  onSourceChange,
  onSystemChange,
  onProfileChange,
  onCreatureNameChange,
  onDescriptionChange,
  onMetadataChange,
  onMonstroSelect,
  onNext,
}: Step1SourceProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showExample, setShowExample] = useState(false);
  const [showMonstroModal, setShowMonstroModal] = useState(false);

  const canProceed = sourceText.trim().length > 10 && isValid !== false;
  const selectedHelper = PROFILE_HELPER[conversionProfileId];
  const detectionMatches = detectedSourceSystem === sourceSystem;
  const showDetection = Boolean(detectedSourceSystem) && sourceText.trim().length >= 10;
  const confidenceTone =
    detectedSourceSystemConfidence === 'high' ? 'text-success' :
    detectedSourceSystemConfidence === 'medium' ? 'text-accent' :
    'text-text-muted';

  return (
    <div className="space-y-6">
      {/* Step heading + profile compatibility note */}
      <div className="grid gap-3 sm:grid-cols-[minmax(0,1.7fr)_minmax(0,1.3fr)] items-start">
        <div>
          <h2 className="text-lg font-semibold text-text-primary mb-1">
            Step 1: Create a Duskwarden Stat Card
          </h2>
          <p className="text-sm text-text-muted">
            Choose an output system profile to tune balance and formatting.
          </p>
        </div>
        {selectedHelper?.compat && (
          <p
            role="note"
            className="mt-0 rounded border border-accent/30 bg-accent/5 px-2.5 py-1.5 text-xs leading-snug text-text-secondary sm:max-w-md sm:justify-self-end sm:px-3 sm:py-2"
          >
            {selectedHelper.compat}
          </p>
        )}
      </div>

      {/* ── System row: Source + Output side-by-side ─────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Select
            label="Source System"
            options={SOURCE_SYSTEM_OPTIONS}
            value={sourceSystem}
            onChange={(e) => onSystemChange(e.target.value as SourceSystem)}
            hint="Helps the parser understand the input format"
          />
          {showDetection && (
            <div className="mt-2 rounded-lg border border-border bg-bg-elevated px-2.5 py-2 text-xs leading-snug sm:px-3">
              <p className="text-text-secondary">
                Detected from pasted text:{' '}
                <span className="font-medium">{SOURCE_SYSTEM_LABELS[detectedSourceSystem!]}</span>{' '}
                <span className={confidenceTone}>({detectedSourceSystemConfidence} confidence)</span>
              </p>
              {detectionMatches ? (
                <p className="mt-1 text-text-muted">
                  {hasManualSourceSystemSelection
                    ? 'Using your selected source system.'
                    : 'Using the detected source system automatically until you choose one manually.'}
                </p>
              ) : (
                <div className="mt-1 flex items-center justify-between gap-3 flex-wrap">
                  <p className="text-text-muted">
                    This stat block looks like {SOURCE_SYSTEM_LABELS[detectedSourceSystem!]}, but the selector is set to {SOURCE_SYSTEM_LABELS[sourceSystem]}.
                  </p>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => onSystemChange(detectedSourceSystem!)}
                  >
                    Use detected system
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
        <div>
          <Select
            label="Output System (conversion)"
            options={CONVERSION_PROFILE_OPTIONS.map(o => ({ value: o.value, label: o.label }))}
            value={conversionProfileId}
            onChange={(e) => onProfileChange(e.target.value as ConversionProfileId)}
            aria-describedby="profile-helper"
          />
          {selectedHelper && (
            <p id="profile-helper" className="mt-1.5 text-xs text-text-muted leading-snug">
              {selectedHelper.note}
            </p>
          )}
        </div>
      </div>

      {/* ── Creature name ────────────────────────────────── */}
      <Input
        label="Creature Name"
        placeholder="e.g. Goblin, Shadow Drake, Cave Troll"
        value={creatureName}
        onChange={(e) => onCreatureNameChange(e.target.value)}
        hint="Leave blank to auto-detect from the stat block."
      />

      <Textarea
        label="Description (optional)"
        placeholder="e.g. Feathered, bird-like creatures with long, sharp beaks."
        value={creatureDescription}
        onChange={(e) => onDescriptionChange(e.target.value)}
        className="min-h-[60px] text-sm"
        hint="Flavor text or physical description. Auto-filled when detected; feel free to edit or add your own."
      />

      <Step1ScanBeta
        hasExistingText={sourceText.trim().length > 0}
        onAccept={onSourceChange}
      />

      {onMonstroSelect && (
        <Button
          type="button"
          variant="secondary"
          onClick={() => setShowMonstroModal(true)}
          className="w-full sm:w-auto"
        >
          Browse Monstro.cc to add a monster!
        </Button>
      )}

      {/* ── Source stat block textarea ────────────────────── */}
      <div>
        <Textarea
          label="Source Stat Block"
          placeholder="Paste a stat block here…"
          value={sourceText}
          onChange={(e) => onSourceChange(e.target.value)}
          className="min-h-[160px] font-mono text-sm"
          aria-describedby="source-text-hint"
        />
        <div className="mt-1.5 flex items-start justify-between gap-4 flex-wrap">
          <p id="source-text-hint" className="text-xs text-text-muted">
            SRD examples are CC BY 4.0. Do not paste proprietary content you don&apos;t have rights to share.
          </p>
          <button
            type="button"
            onClick={() => setShowExample(v => !v)}
            className="text-xs text-accent hover:text-accent-hover focus:outline-none focus-visible:ring-1 focus-visible:ring-accent flex items-center gap-1 shrink-0"
            aria-expanded={showExample}
            aria-controls="example-statblock"
          >
            <svg
              className={`w-3 h-3 transition-transform ${showExample ? 'rotate-90' : ''}`}
              fill="none" stroke="currentColor" viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            {showExample ? 'Hide example' : 'See example'}
          </button>
        </div>
        {showExample && (
          <div
            id="example-statblock"
            className="mt-3 space-y-2 rounded-lg border border-border bg-bg-elevated p-2.5 sm:p-3"
          >
            <p className="text-xs font-medium text-text-secondary">Example (SRD Goblin):</p>
            <pre className="text-xs text-text-muted font-mono whitespace-pre-wrap leading-relaxed">
              {EXAMPLE_STATBLOCK}
            </pre>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                onSourceChange(EXAMPLE_STATBLOCK);
                setShowExample(false);
              }}
            >
              Use this example
            </Button>
          </div>
        )}
      </div>



      {/* ── Advanced accordion ───────────────────────────── */}
      <div className="border border-border rounded-lg overflow-hidden">
        <button
          type="button"
          onClick={() => setShowAdvanced(v => !v)}
          className="flex w-full items-center justify-between px-3 py-2.5 text-sm font-medium text-text-secondary transition-colors hover:bg-bg-elevated focus:outline-none focus-visible:ring-2 focus-visible:ring-accent sm:px-4 sm:py-3"
          aria-expanded={showAdvanced}
          aria-controls="advanced-section"
        >
          <span>Advanced options</span>
          <svg
            className={`w-4 h-4 transition-transform ${showAdvanced ? 'rotate-180' : ''}`}
            fill="none" stroke="currentColor" viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        {showAdvanced && (
          <div
            id="advanced-section"
            className="space-y-4 border-t border-border bg-bg-elevated px-3 pb-3 pt-3 sm:px-4 sm:pb-4 sm:pt-4"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Select
                  label="Threat Tier"
                  options={THREAT_TIER_OPTIONS}
                  value={metadata.intendedLevel != null ? String(metadata.intendedLevel) : ''}
                  onChange={(e) =>
                    onMetadataChange('intendedLevel', e.target.value ? parseInt(e.target.value, 10) : undefined)
                  }
                  hint="Drives HP, AC, and damage targets. Leave blank to auto-detect from CR/HD."
                />
              </div>
              <div>
                <Select
                  label="Role"
                  options={ROLE_OPTIONS}
                  value={metadata.role ?? ''}
                  onChange={(e) => onMetadataChange('role', (e.target.value as CreatureRole) || undefined)}
                  hint="Adjusts the stat balance within the tier. Brute = more HP/damage; Skirmisher = more AC/speed."
                />
              </div>
            </div>
            <p className="text-xs text-text-muted border-t border-border pt-4">
              Deadliness and Durability sliders are available on the next step after conversion.
              They let you fine-tune damage output and HP within the chosen profile&apos;s target bands.
            </p>
          </div>
        )}
      </div>

      {!canProceed && sourceText.trim().length > 0 && (
        <div className="rounded-lg border border-warning/30 bg-warning/5 px-4 py-3 text-sm text-warning">
          {sourceText.trim().length <= 10 ? (
            <p className="font-medium">Please enter at least 10 characters of stat block text to continue.</p>
          ) : isValid === false ? (
            <p className="font-medium">⚠️ We couldn&apos;t detect any recognizable monster stats (like AC, HP, or attacks). Please paste a valid stat block.</p>
          ) : null}
        </div>
      )}

      <div className="flex justify-end pt-2">
        <Button onClick={onNext} disabled={!canProceed} aria-describedby={!canProceed ? 'parse-error' : undefined}>
          Parse Stat Block
          <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </Button>
        {!canProceed && (
          <span id="parse-error" className="sr-only">
            {sourceText.trim().length <= 10 ? "Cannot proceed: stat block text must be at least 10 characters" : "Cannot proceed: no recognizable stats detected"}
          </span>
        )}
      </div>

      <MonstroBrowserModal
        isOpen={showMonstroModal}
        onClose={() => setShowMonstroModal(false)}
        onSelect={(text, system, description, external) => {
          onSourceChange(text);
          if (onMonstroSelect) {
            onMonstroSelect(text, system, description, external);
          }
          setShowMonstroModal(false);
        }}
      />
    </div>
  );
}
