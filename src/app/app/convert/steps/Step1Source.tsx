'use client';

import { useState } from 'react';
import { Button, Textarea, Select, Input } from '@/components/ui';
import { CONVERSION_PROFILE_OPTIONS } from '@/lib/conversion/profiles';
import type { SourceSystem, CreatureRole, OutputCreatureData } from '@/types';
import type { ConversionProfileId } from '@/lib/conversion/profiles';

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
  conversionProfileId: ConversionProfileId;
  metadata: { intendedLevel?: number; role?: CreatureRole };
  previewData?: OutputCreatureData | null;
  onSourceChange: (text: string) => void;
  onSystemChange: (system: SourceSystem) => void;
  onProfileChange: (profileId: ConversionProfileId) => void;
  onMetadataChange: (key: 'intendedLevel' | 'role', value: number | CreatureRole | undefined) => void;
  onNext: () => void;
}

const SOURCE_SYSTEM_OPTIONS = [
  { value: '5e',   label: '5e / 5.5e' },
  { value: 'bx',   label: 'B/X D&D' },
  { value: 'ose',  label: 'OSE' },
  { value: 'other',label: 'Other / Generic' },
];

const ROLE_OPTIONS = [
  { value: '',          label: 'Auto-detect (recommended)' },
  { value: 'brute',     label: 'Brute — High HP, high damage' },
  { value: 'skirmisher',label: 'Skirmisher — Mobile, evasive' },
  { value: 'caster',    label: 'Caster — Spells, abilities' },
  { value: 'boss',      label: 'Boss — Solo threat, doubled stats' },
  { value: 'minion',    label: 'Minion — Low HP, swarm' },
  { value: 'support',   label: 'Support — Buffs, healing' },
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

function MiniPreviewCard({ data }: { data: OutputCreatureData }) {
  const profileNote = data.tuning?.provenance.outputSystem ?? '';
  return (
    <div
      className="rounded-lg border border-border bg-bg-elevated p-4 space-y-2 text-sm"
      aria-label="Output preview"
      role="region"
    >
      <div className="flex items-start justify-between gap-2 flex-wrap">
        <span className="font-bold text-text-primary truncate">{data.name}</span>
        <span className="shrink-0 px-2 py-0.5 rounded text-xs font-medium bg-accent/15 text-accent border border-accent/30">
          Duskwarden Stat Card
        </span>
      </div>

      {profileNote && (
        <p className="text-xs text-text-muted">
          System: <span className="text-text-secondary">{profileNote}</span>
        </p>
      )}

      <div className="flex gap-4 text-text-secondary flex-wrap">
        <span>AC {data.ac}</span>
        <span>HP {data.hp}</span>
        <span>Move {data.movement}</span>
        {data.showMorale && data.morale > 0 && <span>Morale {data.morale}</span>}
        <span className="text-text-muted">Tier {data.threatTier}</span>
      </div>

      {data.attacks.length > 0 && (
        <p className="text-text-secondary">
          <span className="text-text-muted">Attack: </span>
          {data.attacks[0].name}
          {data.attacks[0].bonus !== undefined && ` +${data.attacks[0].bonus}`}
          {data.attacks[0].damage && ` (${data.attacks[0].damage})`}
          {data.attacks.length > 1 && ` +${data.attacks.length - 1} more`}
        </p>
      )}

      {data.traits.length > 0 && (
        <p className="text-xs text-text-muted">{data.traits.join(' · ')}</p>
      )}

      <p className="text-xs text-text-muted pt-1 border-t border-border/40">
        Duskwarden Tools · independent, not affiliated with any publisher
      </p>
    </div>
  );
}

export function Step1Source({
  sourceText,
  sourceSystem,
  conversionProfileId,
  metadata,
  previewData,
  onSourceChange,
  onSystemChange,
  onProfileChange,
  onMetadataChange,
  onNext,
}: Step1SourceProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showExample, setShowExample] = useState(false);

  const canProceed      = sourceText.trim().length > 10;
  const selectedHelper  = PROFILE_HELPER[conversionProfileId];

  return (
    <div className="space-y-6">
      {/* Step heading */}
      <div>
        <h2 className="text-lg font-semibold text-text-primary mb-1">
          Step 1: Create a Duskwarden Stat Card
        </h2>
        <p className="text-sm text-text-muted">
          Choose an output system profile to tune balance and formatting.
        </p>
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
          {selectedHelper?.compat && (
            <p
              role="note"
              className="mt-2 px-3 py-2 rounded border border-accent/30 bg-accent/5 text-xs text-text-secondary leading-snug"
            >
              {selectedHelper.compat}
            </p>
          )}
        </div>
      </div>

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
            className="mt-3 rounded-lg border border-border bg-bg-elevated p-3 space-y-2"
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

      {/* ── Tier + Role row ───────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Input
            label="Threat Tier"
            type="number"
            min={1}
            max={5}
            value={metadata.intendedLevel ?? ''}
            onChange={(e) =>
              onMetadataChange('intendedLevel', e.target.value ? parseInt(e.target.value, 10) : undefined)
            }
            placeholder="Auto-detect (1–5)"
            aria-describedby="tier-hint"
          />
          <p id="tier-hint" className="mt-1.5 text-xs text-text-muted">
            Drives HP, AC, and damage targets. Leave blank to auto-detect from CR/HD.
          </p>
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

      {/* ── Advanced accordion ───────────────────────────── */}
      <div className="border border-border rounded-lg overflow-hidden">
        <button
          type="button"
          onClick={() => setShowAdvanced(v => !v)}
          className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-text-secondary hover:bg-bg-elevated transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
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
            className="px-4 pb-4 pt-2 bg-bg-elevated border-t border-border text-xs text-text-muted space-y-2"
          >
            <p>
              Deadliness and Durability sliders are available on the next step after conversion.
              They let you fine-tune damage output and HP within the chosen profile&apos;s target bands.
            </p>
          </div>
        )}
      </div>

      {/* ── Live output preview ──────────────────────────── */}
      {!canProceed && sourceText.trim().length > 0 && (
        <div className="rounded-lg border border-warning/30 bg-warning/5 px-4 py-3 text-sm text-warning">
          <p className="font-medium">Please enter at least 10 characters of stat block text to continue.</p>
        </div>
      )}

      {previewData && canProceed && (
        <div>
          <h3 className="text-sm font-semibold text-text-primary mb-2">Output Preview</h3>
          <MiniPreviewCard data={previewData} />
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
            Cannot proceed: stat block text must be at least 10 characters
          </span>
        )}
      </div>
    </div>
  );
}
