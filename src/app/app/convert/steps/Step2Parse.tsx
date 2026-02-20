'use client';

import { useState } from 'react';
import { Button, Input } from '@/components/ui';
import type { ParsedCreatureData, Attack } from '@/types';

interface Step2ParseProps {
  parsedData: ParsedCreatureData;
  warnings: string[];
  onDataChange: (data: ParsedCreatureData) => void;
  onBack: () => void;
  onNext: () => void;
}

export function Step2Parse({
  parsedData,
  warnings,
  onDataChange,
  onBack,
  onNext,
}: Step2ParseProps) {
  const [newAttackName, setNewAttackName] = useState('');

  const updateField = <K extends keyof ParsedCreatureData>(
    key: K,
    value: ParsedCreatureData[K]
  ) => {
    onDataChange({ ...parsedData, [key]: value });
  };

  const addAttack = () => {
    if (!newAttackName.trim()) return;
    const attacks = [...(parsedData.attacks || []), { name: newAttackName.trim() }];
    updateField('attacks', attacks);
    setNewAttackName('');
  };

  const updateAttack = (index: number, field: keyof Attack, value: string | number | undefined) => {
    const attacks = [...(parsedData.attacks || [])];
    attacks[index] = { ...attacks[index], [field]: value };
    updateField('attacks', attacks);
  };

  const removeAttack = (index: number) => {
    const attacks = (parsedData.attacks || []).filter((_, i) => i !== index);
    updateField('attacks', attacks);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-text-primary mb-2">Step 2: Review Parsed Data</h2>
        <p className="text-sm text-text-muted">
          Review and correct the extracted values. Edit any fields that weren&apos;t parsed correctly.
        </p>
      </div>

      {warnings.length > 0 && (
        <div className="p-4 bg-accent/10 border border-accent/30 rounded-lg">
          <h3 className="text-sm font-semibold text-accent mb-2">Parser Warnings</h3>
          <ul className="text-sm text-text-muted space-y-1">
            {warnings.map((warning, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="text-accent">•</span>
                {warning}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input
          label="Name"
          value={parsedData.name || ''}
          onChange={(e) => updateField('name', e.target.value)}
          placeholder="Creature name"
        />

        <div className="grid grid-cols-3 gap-2">
          <Input
            label="AC"
            type="number"
            min={0}
            max={30}
            value={parsedData.ac ?? ''}
            onChange={(e) => updateField('ac', e.target.value ? parseInt(e.target.value, 10) : undefined)}
            placeholder="AC"
          />

          <Input
            label="HP"
            type="number"
            min={1}
            max={999}
            value={parsedData.hp ?? ''}
            onChange={(e) => updateField('hp', e.target.value ? parseInt(e.target.value, 10) : undefined)}
            placeholder="HP"
          />

          <Input
            label="Level/CR"
            type="number"
            min={0}
            max={30}
            value={parsedData.level ?? ''}
            onChange={(e) => updateField('level', e.target.value ? parseInt(e.target.value, 10) : undefined)}
            placeholder="Level"
          />
        </div>
      </div>

      <Input
        label="Movement"
        value={parsedData.movement || ''}
        onChange={(e) => updateField('movement', e.target.value)}
        placeholder="30 ft, fly 60 ft"
      />

      <Input
        label="Saves"
        value={parsedData.saves || ''}
        onChange={(e) => updateField('saves', e.target.value)}
        placeholder="Str +5, Dex +3"
      />

      <div>
        <label className="block text-sm font-medium text-text-primary mb-2">Attacks</label>
        <div className="space-y-2">
          {(parsedData.attacks || []).map((attack, index) => (
            <div key={index} className="flex items-center gap-2 p-3 bg-bg-elevated rounded-lg">
              <Input
                value={attack.name}
                onChange={(e) => updateAttack(index, 'name', e.target.value)}
                placeholder="Attack name"
                className="flex-1"
              />
              <Input
                type="number"
                value={attack.bonus ?? ''}
                onChange={(e) => updateAttack(index, 'bonus', e.target.value ? parseInt(e.target.value, 10) : undefined)}
                placeholder="+X"
                className="w-20"
              />
              <Input
                value={attack.damage || ''}
                onChange={(e) => updateAttack(index, 'damage', e.target.value)}
                placeholder="1d6+2"
                className="w-28"
              />
              <button
                type="button"
                onClick={() => removeAttack(index)}
                className="p-2 text-text-muted hover:text-error transition-colors"
                aria-label="Remove attack"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))}

          <div className="flex items-center gap-2">
            <Input
              value={newAttackName}
              onChange={(e) => setNewAttackName(e.target.value)}
              placeholder="Add new attack..."
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addAttack())}
              className="flex-1"
            />
            <Button variant="secondary" size="sm" onClick={addAttack} disabled={!newAttackName.trim()}>
              Add
            </Button>
          </div>
        </div>
      </div>

      <div className="flex justify-between pt-4">
        <Button variant="ghost" onClick={onBack}>
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </Button>
        <Button onClick={onNext}>
          Convert
          <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </Button>
      </div>
    </div>
  );
}
