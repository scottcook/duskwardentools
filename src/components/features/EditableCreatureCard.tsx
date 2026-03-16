'use client';

import { useState, useCallback } from 'react';
import { Card, ThreatBadge, Button } from '@/components/ui';
import { OUTPUT_PROFILES } from '@/types';
import type { OutputCreatureData, ThreatTier, Attack, SpecialAction } from '@/types';

interface EditableCreatureCardProps {
  data: OutputCreatureData;
  onSave: (updated: OutputCreatureData) => void | Promise<void>;
  saving?: boolean;
}

function EditField({
  value,
  onChange,
  className = '',
  type = 'text',
  ...props
}: {
  value: string | number;
  onChange: (val: string) => void;
  className?: string;
  type?: string;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value' | 'type'>) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`bg-bg-elevated border border-border rounded px-2 py-1 text-text-primary focus:outline-none focus:ring-1 focus:ring-accent ${className}`}
      {...props}
    />
  );
}

export function EditableCreatureCard({ data, onSave, saving = false }: EditableCreatureCardProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<OutputCreatureData>(data);

  const showMorale = data.showMorale ?? true;
  const showReaction = data.showReaction ?? false;
  const profileLabel = data.outputProfile ? OUTPUT_PROFILES[data.outputProfile]?.label : null;
  const isEdited = data.manuallyEdited === true;

  const enterEdit = useCallback(() => {
    setDraft({ ...data });
    setEditing(true);
  }, [data]);

  const cancelEdit = useCallback(() => {
    setDraft({ ...data });
    setEditing(false);
  }, [data]);

  const handleSave = useCallback(async () => {
    await onSave({ ...draft, manuallyEdited: true });
    setEditing(false);
  }, [draft, onSave]);

  const updateDraft = useCallback(<K extends keyof OutputCreatureData>(key: K, val: OutputCreatureData[K]) => {
    setDraft((prev) => ({ ...prev, [key]: val }));
  }, []);

  const updateAttack = useCallback((index: number, field: keyof Attack, val: string | number | undefined) => {
    setDraft((prev) => {
      const attacks = [...prev.attacks];
      attacks[index] = { ...attacks[index], [field]: val };
      return { ...prev, attacks };
    });
  }, []);

  const removeAttack = useCallback((index: number) => {
    setDraft((prev) => ({ ...prev, attacks: prev.attacks.filter((_, i) => i !== index) }));
  }, []);

  const addAttack = useCallback(() => {
    setDraft((prev) => ({ ...prev, attacks: [...prev.attacks, { name: 'New Attack', bonus: 0, damage: '1d6' }] }));
  }, []);

  const updateTrait = useCallback((index: number, val: string) => {
    setDraft((prev) => {
      const traits = [...prev.traits];
      traits[index] = val;
      return { ...prev, traits };
    });
  }, []);

  const removeTrait = useCallback((index: number) => {
    setDraft((prev) => ({ ...prev, traits: prev.traits.filter((_, i) => i !== index) }));
  }, []);

  const addTrait = useCallback(() => {
    setDraft((prev) => ({ ...prev, traits: [...prev.traits, ''] }));
  }, []);

  const updateSpecialAction = useCallback((index: number, field: keyof SpecialAction, val: string) => {
    setDraft((prev) => {
      const actions = [...prev.specialActions];
      actions[index] = { ...actions[index], [field]: val };
      return { ...prev, specialActions: actions };
    });
  }, []);

  const removeSpecialAction = useCallback((index: number) => {
    setDraft((prev) => ({ ...prev, specialActions: prev.specialActions.filter((_, i) => i !== index) }));
  }, []);

  const addSpecialAction = useCallback(() => {
    setDraft((prev) => ({
      ...prev,
      specialActions: [...prev.specialActions, { name: 'New Action', description: '' }],
    }));
  }, []);

  const d = editing ? draft : data;
  const dShowMorale = editing ? (draft.showMorale ?? true) : showMorale;

  return (
    <Card>
      <div className="space-y-4">
        {/* Toolbar */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            {isEdited && !editing && (
              <span className="text-[10px] font-semibold uppercase tracking-widest text-accent/70 border border-accent/30 bg-accent/5 rounded px-1.5 py-0.5">
                Edited
              </span>
            )}
          </div>
          {editing ? (
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={cancelEdit} disabled={saving}>
                Cancel
              </Button>
              <Button size="sm" onClick={handleSave} loading={saving}>
                <svg className="w-3.5 h-3.5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Save
              </Button>
            </div>
          ) : (
            <button
              type="button"
              onClick={enterEdit}
              className="p-1.5 rounded-md text-text-muted hover:text-accent hover:bg-bg-elevated transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              aria-label="Edit creature stats"
              title="Edit stats"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
            </button>
          )}
        </div>

        {/* Header */}
        <div className="flex items-start justify-between border-b border-border pb-3 gap-2 flex-wrap">
          <div className="min-w-0 flex-1">
            {editing ? (
              <EditField
                value={d.name}
                onChange={(v) => updateDraft('name', v)}
                className="text-xl font-bold w-full"
              />
            ) : (
              <h3 className="text-xl font-bold text-text-primary">{d.name}</h3>
            )}
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <ThreatBadge tier={d.threatTier as ThreatTier} />
              {profileLabel && (
                <span className="text-xs text-text-muted italic">{profileLabel}</span>
              )}
            </div>
          </div>
          {dShowMorale && (
            <div className="text-right text-sm shrink-0">
              {editing ? (
                <div className="flex items-center gap-1.5">
                  <span className="text-text-muted text-xs">Morale</span>
                  <EditField
                    type="number"
                    value={d.morale}
                    onChange={(v) => updateDraft('morale', parseInt(v, 10) || 0)}
                    className="w-14 text-center text-sm"
                  />
                </div>
              ) : (
                <div className="text-text-muted">Morale: {d.morale}</div>
              )}
            </div>
          )}
        </div>

        {/* Core stats */}
        <div className="grid grid-cols-3 gap-4 text-center border-b border-border pb-3">
          <div>
            {editing ? (
              <EditField
                type="number"
                value={d.ac}
                onChange={(v) => updateDraft('ac', parseInt(v, 10) || 0)}
                className="w-16 mx-auto text-center text-2xl font-bold text-accent"
              />
            ) : (
              <div className="text-2xl font-bold text-accent">{d.ac}</div>
            )}
            <div className="text-xs text-text-muted uppercase tracking-wide">AC</div>
          </div>
          <div>
            {editing ? (
              <EditField
                type="number"
                value={d.hp}
                onChange={(v) => updateDraft('hp', parseInt(v, 10) || 0)}
                className="w-16 mx-auto text-center text-2xl font-bold text-accent"
              />
            ) : (
              <div className="text-2xl font-bold text-accent">{d.hp}</div>
            )}
            <div className="text-xs text-text-muted uppercase tracking-wide">HP</div>
          </div>
          <div>
            {editing ? (
              <EditField
                value={d.movement}
                onChange={(v) => updateDraft('movement', v)}
                className="w-full text-center text-lg font-bold text-accent"
              />
            ) : (
              <div className="text-lg font-bold text-accent">{d.movement}</div>
            )}
            <div className="text-xs text-text-muted uppercase tracking-wide">Move</div>
          </div>
        </div>

        {/* Attacks */}
        {(d.attacks.length > 0 || editing) && (
          <div className="border-b border-border pb-3">
            <h4 className="text-sm font-semibold text-text-muted uppercase tracking-wide mb-2">Attacks</h4>
            <ul className="space-y-2">
              {d.attacks.map((attack, index) => (
                <li key={index}>
                  {editing ? (
                    <div className="flex flex-wrap items-center gap-2">
                      <EditField
                        value={attack.name}
                        onChange={(v) => updateAttack(index, 'name', v)}
                        className="text-sm flex-1 min-w-[100px]"
                        placeholder="Name"
                      />
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-text-muted">+</span>
                        <EditField
                          type="number"
                          value={attack.bonus ?? 0}
                          onChange={(v) => updateAttack(index, 'bonus', parseInt(v, 10) || 0)}
                          className="w-14 text-sm text-center"
                        />
                      </div>
                      <EditField
                        value={attack.damage ?? ''}
                        onChange={(v) => updateAttack(index, 'damage', v)}
                        className="w-24 text-sm"
                        placeholder="Damage"
                      />
                      <button
                        type="button"
                        onClick={() => removeAttack(index)}
                        className="p-1 text-text-muted hover:text-error transition-colors"
                        aria-label="Remove attack"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ) : (
                    <div className="text-sm text-text-primary">
                      <span className="font-medium">{attack.name}</span>
                      {attack.bonus !== undefined && (
                        <span className="text-accent"> +{attack.bonus}</span>
                      )}
                      {attack.damage && (
                        <span className="text-text-muted"> ({attack.damage})</span>
                      )}
                      {attack.description && (
                        <span className="text-text-muted"> — {attack.description}</span>
                      )}
                    </div>
                  )}
                </li>
              ))}
            </ul>
            {editing && (
              <button
                type="button"
                onClick={addAttack}
                className="mt-2 text-xs text-accent hover:text-accent-hover transition-colors flex items-center gap-1"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add attack
              </button>
            )}
          </div>
        )}

        {/* Saves */}
        {(d.saves || editing) && (
          <div className="border-b border-border pb-3">
            <h4 className="text-sm font-semibold text-text-muted uppercase tracking-wide mb-1">Saves</h4>
            {editing ? (
              <EditField
                value={d.saves}
                onChange={(v) => updateDraft('saves', v)}
                className="w-full text-sm"
              />
            ) : (
              <p className="text-sm text-text-primary">{d.saves}</p>
            )}
          </div>
        )}

        {/* Traits */}
        {(d.traits.length > 0 || editing) && (
          <div className="border-b border-border pb-3">
            <h4 className="text-sm font-semibold text-text-muted uppercase tracking-wide mb-2">Traits</h4>
            <ul className="space-y-1.5">
              {d.traits.map((trait, index) => (
                <li key={index}>
                  {editing ? (
                    <div className="flex items-center gap-2">
                      <EditField
                        value={trait}
                        onChange={(v) => updateTrait(index, v)}
                        className="flex-1 text-sm"
                      />
                      <button
                        type="button"
                        onClick={() => removeTrait(index)}
                        className="p-1 text-text-muted hover:text-error transition-colors shrink-0"
                        aria-label="Remove trait"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ) : (
                    <div className="text-sm text-text-primary flex items-start gap-2">
                      <span className="text-text-muted mt-0.5 shrink-0">•</span>
                      <span>{trait}</span>
                    </div>
                  )}
                </li>
              ))}
            </ul>
            {editing && (
              <button
                type="button"
                onClick={addTrait}
                className="mt-2 text-xs text-accent hover:text-accent-hover transition-colors flex items-center gap-1"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add trait
              </button>
            )}
          </div>
        )}

        {/* Special Actions */}
        {(d.specialActions.length > 0 || editing) && (
          <div className="border-b border-border pb-3">
            <h4 className="text-sm font-semibold text-text-muted uppercase tracking-wide mb-2">Special Actions</h4>
            <ul className="space-y-3">
              {d.specialActions.map((action, index) => (
                <li key={index}>
                  {editing ? (
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2">
                        <EditField
                          value={action.name}
                          onChange={(v) => updateSpecialAction(index, 'name', v)}
                          className="flex-1 text-sm font-medium"
                          placeholder="Name"
                        />
                        <EditField
                          value={action.recharge ?? ''}
                          onChange={(v) => updateSpecialAction(index, 'recharge', v)}
                          className="w-28 text-sm"
                          placeholder="Recharge"
                        />
                        <button
                          type="button"
                          onClick={() => removeSpecialAction(index)}
                          className="p-1 text-text-muted hover:text-error transition-colors shrink-0"
                          aria-label="Remove action"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                      <textarea
                        value={action.description}
                        onChange={(e) => updateSpecialAction(index, 'description', e.target.value)}
                        className="w-full bg-bg-elevated border border-border rounded px-2 py-1.5 text-sm text-text-primary resize-y min-h-[48px] focus:outline-none focus:ring-1 focus:ring-accent"
                        placeholder="Description"
                      />
                    </div>
                  ) : (
                    <div className="text-sm">
                      <span className="font-medium text-text-primary">{action.name}</span>
                      {action.recharge && (
                        <span className="text-accent"> ({action.recharge})</span>
                      )}
                      <p className="text-text-muted mt-0.5">{action.description}</p>
                    </div>
                  )}
                </li>
              ))}
            </ul>
            {editing && (
              <button
                type="button"
                onClick={addSpecialAction}
                className="mt-2 text-xs text-accent hover:text-accent-hover transition-colors flex items-center gap-1"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add action
              </button>
            )}
          </div>
        )}

        {/* Reaction */}
        {showReaction && !editing && (
          <div className="border-b border-border pb-3">
            <h4 className="text-sm font-semibold text-text-muted uppercase tracking-wide mb-1">Reaction</h4>
            <p className="text-xs text-text-muted">Roll 2d6 on first encounter to determine initial attitude.</p>
          </div>
        )}

        {/* Loot */}
        {(d.lootNotes || editing) && (
          <div>
            <h4 className="text-sm font-semibold text-text-muted uppercase tracking-wide mb-1">Loot</h4>
            {editing ? (
              <EditField
                value={d.lootNotes}
                onChange={(v) => updateDraft('lootNotes', v)}
                className="w-full text-sm"
              />
            ) : (
              <p className="text-sm text-text-primary">{d.lootNotes}</p>
            )}
          </div>
        )}

        {/* Disclaimer */}
        {!editing && (
          <p className="text-xs text-text-muted border-t border-border/40 pt-2">
            Duskwarden Stat Card · Independent tool, not affiliated with The Arcane Library.
          </p>
        )}
      </div>
    </Card>
  );
}
