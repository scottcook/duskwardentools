'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Stepper, Card } from '@/components/ui';
import { parseStatBlock, createEmptyParsedData } from '@/lib/parser';
import { convertCreature, getDefaultSettings } from '@/lib/conversion/engine';
import { getProjects as getLocalProjects, saveEntry, updateEntry } from '@/lib/storage';
import { Step1Source } from './steps/Step1Source';
import { Step2Parse } from './steps/Step2Parse';
import { Step3Convert } from './steps/Step3Convert';
import { Step4Export } from './steps/Step4Export';
import type {
  WizardState,
  ParsedCreatureData,
  ConversionSettings,
  SourceSystem,
  CreatureRole,
  Entry,
  OutputCreatureData,
} from '@/types';
import type { ConversionProfileId } from '@/lib/conversion/profiles';

// Map ConversionProfileId → legacy outputProfile for backward compat
const PROFILE_TO_OUTPUT: Record<ConversionProfileId, string> = {
  osr_generic_v1:           'osr_generic',
  shadowdark_compatible_v1: 'shadowdark_compatible',
};

interface ConversionWizardProps {
  projects: { id: string; name: string }[];
  defaultProjectId?: string;
  existingEntry?: Entry | null;
}

const STEPS = [
  { id: 1, label: 'Source' },
  { id: 2, label: 'Parse' },
  { id: 3, label: 'Convert' },
  { id: 4, label: 'Export' },
];

// Persist last-used profile + role in localStorage
const LS_PREFS = 'dw_wizard_prefs';
function loadPrefs(): { profileId?: ConversionProfileId; role?: CreatureRole } {
  if (typeof window === 'undefined') return {};
  try { return JSON.parse(localStorage.getItem(LS_PREFS) || '{}'); } catch { return {}; }
}
function savePrefs(p: { profileId: ConversionProfileId; role?: CreatureRole }) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(LS_PREFS, JSON.stringify(p));
}

function runConvert(
  parsed: ParsedCreatureData,
  settings: ConversionSettings,
  intendedLevel?: number,
  role?: CreatureRole
): OutputCreatureData {
  return convertCreature(parsed, {
    ...settings,
    targetLevel: intendedLevel ?? parsed.level,
    role: role ?? settings.role,
  });
}

