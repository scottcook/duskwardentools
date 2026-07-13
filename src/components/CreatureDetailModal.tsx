import { useState } from 'react'
import { Modal } from './Modal'
import type { Entry } from '../lib/types'
import {
  creatureName,
  creatureEpithet,
  creatureSystem,
  convertedRows,
  convertedSections,
} from '../lib/creatureModel'
import { systemLabel } from '../lib/systems'

/** Read-only stat block rendered on the design's parchment "sheet". */
export function CreatureDetailModal({ entry, onClose, footer }: {
  entry: Entry
  onClose: () => void
  footer?: React.ReactNode
}) {
  const hasConverted = convertedRows(entry).length > 0
  const [view, setView] = useState<'converted' | 'source'>(hasConverted ? 'converted' : 'source')
  const name = creatureName(entry)
  const ep = creatureEpithet(entry)
  const p = entry.parsed_json ?? {}
  const sourceAttacks = Array.isArray(p.attacks) ? p.attacks : []
  const sourceActions = Array.isArray(p.specialActions) ? p.specialActions : []

  const sourceRows: { k: string; v: string }[] = []
  if (p.ac !== undefined) sourceRows.push({ k: 'Armor Class', v: String(p.ac) })
  if (p.hp !== undefined) sourceRows.push({ k: 'Hit Points', v: String(p.hp) })
  if (p.level !== undefined) sourceRows.push({ k: 'Level / HD', v: String(p.level) })
  if (p.movement) sourceRows.push({ k: 'Movement', v: String(p.movement) })
  if (p.morale !== undefined) sourceRows.push({ k: 'Morale', v: String(p.morale) })
  if (p.stats) sourceRows.push({ k: 'Stats / Abilities', v: String(p.stats) })
  if (p.saves) sourceRows.push({ k: 'Saves', v: String(p.saves) })
  if (p.thac0 !== undefined) sourceRows.push({ k: 'THAC0', v: String(p.thac0) })
  if (p.alignment) sourceRows.push({ k: 'Alignment', v: String(p.alignment) })
  if (sourceAttacks.length) {
    sourceRows.push({
      k: 'Attacks',
      v: sourceAttacks
        .map((a) => [a.name, a.damage].filter(Boolean).join(' ') + (a.note ? ` (${a.note})` : ''))
        .join(', '),
    })
  }

  const showingConverted = view === 'converted' && hasConverted
  const rows = showingConverted ? convertedRows(entry) : sourceRows
  const actions = showingConverted ? convertedSections(entry).map((section) => ({
    name: section.h,
    description: section.d,
  })) : sourceActions
  const displaySystem = showingConverted
    ? entry.output_json?.system
    : entry.parsed_json?.system
  const displayName = showingConverted
    ? name
    : entry.parsed_json?.name?.trim() || entry.title
  const displayEp = showingConverted
    ? ep
    : String(entry.parsed_json?.description || '').trim()

  return (
    <Modal title={name} onClose={onClose} wide footer={footer}>
      {hasConverted && (
        <div className="stat-view-toggle" role="group" aria-label="Stat block version">
          <button
            type="button"
            className={'btn btn-sm' + (showingConverted ? ' btn-gold' : '')}
            aria-pressed={showingConverted}
            onClick={() => setView('converted')}
          >
            Converted
          </button>
          <button
            type="button"
            className={'btn btn-sm' + (!showingConverted ? ' btn-gold' : '')}
            aria-pressed={!showingConverted}
            onClick={() => setView('source')}
          >
            Source
          </button>
        </div>
      )}
      <article className="sheet" style={{ transform: 'none', boxShadow: '3px 4px 0 #000' }}>
        <div className="sysb">{systemLabel(displaySystem || creatureSystem(entry))}</div>
        <h3 className="mname">{displayName}</h3>
        {displayEp && <p className="mep">{displayEp}</p>}
        <div className="hrh" />
        <div className="hrt" />
        {rows.map((r) => (
          <p className="srow" key={r.k}>
            <b>{r.k}</b> {r.v}
          </p>
        ))}
        {actions.length > 0 && (
          <>
            <div className="hrt" style={{ marginTop: 12 }} />
            {actions.map((s, i) => (
              <p className="sect" key={i}>
                <b className="bi">{s.name}.</b> {s.description}
              </p>
            ))}
          </>
        )}
      </article>
    </Modal>
  )
}
