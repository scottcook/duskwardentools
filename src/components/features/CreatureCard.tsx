import { Card, ThreatBadge } from '@/components/ui';
import { OUTPUT_PROFILES } from '@/types';
import type { OutputCreatureData, ThreatTier } from '@/types';

interface CreatureCardProps {
  data: OutputCreatureData;
  showPrintStyles?: boolean;
}

export function CreatureCard({ data, showPrintStyles = false }: CreatureCardProps) {
  const showMorale = data.showMorale ?? true;
  const showReaction = data.showReaction ?? false;
  const profileLabel = data.outputProfile ? OUTPUT_PROFILES[data.outputProfile]?.label : null;

  return (
    <Card className={`${showPrintStyles ? 'print:border-black print:bg-white' : ''}`}>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-border pb-3 gap-2 flex-wrap">
          <div>
            <h3 className="text-xl font-bold text-text-primary print:text-black">{data.name}</h3>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <ThreatBadge tier={data.threatTier as ThreatTier} />
              {profileLabel && (
                <span className="text-xs text-text-muted italic">{profileLabel}</span>
              )}
            </div>
          </div>
          {showMorale && (
            <div className="text-right text-sm shrink-0">
              <div className="text-text-muted print:text-gray-600">Morale: {data.morale}</div>
            </div>
          )}
        </div>

        {/* Core stats */}
        <div className="grid grid-cols-3 gap-4 text-center border-b border-border pb-3">
          <div>
            <div className="text-2xl font-bold text-accent print:text-black">{data.ac}</div>
            <div className="text-xs text-text-muted uppercase tracking-wide">AC</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-accent print:text-black">{data.hp}</div>
            <div className="text-xs text-text-muted uppercase tracking-wide">HP</div>
          </div>
          <div>
            <div className="text-lg font-bold text-accent print:text-black">{data.movement}</div>
            <div className="text-xs text-text-muted uppercase tracking-wide">Move</div>
          </div>
        </div>

        {/* Attacks */}
        {data.attacks.length > 0 && (
          <div className="border-b border-border pb-3">
            <h4 className="text-sm font-semibold text-text-muted uppercase tracking-wide mb-2">Attacks</h4>
            <ul className="space-y-1">
              {data.attacks.map((attack, index) => (
                <li key={index} className="text-sm text-text-primary print:text-black">
                  <span className="font-medium">{attack.name}</span>
                  {attack.bonus !== undefined && (
                    <span className="text-accent print:text-gray-700"> +{attack.bonus}</span>
                  )}
                  {attack.damage && (
                    <span className="text-text-muted print:text-gray-600"> ({attack.damage})</span>
                  )}
                  {attack.description && (
                    <span className="text-text-muted print:text-gray-600"> — {attack.description}</span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Saves */}
        {data.saves && (
          <div className="border-b border-border pb-3">
            <h4 className="text-sm font-semibold text-text-muted uppercase tracking-wide mb-1">Saves</h4>
            <p className="text-sm text-text-primary print:text-black">{data.saves}</p>
          </div>
        )}

        {/* Traits */}
        {data.traits.length > 0 && (
          <div className="border-b border-border pb-3">
            <h4 className="text-sm font-semibold text-text-muted uppercase tracking-wide mb-2">Traits</h4>
            <ul className="list-disc list-inside space-y-1">
              {data.traits.map((trait, index) => (
                <li key={index} className="text-sm text-text-primary print:text-black">{trait}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Special Actions */}
        {data.specialActions.length > 0 && (
          <div className="border-b border-border pb-3">
            <h4 className="text-sm font-semibold text-text-muted uppercase tracking-wide mb-2">Special Actions</h4>
            <ul className="space-y-2">
              {data.specialActions.map((action, index) => (
                <li key={index} className="text-sm">
                  <span className="font-medium text-text-primary print:text-black">{action.name}</span>
                  {action.recharge && (
                    <span className="text-accent print:text-gray-700"> ({action.recharge})</span>
                  )}
                  <p className="text-text-muted print:text-gray-600 mt-0.5">{action.description}</p>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Reaction (OSR profile) */}
        {showReaction && (
          <div className="border-b border-border pb-3">
            <h4 className="text-sm font-semibold text-text-muted uppercase tracking-wide mb-1">Reaction</h4>
            <p className="text-xs text-text-muted">Roll 2d6 on first encounter to determine initial attitude.</p>
          </div>
        )}

        {/* Loot */}
        {data.lootNotes && (
          <div>
            <h4 className="text-sm font-semibold text-text-muted uppercase tracking-wide mb-1">Loot</h4>
            <p className="text-sm text-text-primary print:text-black">{data.lootNotes}</p>
          </div>
        )}

        {/* Disclaimer */}
        <p className="text-xs text-text-muted border-t border-border/40 pt-2">
          Duskwarden Stat Card · Independent tool, not affiliated with The Arcane Library.
        </p>
      </div>
    </Card>
  );
}
