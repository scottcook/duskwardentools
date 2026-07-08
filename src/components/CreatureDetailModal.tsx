import { Modal } from './Modal'
import type { Entry } from '../lib/types'
import {
  creatureName,
  creatureEpithet,
  creatureSystem,
  statChips,
  creatureAttacks,
  creatureActions,
} from '../lib/creatureModel'
import { systemLabel } from '../lib/systems'

/** Read-only stat block rendered on the design's parchment "sheet". */
export function CreatureDetailModal({ entry, onClose, footer }: {
  entry: Entry
  onClose: () => void
  footer?: React.ReactNode
}) {
  const name = creatureName(entry)
  const ep = creatureEpithet(entry)
  const chips = statChips(entry)
  const p = entry.parsed_json ?? {}
  const attacks = creatureAttacks(entry)
  const actions = creatureActions(entry)

  const rows: { k: string; v: string }[] = [...chips.map((c) => ({ k: labelFor(c.label), v: c.value }))]
  if (p.saves) rows.push({ k: 'Saves', v: String(p.saves) })
  if (p.thac0 !== undefined) rows.push({ k: 'THAC0', v: String(p.thac0) })
  if (p.alignment) rows.push({ k: 'Alignment', v: String(p.alignment) })
  if (attacks.length) {
    rows.push({
      k: 'Attacks',
      v: attacks
        .map((a) => [a.name, a.damage].filter(Boolean).join(' ') + (a.note ? ` (${a.note})` : ''))
        .join(', '),
    })
  }

  return (
    <Modal title={name} onClose={onClose} wide footer={footer}>
      <article className="sheet" style={{ transform: 'none', boxShadow: '3px 4px 0 #000' }}>
        <div className="sysb">{systemLabel(creatureSystem(entry))}</div>
        <h3 className="mname">{name}</h3>
        {ep && <p className="mep">{ep}</p>}
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

function labelFor(short: string): string {
  return (
    { AC: 'Armor Class', HP: 'Hit Points', LV: 'Level', MV: 'Movement', ML: 'Morale' } as Record<
      string,
      string
    >
  )[short] ?? short
}