export function ConversionWizard({
  projects: serverProjects,
  defaultProjectId,
  existingEntry,
}: ConversionWizardProps) {
  const router = useRouter();
  const [projects, setProjects] = useState(serverProjects);

  // ── Initial state ────────────────────────────────────────────────────────
  const initialSettings = (): ConversionSettings => {
    const prefs = loadPrefs();
    const base  = getDefaultSettings();
    if (existingEntry?.output_json?.tuning) {
      const t = existingEntry.output_json.tuning;
      return {
        ...base,
        conversionProfileId: t.profileId,
        role: t.role as CreatureRole,
        durability: t.hpMultiplier,
        deadliness: t.damageMultiplier,
      };
    }
    return {
      ...base,
      conversionProfileId: prefs.profileId ?? 'osr_generic_v1',
      role: prefs.role,
    };
  };

  const [state, setState] = useState<WizardState>(() => ({
    step: 1,
    sourceText: existingEntry?.source_text ?? '',
    sourceSystem: (existingEntry?.parsed_json as ParsedCreatureData)?.system ?? '5e',
    metadata: {
      intendedLevel: (existingEntry?.parsed_json as ParsedCreatureData)?.level,
      role: undefined,
    },
    parsedData: (existingEntry?.parsed_json as ParsedCreatureData | null) ?? null,
    settings: initialSettings(),
    outputData: null,
    referenceStatblock: '',
    validationReport: undefined,
  }));

  const [projectId,     setProjectId]     = useState(defaultProjectId ?? '');
  const [title,         setTitle]         = useState(existingEntry?.title ?? '');
  const [tags,          setTags]          = useState<string[]>(existingEntry?.tags ?? []);
  const [saving,        setSaving]        = useState(false);
  const [parseWarnings, setParseWarnings] = useState<string[]>([]);

  useEffect(() => {
    getLocalProjects().then(lp => {
      if (lp.length > 0) {
        setProjects([...serverProjects, ...lp.map(p => ({ id: p.id, name: p.name }))]);
      }
    });
  }, [serverProjects]);

  // ── Navigation ────────────────────────────────────────────────────────────
  const goToStep = useCallback((step: 1 | 2 | 3 | 4) => {
    setState(prev => ({ ...prev, step }));
  }, []);

  // ── Profile change ────────────────────────────────────────────────────────
  const handleProfileChange = useCallback((conversionProfileId: ConversionProfileId) => {
    setState(prev => {
      const newSettings: ConversionSettings = {
        ...prev.settings,
        conversionProfileId,
        outputProfile: PROFILE_TO_OUTPUT[conversionProfileId] as ConversionSettings['outputProfile'],
      };
      savePrefs({ profileId: conversionProfileId, role: prev.metadata.role as CreatureRole });
      if (prev.parsedData && prev.outputData) {
        return {
          ...prev,
          settings: newSettings,
          outputData: runConvert(prev.parsedData, newSettings, prev.metadata.intendedLevel, prev.metadata.role as CreatureRole),
        };
      }
      return { ...prev, settings: newSettings };
    });
  }, []);

  // ── Source / system ───────────────────────────────────────────────────────
  const handleSourceChange = useCallback((sourceText: string) =>
    setState(prev => ({ ...prev, sourceText })), []);

  const handleSystemChange = useCallback((sourceSystem: SourceSystem) =>
    setState(prev => ({ ...prev, sourceSystem })), []);

  const handleMetadataChange = useCallback((
    key: 'intendedLevel' | 'role',
    value: number | CreatureRole | undefined
  ) => {
    setState(prev => {
      const newMeta = { ...prev.metadata, [key]: value };
      if (key === 'role' && value) savePrefs({ profileId: prev.settings.conversionProfileId, role: value as CreatureRole });
      if (prev.parsedData && prev.outputData) {
        return {
          ...prev,
          metadata: newMeta,
          outputData: runConvert(
            prev.parsedData,
            prev.settings,
            key === 'intendedLevel' ? (value as number) : prev.metadata.intendedLevel,
            key === 'role' ? (value as CreatureRole) : prev.metadata.role as CreatureRole
          ),
        };
      }
      return { ...prev, metadata: newMeta };
    });
  }, []);

  // ── Parse ─────────────────────────────────────────────────────────────────
  const handleParse = useCallback(() => {
    const result = parseStatBlock(state.sourceText, state.sourceSystem);
    setParseWarnings(result.warnings);
    setState(prev => ({ ...prev, parsedData: result.data, step: 2 }));
    if (!title && result.data.name) setTitle(result.data.name);
  }, [state.sourceText, state.sourceSystem, title]);

  const handleParsedDataChange = useCallback((data: ParsedCreatureData) =>
    setState(prev => ({ ...prev, parsedData: data })), []);

  // ── Convert ───────────────────────────────────────────────────────────────
  const handleConvert = useCallback(() => {
    if (!state.parsedData) return;
    const output = runConvert(state.parsedData, state.settings, state.metadata.intendedLevel, state.metadata.role as CreatureRole);
    setState(prev => ({ ...prev, outputData: output, step: 3 }));
    if (!title && output.name) setTitle(output.name);
  }, [state.parsedData, state.settings, state.metadata, title]);

  // ── Settings change (sliders) ─────────────────────────────────────────────
  const handleSettingsChange = useCallback((settings: ConversionSettings) => {
    setState(prev => {
      if (!prev.parsedData) return prev;
      const output = runConvert(prev.parsedData, settings, prev.metadata.intendedLevel, prev.metadata.role as CreatureRole);
      return { ...prev, settings, outputData: output };
    });
  }, []);

  // ── Save ──────────────────────────────────────────────────────────────────
  const handleSave = useCallback(async () => {
    if (!state.outputData) return;
    setSaving(true);
    try {
      const entryData = {
        project_id: projectId || null,
        type: 'creature' as const,
        title: title || state.outputData.name,
        tags,
        source_text: state.sourceText,
        parsed_json: state.parsedData,
        output_json: state.outputData,
      };
      if (existingEntry) {
        await updateEntry(existingEntry.id, entryData);
      } else {
        await saveEntry(entryData);
      }
      setState(prev => ({ ...prev, step: 4 }));
    } catch (err) {
      console.error('Failed to save entry:', err);
    }
    setSaving(false);
  }, [state.outputData, state.sourceText, state.parsedData, projectId, title, tags, existingEntry]);

  // ── Live Step 1 preview ───────────────────────────────────────────────────
  const step1Preview = useMemo((): OutputCreatureData | null => {
    if (state.sourceText.trim().length <= 10) return null;
    try {
      const { data } = parseStatBlock(state.sourceText, state.sourceSystem);
      return runConvert(data, state.settings, state.metadata.intendedLevel, state.metadata.role as CreatureRole);
    } catch {
      return null;
    }
  }, [state.sourceText, state.sourceSystem, state.settings, state.metadata]);

  const resetWizard = useCallback(() => {
    setState({
      step: 1,
      sourceText: '',
      sourceSystem: '5e',
      metadata: {},
      parsedData: null,
      settings: getDefaultSettings(),
      outputData: null,
      referenceStatblock: '',
      validationReport: undefined,
    });
    setTitle('');
    setTags([]);
    setProjectId(defaultProjectId ?? '');
  }, [defaultProjectId]);

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Create a Duskwarden Stat Card</h1>
        <p className="mt-1 text-text-muted">
          Choose an output system profile to tune balance and formatting.
        </p>
      </div>

      <div className="pb-8">
        <Stepper
          steps={STEPS}
          currentStep={state.step}
          onStepClick={(step) => { if (step < state.step) goToStep(step as 1 | 2 | 3 | 4); }}
        />
      </div>

      <Card padding="lg">
        {state.step === 1 && (
          <Step1Source
            sourceText={state.sourceText}
            sourceSystem={state.sourceSystem}
            conversionProfileId={state.settings.conversionProfileId}
            metadata={state.metadata}
            previewData={step1Preview}
            onSourceChange={handleSourceChange}
            onSystemChange={handleSystemChange}
            onProfileChange={handleProfileChange}
            onMetadataChange={handleMetadataChange}
            onNext={handleParse}
          />
        )}

        {state.step === 2 && (
          <Step2Parse
            parsedData={state.parsedData || createEmptyParsedData()}
            warnings={parseWarnings}
            onDataChange={handleParsedDataChange}
            onBack={() => goToStep(1)}
            onNext={handleConvert}
          />
        )}

        {state.step === 3 && state.outputData && (
          <Step3Convert
            outputData={state.outputData}
            settings={state.settings}
            projects={projects}
            projectId={projectId}
            title={title}
            tags={tags}
            onSettingsChange={handleSettingsChange}
            onProjectChange={setProjectId}
            onTitleChange={setTitle}
            onTagsChange={setTags}
            onBack={() => goToStep(2)}
            onSave={handleSave}
            saving={saving}
          />
        )}

        {state.step === 4 && state.outputData && (
          <Step4Export
            outputData={state.outputData}
            title={title}
            onStartNew={resetWizard}
            onGoToLibrary={() => router.push('/app/library')}
          />
        )}
      </Card>
    </div>
  );
}
