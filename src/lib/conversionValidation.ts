import { statsForTarget, type ForgeMonster } from './convert'
import { systemLabel } from './systems'

export type ForgeField =
  | 'name'
  | 'hd'
  | 'ac'
  | 'speed'
  | 'ml'
  | 'al'
  | 'kind'
  | 'stats'
  | 'saves'
  | 'statsOverride'
  | 'savesOverride'
  | 'atkText'
  | 'traitsText'

export type ConversionWarningSeverity = 'blocking' | 'info'

export interface ConversionWarning {
  field: ForgeField
  label: string
  message: string
  severity: ConversionWarningSeverity
}

const LABELS: Record<ForgeField, string> = {
  name: 'Name',
  hd: 'Hit Dice',
  ac: 'Armor Class',
  speed: 'Speed',
  ml: 'Morale',
  al: 'Alignment',
  kind: 'Kind',
  stats: 'Stats / abilities',
  saves: 'Saves',
  statsOverride: 'Target stats override',
  savesOverride: 'Target saves override',
  atkText: 'Attacks',
  traitsText: 'Special traits',
}

function isBlank(value: unknown): boolean {
  return value === undefined || value === null || String(value).trim() === ''
}

function warning(
  field: ForgeField,
  message: string,
  severity: ConversionWarningSeverity,
): ConversionWarning {
  return { field, label: LABELS[field], message, severity }
}

export function blockingWarnings(warnings: ConversionWarning[]): ConversionWarning[] {
  return warnings.filter((w) => w.severity === 'blocking')
}

export function infoWarnings(warnings: ConversionWarning[]): ConversionWarning[] {
  return warnings.filter((w) => w.severity === 'info')
}

/**
 * Tiered conversion feedback:
 * - blocking: blank essentials that must be filled before converting
 * - info: missing source fields with forge fallbacks, or cross-system
 *   stats/saves that will be derived from HD / kind / overrides
 *
 * Only blocking warnings gate Transmute.
 */
export function getConversionWarnings(
  monster: ForgeMonster,
  sourceSystem: string,
  targetSystem: string,
  missingSourceFields: ReadonlySet<string>,
): ConversionWarning[] {
  const warnings: ConversionWarning[] = []
  const target = systemLabel(targetSystem)
  const source = systemLabel(sourceSystem)

  const essential: Array<[ForgeField, unknown, string]> = [
    ['name', monster.name, 'The converted creature needs a name.'],
    ['hd', monster.hd, `${target} calculations need Hit Dice or level.`],
    ['ac', monster.ac, `${target} needs an armor value.`],
    ['speed', monster.speed, `${target} movement cannot be inferred safely without a speed.`],
    ['atkText', monster.atkText, `${target} needs at least one attack.`],
  ]

  for (const [field, value, message] of essential) {
    if (isBlank(value)) {
      warnings.push(warning(field, message, 'blocking'))
    } else if (missingSourceFields.has(field)) {
      warnings.push(
        warning(
          field,
          `${LABELS[field]} was not present in the ${source} source. Review the forge value before treating it as ${source} truth.`,
          'info',
        ),
      )
    }
  }

  const derivedField: 'stats' | 'saves' | null =
    targetSystem === 'dnd5e' || targetSystem === 'shadowdark'
      ? 'stats'
      : targetSystem === 'ose' || targetSystem === 'dcc' || targetSystem === 'pf2e'
        ? 'saves'
        : null

  const hasCompatibleValue =
    derivedField === 'stats'
      ? !isBlank(monster.statsOverride) ||
        Boolean(statsForTarget(sourceSystem, targetSystem, monster.stats))
      : derivedField === 'saves'
        ? !isBlank(monster.savesOverride) ||
          (sourceSystem === targetSystem && !isBlank(monster.saves))
        : true

  if (derivedField && !hasCompatibleValue) {
    const detail =
      targetSystem === 'shadowdark' && sourceSystem === 'bfrpg'
        ? 'Shadowdark uses ability modifiers for saves, but Basic Fantasy does not provide that stat profile.'
        : missingSourceFields.has(derivedField)
          ? `${target} uses ${LABELS[derivedField].toLowerCase()}, but none were found in the ${source} source.`
          : `${target} uses a different ${LABELS[derivedField].toLowerCase()} format than ${source}.`
    const overrideField = derivedField === 'stats' ? 'statsOverride' : 'savesOverride'
    warnings.push(
      warning(
        overrideField,
        `${detail} Duskwarden will derive values from HD, speed, and creature kind unless you enter a target override.`,
        'info',
      ),
    )
  }

  return warnings
}
