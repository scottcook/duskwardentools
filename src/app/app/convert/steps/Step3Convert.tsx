'use client';

import { Button, Input, Select } from '@/components/ui';
import { useState } from 'react';
import { CreatureCard } from '@/components/features/CreatureCard';
import { BandValidationPanel } from '@/components/features/BandValidationPanel';
import { CONVERSION_PROFILES } from '@/lib/conversion/profiles';
import { validateBands } from '@/lib/conversion/bandValidation';
import type { OutputCreatureData, ConversionSettings } from '@/types';

interface Step3ConvertProps {
  outputData: OutputCreatureData;
  settings: ConversionSettings;
  projects: { id: string; name: string }[];
  projectId: string;
  title: string;
  tags: string[];
  onSettingsChange: (settings: ConversionSettings) => void;
  onProjectChange: (id: string) => void;
  onTitleChange: (title: string) => void;
  onTagsChange: (tags: string[]) => void;
  onBack: () => void;
  onSave: () => void;
  saving: boolean;
}

export function Step3Convert({
  outputData,
  settings,
  projects,
  projectId,
  title,
  tags,
  onSettingsChange,
  onProjectChange,
  onTitleChange,
  onTagsChange,
  onBack,
  onSave,
  saving,
}: Step3ConvertProps) {
  const projectOptions = [
    { value: '', label: 'No project' },
    ...projects.map((p) => ({ value: p.id, label: p.name })),
  ];

  const [rawTags, setRawTags] = useState(() => tags.join(', '));

  const handleTagInput = (value: string) => {
    setRawTags(value);
    const newTags = value.split(',').map((t) => t.trim()).filter(Boolean);
    onTagsChange(newTags);
  };

  const profile = CONVERSION_PROFILES[settings.conversionProfileId];
  const bandReport = profile
    ? validateBands(outputData, profile)
    : null;

  const packLabel = profile?.displayName ?? settings.conversionProfileId;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-lg font-semibold text-text-primary mb-1">Step 2: Adjust & Save</h2>
          <p className="text-sm text-text-muted">Fine-tune the converted stats and save to your library.</p>
        </div>
        <div className="flex items-center gap-2 text-xs shrink-0 flex-wrap">
          <span className="text-text-muted">Output System:</span>
          <span className="px-2 py-0.5 rounded border border-border bg-bg-elevated text-text-secondary font-medium">
            {packLabel}
          </span>
          {profile?.id.startsWith('shadowdark') && (
            <span className="px-2 py-0.5 rounded border border-accent/30 bg-accent/5 text-text-secondary text-xs">
              Not affiliated · compatibility only
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ── Left column: preview ── */}
        <div>
          <h3 className="font-semibold text-text-primary mb-4">Converted Creature</h3>
          <CreatureCard data={outputData} />
        </div>

        {/* ── Right column: controls ── */}
        <div className="space-y-5">
          {/* Sliders */}
          <details className="group border border-border rounded-lg overflow-hidden">
            <summary className="flex items-center justify-between px-4 py-3 text-sm font-medium text-text-secondary cursor-pointer hover:bg-bg-elevated select-none list-none focus:outline-none focus-visible:ring-2 focus-visible:ring-accent">
              <span>Advanced tuning</span>
              <svg className="w-4 h-4 transition-transform group-open:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </summary>
            <div className="px-4 pb-4 pt-2 bg-bg-elevated border-t border-border space-y-4">
              {/* Deadliness */}
              <div className="space-y-1">
                <div className="flex items-center justify-between mb-2">
                  <label htmlFor="slider-deadliness" className="text-sm font-medium text-text-primary">
                    Deadliness (damage multiplier)
                  </label>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      min={50} max={200} step={10}
                      value={Math.round(settings.deadliness * 100)}
                      onChange={(e) => {
                        const v = Math.min(200, Math.max(50, parseInt(e.target.value, 10) || 100));
                        onSettingsChange({ ...settings, deadliness: v / 100 });
                      }}
                      className="w-16 text-right text-sm font-medium text-accent bg-bg-base border border-border rounded px-1.5 py-0.5 focus:outline-none focus:ring-1 focus:ring-accent"
                      aria-label="Deadliness percentage"
                    />
                    <span className="text-sm text-accent">%</span>
                  </div>
                </div>
                <input
                  id="slider-deadliness"
                  type="range"
                  min={50} max={200} step={10}
                  value={Math.round(settings.deadliness * 100)}
                  onChange={(e) => onSettingsChange({ ...settings, deadliness: parseInt(e.target.value, 10) / 100 })}
                  onInput={(e) => onSettingsChange({ ...settings, deadliness: parseInt((e.target as HTMLInputElement).value, 10) / 100 })}
                  className="w-full h-2 bg-bg-base rounded-lg appearance-none cursor-pointer accent-accent focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-bg-elevated"
                  aria-valuenow={Math.round(settings.deadliness * 100)}
                  aria-valuemin={50}
                  aria-valuemax={200}
                />
              </div>

              {/* Durability */}
              <div className="space-y-1">
                <div className="flex items-center justify-between mb-2">
                  <label htmlFor="slider-durability" className="text-sm font-medium text-text-primary">
                    Durability (HP multiplier)
                  </label>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      min={50} max={200} step={10}
                      value={Math.round(settings.durability * 100)}
                      onChange={(e) => {
                        const v = Math.min(200, Math.max(50, parseInt(e.target.value, 10) || 100));
                        onSettingsChange({ ...settings, durability: v / 100 });
                      }}
                      className="w-16 text-right text-sm font-medium text-accent bg-bg-base border border-border rounded px-1.5 py-0.5 focus:outline-none focus:ring-1 focus:ring-accent"
                      aria-label="Durability percentage"
                    />
                    <span className="text-sm text-accent">%</span>
                  </div>
                </div>
                <input
                  id="slider-durability"
                  type="range"
                  min={50} max={200} step={10}
                  value={Math.round(settings.durability * 100)}
                  onChange={(e) => onSettingsChange({ ...settings, durability: parseInt(e.target.value, 10) / 100 })}
                  onInput={(e) => onSettingsChange({ ...settings, durability: parseInt((e.target as HTMLInputElement).value, 10) / 100 })}
                  className="w-full h-2 bg-bg-base rounded-lg appearance-none cursor-pointer accent-accent focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-bg-elevated"
                  aria-valuenow={Math.round(settings.durability * 100)}
                  aria-valuemin={50}
                  aria-valuemax={200}
                />
              </div>

              <p className="text-xs text-text-muted">
                Adjusting sliders re-runs the band validation below.
                100% = profile&apos;s exact target.
              </p>
            </div>
          </details>

          {/* Save fields */}
          <div className="space-y-4">
            <Input
              label="Entry Title"
              value={title}
              onChange={(e) => onTitleChange(e.target.value)}
              placeholder="Creature name"
            />

            <Select
              label="Project"
              options={projectOptions}
              value={projectId}
              onChange={(e) => onProjectChange(e.target.value)}
            />

            <div>
              <Input
                label="Tags"
                value={rawTags}
                onChange={(e) => handleTagInput(e.target.value)}
                placeholder="undead, boss, cave"
                hint="Comma-separated"
              />
              <p className="mt-1 text-xs text-text-muted">
                Tags help you filter and organize creatures in your Library. Use them for themes, locations, or campaigns.
              </p>
            </div>
          </div>

          {/* Band Validation */}
          {bandReport && (
            <BandValidationPanel
              report={bandReport}
              tuning={outputData.tuning}
              settings={settings}
              onSettingsChange={onSettingsChange}
            />
          )}
        </div>
      </div>

      <div className="flex justify-between pt-4">
        <Button variant="ghost" onClick={onBack}>
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </Button>
        <Button onClick={onSave} loading={saving}>
          Save to Library
          <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </Button>
      </div>
    </div>
  );
}
