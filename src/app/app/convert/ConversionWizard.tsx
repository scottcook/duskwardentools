'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Stepper, Card } from '@/components/ui';
import { trackEvent } from '@/lib/analytics';
import { getDefaultSettings } from '@/lib/conversion/engine';
import { detectSourceSystem } from '@/lib/parser/detectSourceSystem';
import { parseStatBlock } from '@/lib/parser';
import { getProjects as getLocalProjects, saveEntry, updateEntry } from '@/lib/storage';
import { SYSTEM_PACKS } from '@/lib/systemPacks';
import { getOutputPackId, getParserPackId } from '@/lib/systemPacks/runtime';
import { Step1Source } from './steps/Step1Source';
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
import type { ConvertOptions, ReferenceStatblock } from '@/lib/systemPacks/types';

// Map ConversionProfileId → legacy outputProfile for backward compat
const PROFILE_TO_OUTPUT: Record<ConversionProfileId, string> = {
  osr_generic_v1: 'osr_generic',
  shadowdark_compatible_v1: 'shadowdark_compatible',
};

function applyProfileSettings(
  sourceSystem: SourceSystem,
  settings: ConversionSettings,
  conversionProfileId: ConversionProfileId,
): ConversionSettings {
  return {
    ...settings,
    conversionProfileId,
    outputProfile: PROFILE_TO_OUTPUT[conversionProfileId] as ConversionSettings['outputProfile'],
    outputPackId: getOutputPackId(sourceSystem, conversionProfileId),
  };
}

function buildConvertOptions(
  settings: ConversionSettings,
  intendedTier?: number,
  role?: CreatureRole,
): ConvertOptions {
  return {
    deadliness: settings.deadliness,
    durability: settings.durability,
    targetLevel: settings.targetLevel,
    targetTier: intendedTier as ConvertOptions['targetTier'],
    role: role ?? settings.role,
  };
}

function buildValidationReference(
  outputPackId: ConversionSettings['outputPackId'],
  parsed: ParsedCreatureData,
  referenceText?: string,
): ReferenceStatblock | undefined {
  if (referenceText?.trim()) {
    return {
      rawText: referenceText,
      parsed: {},
    };
  }

  if (outputPackId !== 'dnd5e_srd') return undefined;

  const pack = SYSTEM_PACKS.dnd5e_srd;
  const lookupName = parsed.name?.trim();
  if (!lookupName) return undefined;

  const srdRef = pack.findStatblockByName?.(lookupName);
  if (!srdRef) return undefined;

  return {
    rawText: '',
    parsed: {
      name: srdRef.name,
      ac: srdRef.ac,
      hp: srdRef.hp,
      movement: srdRef.movement,
      attacks: srdRef.attacks ?? [],
      saves: srdRef.saves,
    },
  };
}

function runPackPipeline(
  parsed: ParsedCreatureData,
  sourceSystem: SourceSystem,
  settings: ConversionSettings,
  intendedTier?: number,
  role?: CreatureRole,
  nameOverride?: string,
  referenceText?: string,
  descriptionOverride?: string,
  externalImport?: WizardState['externalImport'],
): { outputData: OutputCreatureData; validationReport: WizardState['validationReport'] } {
  const outputPackId = getOutputPackId(sourceSystem, settings.conversionProfileId);
  const pack = SYSTEM_PACKS[outputPackId];
  const output = pack.convertToTarget(parsed, buildConvertOptions(settings, intendedTier, role));

  if (nameOverride?.trim()) {
    output.name = nameOverride.trim();
  }

  if (descriptionOverride?.trim()) {
    output.description = descriptionOverride.trim();
  }

  if (externalImport) {
    output.provenance = {
      ...output.provenance,
      external: externalImport,
    };
  }

  output.outputPackId = outputPackId;

  const reference = buildValidationReference(outputPackId, parsed, referenceText);
  const validationReport = pack.validate(output, reference);

  return {
    outputData: output as OutputCreatureData,
    validationReport,
  };
}

