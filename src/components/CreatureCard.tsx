import type { ReactNode } from 'react'
import type { Entry } from '../lib/types'
import {
  creatureName,
  creatureEpithet,
  creatureSystem,
  statChips,
  attacksSummary,
} from '../lib/creatureModel'
import { systemLabel } from '../lib/systems'

/** A creature summary card. Actions are supplied by the caller as `children`. */
export function CreatureCard({
  entry,
  onView,
  children,
}: {
  entry: Entry
  onView?: (e: Entry) => void
  children?: ReactNode
}) {
  const name = creatureName(entry)
  const ep = creatureEpithet(entry)
  const chips = statChips(entry)
  const atk = attacksSummary(entry)
  const sys = creatureSystem(entry)

  return (
    <article className="ccard">
      <div className="ccard-body">
        <div className="ccard-top">
          <h3 className="ccard-name">
            {onView ? (
              <button
                className="link-btn"
                style={{ font: 'inherit', color: 'inherit', textDecoration: 'none', textAlign: 'left' }}
                onClick={() => onView(entry)}
              >
                {name}
              </button>
            ) : (
              name
            )}
          </h3>
          {sys && <span className="kind">{systemLabel(sys)}</span>}
        </div>
        {ep && <p className="ccard-ep">{ep}</p>}
        {chips.length > 0 && (
          <div className="ccard-stats">
            {chips.map((c) => (
              <span className="stat-chip" key={c.label}>
                <b>{c.label}</b> {c.value}
              </span>
            ))}
          </div>
        )}
        {atk && (
          <p className="hint" style={{ marginTop: 10 }}>
            ⚔ {atk}
          </p>
        )}
        {entry.tags.length > 0 && (
          <div className="tagline-chips">
            {entry.tags.map((t) => (
              <span className="tag-chip" key={t}>
                {t}
              </span>
            ))}
          </div>
        )}
      </div>
      {children && <div className="ccard-foot">{children}</div>}
    </article>
  )
}