interface ConversionWizardProps {
  projects: { id: string; name: string }[];
  defaultProjectId?: string;
  existingEntry?: Entry | null;
}

const STEPS = [
  { id: 1, label: 'Source' },
  { id: 2, label: 'Convert' },
  { id: 3, label: 'Export' },
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
    const base = getDefaultSettings();
    const sourceSystem = (existingEntry?.parsed_json as ParsedCreatureData | null)?.system ?? '5e';
    if (existingEntry?.output_json?.tuning) {
      const t = existingEntry.output_json.tuning;
      return applyProfileSettings(sourceSystem, {
        ...base,
        conversionProfileId: t.profileId,
        role: t.role as CreatureRole,
        durability: t.hpMultiplier,
        deadliness: t.damageMultiplier,
        outputPackId: existingEntry.output_json.outputPackId,
        outputProfile: existingEntry.output_json.outputProfile,
      }, t.profileId);
    }
    return applyProfileSettings(sourceSystem, {
      ...base,
      conversionProfileId: prefs.profileId ?? 'osr_generic_v1',
      role: prefs.role,
    }, prefs.profileId ?? 'osr_generic_v1');
  };

  const [state, setState] = useState<WizardState>(() => ({
    step: 1,
    sourceText: existingEntry?.source_text ?? '',
    sourceSystem: (existingEntry?.parsed_json as ParsedCreatureData)?.system ?? '5e',
    detectedSourceSystem: undefined,
    detectedSourceSystemConfidence: undefined,
    hasManualSourceSystemSelection: Boolean(existingEntry),
    creatureName: existingEntry?.output_json?.name ?? existingEntry?.title ?? '',
    creatureDescription: existingEntry?.output_json?.description ?? '',
    metadata: {
      intendedLevel: (existingEntry?.parsed_json as ParsedCreatureData)?.level,
      role: undefined,
    },
    parsedData: (existingEntry?.parsed_json as ParsedCreatureData | null) ?? null,
    settings: initialSettings(),
    outputData: null,
    externalImport: existingEntry?.output_json?.provenance?.external,
    referenceStatblock: '',
    validationReport: undefined,
    isStatblockValid: existingEntry ? true : undefined,
  }));

  const [projectId, setProjectId] = useState(defaultProjectId ?? '');
  const [title, setTitle] = useState(existingEntry?.title ?? '');
  const [tags, setTags] = useState<string[]>(existingEntry?.tags ?? []);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    trackEvent('convert_wizard_view', {
      source: existingEntry ? 'edit_entry' : 'new_entry',
      hasDefaultProject: Boolean(defaultProjectId),
    });
  }, [defaultProjectId, existingEntry]);

  useEffect(() => {
    getLocalProjects().then(lp => {
      if (lp.length > 0) {
        setProjects(prev => {
          const all = [...prev, ...lp.map(p => ({ id: p.id, name: p.name }))];
          return Array.from(new Map(all.map(p => [p.id, p])).values());
        });
      }
    });
  }, []);

  useEffect(() => {
    if (state.step !== 1) return;

    const timeout = window.setTimeout(() => {
      if (state.sourceText.trim().length < 10) {
        setState(prev => {
          if (!prev.detectedSourceSystem && !prev.detectedSourceSystemConfidence && prev.isStatblockValid === undefined) return prev;
          return {
            ...prev,
            detectedSourceSystem: undefined,
            detectedSourceSystemConfidence: undefined,
            isStatblockValid: undefined,
          };
        });
        return;
      }

      const detection = detectSourceSystem(state.sourceText);
      const parseResult = parseStatBlock(state.sourceText, detection?.system);

      setState(prev => {
        if (prev.step !== 1 || prev.sourceText !== state.sourceText) return prev;

        const nextState: WizardState = {
          ...prev,
          detectedSourceSystem: detection?.system,
          detectedSourceSystemConfidence: detection?.confidence,
          isStatblockValid: parseResult.success,
        };

        const shouldAutoApply = Boolean(
          detection &&
          detection.system !== 'other' &&
          detection.confidence !== 'low' &&
          !prev.hasManualSourceSystemSelection
        );

        if (!shouldAutoApply || prev.sourceSystem === detection?.system) {
          return nextState;
        }

        if (!detection) {
          return nextState;
        }

        return {
          ...nextState,
          sourceSystem: detection.system,
          settings: applyProfileSettings(detection.system, prev.settings, prev.settings.conversionProfileId),
        };
      });
    }, state.sourceText.trim().length < 10 ? 0 : 250);

    return () => window.clearTimeout(timeout);
  }, [state.sourceText, state.step]);

  // ── Navigation ────────────────────────────────────────────────────────────
  const goToStep = useCallback((step: 1 | 2 | 3) => {
    setState(prev => ({ ...prev, step }));
  }, []);

  // ── Profile change ────────────────────────────────────────────────────────
  const handleProfileChange = useCallback((conversionProfileId: ConversionProfileId) => {
    setState(prev => {
      const newSettings = applyProfileSettings(prev.sourceSystem, prev.settings, conversionProfileId);
      savePrefs({ profileId: conversionProfileId, role: prev.metadata.role as CreatureRole });
      if (prev.parsedData && prev.outputData) {
        const { outputData, validationReport } = runPackPipeline(
          prev.parsedData,
          prev.sourceSystem,
          newSettings,
          prev.metadata.intendedLevel,
          prev.metadata.role as CreatureRole,
          prev.creatureName || undefined,
          prev.referenceStatblock,
          prev.creatureDescription || undefined,
          prev.externalImport,
        );
        return {
          ...prev,
          settings: newSettings,
          outputData,
          validationReport,
        };
      }
      return { ...prev, settings: newSettings };
    });
  }, []);

  // ── Source / system / name ────────────────────────────────────────────────
  const handleSourceChange = useCallback((sourceText: string) =>
    setState(prev => ({ ...prev, sourceText })), []);

  const handleSystemChange = useCallback((sourceSystem: SourceSystem) => {
    setState(prev => {
      const newSettings = applyProfileSettings(sourceSystem, prev.settings, prev.settings.conversionProfileId);
      if (prev.parsedData && prev.outputData) {
        const { outputData, validationReport } = runPackPipeline(
          prev.parsedData,
          sourceSystem,
          newSettings,
          prev.metadata.intendedLevel,
          prev.metadata.role as CreatureRole,
          prev.creatureName || undefined,
          prev.referenceStatblock,
          prev.creatureDescription || undefined,
          prev.externalImport,
        );
        return {
          ...prev,
          sourceSystem,
          hasManualSourceSystemSelection: true,
          settings: newSettings,
          outputData,
          validationReport,
        };
      }
      return { ...prev, sourceSystem, hasManualSourceSystemSelection: true, settings: newSettings };
    });
  }, []);

  const handleDescriptionChange = useCallback((creatureDescription: string) =>
    setState(prev => ({ ...prev, creatureDescription })), []);

  const handleCreatureNameChange = useCallback((creatureName: string) => {
    setState(prev => {
      if (prev.parsedData && prev.outputData) {
        const { outputData, validationReport } = runPackPipeline(
          prev.parsedData,
          prev.sourceSystem,
          prev.settings,
          prev.metadata.intendedLevel,
          prev.metadata.role as CreatureRole,
          creatureName || undefined,
          prev.referenceStatblock,
          prev.creatureDescription || undefined,
          prev.externalImport,
        );
        return {
          ...prev,
          creatureName,
          outputData,
          validationReport,
        };
      }
      return { ...prev, creatureName };
    });
  }, []);

  const handleMetadataChange = useCallback((
    key: 'intendedLevel' | 'role',
    value: number | CreatureRole | undefined
  ) => {
    setState(prev => {
      const newMeta = { ...prev.metadata, [key]: value };
      if (key === 'role' && value) savePrefs({ profileId: prev.settings.conversionProfileId, role: value as CreatureRole });
      if (prev.parsedData && prev.outputData) {
        const { outputData, validationReport } = runPackPipeline(
          prev.parsedData,
          prev.sourceSystem,
          prev.settings,
          key === 'intendedLevel' ? (value as number) : prev.metadata.intendedLevel,
          key === 'role' ? (value as CreatureRole) : prev.metadata.role as CreatureRole,
          prev.creatureName || undefined,
          prev.referenceStatblock,
          prev.creatureDescription || undefined,
          prev.externalImport,
        );
        return {
          ...prev,
          metadata: newMeta,
          outputData,
          validationReport,
        };
      }
      return { ...prev, metadata: newMeta };
    });
  }, []);

  const handleReferenceStatblockChange = useCallback((referenceStatblock: string) => {
    setState(prev => {
      if (prev.parsedData && prev.outputData) {
        const { outputData, validationReport } = runPackPipeline(
          prev.parsedData,
          prev.sourceSystem,
          prev.settings,
          prev.metadata.intendedLevel,
          prev.metadata.role as CreatureRole,
          prev.creatureName || undefined,
          referenceStatblock,
          prev.creatureDescription || undefined,
          prev.externalImport,
        );
        return {
          ...prev,
          referenceStatblock,
          outputData,
          validationReport,
        };
      }

      return { ...prev, referenceStatblock };
    });
  }, []);

  // ── Parse & Convert ───────────────────────────────────────────────────────
  const handleParseAndConvert = useCallback(() => {
    const parserPack = SYSTEM_PACKS[getParserPackId(state.sourceSystem)];
    const parsed = parserPack.parseSourceStatblock(state.sourceText, state.sourceSystem);
    const { outputData, validationReport } = runPackPipeline(
      parsed,
      state.sourceSystem,
      state.settings,
      state.metadata.intendedLevel,
      state.metadata.role as CreatureRole,
      state.creatureName || undefined,
      state.referenceStatblock,
      state.creatureDescription || undefined,
      state.externalImport,
    );
    setState(prev => ({
      ...prev,
      parsedData: parsed,
      settings: {
        ...prev.settings,
        outputPackId: outputData.outputPackId,
      },
      outputData,
      validationReport,
      step: 2,
    }));
    trackEvent('convert_step_complete', {
      step: 'source',
      sourceSystem: state.sourceSystem,
      profileId: state.settings.conversionProfileId,
      outputPackId: outputData.outputPackId,
    });
    const effectiveName = state.creatureName || outputData.name || parsed.name || '';
    if (!title) setTitle(effectiveName);
    if (!state.creatureDescription && parsed.description) {
      setState(prev => ({ ...prev, creatureDescription: parsed.description ?? '' }));
    }
  }, [state.sourceText, state.sourceSystem, state.settings, state.metadata, state.creatureName, state.creatureDescription, state.referenceStatblock, title]);

  // ── Settings change (sliders) ─────────────────────────────────────────────
  const handleSettingsChange = useCallback((settings: ConversionSettings) => {
    setState(prev => {
      if (!prev.parsedData) return prev;
      const normalizedSettings = {
        ...settings,
        outputPackId: getOutputPackId(prev.sourceSystem, settings.conversionProfileId),
      };
      const { outputData, validationReport } = runPackPipeline(
        prev.parsedData,
        prev.sourceSystem,
        normalizedSettings,
        prev.metadata.intendedLevel,
        prev.metadata.role as CreatureRole,
        prev.creatureName || undefined,
        prev.referenceStatblock,
        prev.creatureDescription || undefined,
        prev.externalImport,
      );
      return {
        ...prev,
        settings: normalizedSettings,
        outputData,
        validationReport,
      };
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
      trackEvent('convert_step_complete', {
        step: 'convert',
        action: existingEntry ? 'update' : 'save',
        outputPackId: state.outputData.outputPackId,
        profileId: state.settings.conversionProfileId,
      });
      setState(prev => ({ ...prev, step: 3 }));
    } catch (err) {
      console.error('Failed to save entry:', err);
    }
    setSaving(false);
  }, [state.outputData, state.sourceText, state.parsedData, state.settings.conversionProfileId, projectId, title, tags, existingEntry]);


  const resetWizard = useCallback(() => {
    setState({
      step: 1,
      sourceText: '',
      sourceSystem: '5e',
      detectedSourceSystem: undefined,
      detectedSourceSystemConfidence: undefined,
      hasManualSourceSystemSelection: false,
      creatureName: '',
      creatureDescription: '',
      metadata: {},
      parsedData: null,
      settings: applyProfileSettings('5e', getDefaultSettings(), getDefaultSettings().conversionProfileId),
      outputData: null,
      externalImport: undefined,
      referenceStatblock: '',
      validationReport: undefined,
      isStatblockValid: undefined,
    });
    setTitle('');
    setTags([]);
    setProjectId(defaultProjectId ?? '');
  }, [defaultProjectId]);

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6 sm:space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Create a Duskwarden Stat Card</h1>
        <p className="mt-1 text-text-muted">
          Choose an output system profile to tune balance and formatting.
        </p>
      </div>

      <div className="pb-6 sm:pb-8">
        <Stepper
          steps={STEPS}
          currentStep={state.step}
          onStepClick={(step) => { if (step < state.step) goToStep(step as 1 | 2 | 3); }}
        />
      </div>

      <Card padding="md">
        {state.step === 1 && (
          <Step1Source
            sourceText={state.sourceText}
            sourceSystem={state.sourceSystem}
            detectedSourceSystem={state.detectedSourceSystem}
            detectedSourceSystemConfidence={state.detectedSourceSystemConfidence}
            hasManualSourceSystemSelection={state.hasManualSourceSystemSelection}
            conversionProfileId={state.settings.conversionProfileId}
            creatureName={state.creatureName}
            creatureDescription={state.creatureDescription}
            metadata={state.metadata}
            isValid={state.isStatblockValid}
            onSourceChange={handleSourceChange}
            onSystemChange={handleSystemChange}
            onProfileChange={handleProfileChange}
            onCreatureNameChange={handleCreatureNameChange}
            onDescriptionChange={handleDescriptionChange}
            onMetadataChange={handleMetadataChange}
            onMonstroSelect={(text, system, description, external) => {
              setState(prev => ({
                ...prev,
                sourceText: text,
                sourceSystem: system,
                hasManualSourceSystemSelection: true,
                creatureDescription: description ?? prev.creatureDescription,
                externalImport: external,
                settings: applyProfileSettings(system, prev.settings, prev.settings.conversionProfileId),
              }));
            }}
            onNext={handleParseAndConvert}
          />
        )}

        {state.step === 2 && state.outputData && (
          <Step3Convert
            outputData={state.outputData}
            settings={state.settings}
            projects={projects}
            projectId={projectId}
            title={title}
            tags={tags}
            validationReport={state.validationReport}
            referenceStatblock={state.referenceStatblock ?? ''}
            outputPackId={state.outputData.outputPackId}
            onSettingsChange={handleSettingsChange}
            onProjectChange={setProjectId}
            onTitleChange={setTitle}
            onTagsChange={setTags}
            onReferenceStatblockChange={handleReferenceStatblockChange}
            onBack={() => goToStep(1)}
            onSave={handleSave}
            saving={saving}
          />
        )}

        {state.step === 3 && state.outputData && (
          <Step4Export
            outputData={state.outputData}
            title={title}
            onStartNew={() => {
              trackEvent('convert_export_action', { action: 'start_new' });
              resetWizard();
            }}
            onGoToLibrary={() => {
              trackEvent('convert_export_action', { action: 'go_to_library' });
              router.push('/app/library');
            }}
          />
        )}
      </Card>
    </div>
  );
}
