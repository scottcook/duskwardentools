import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Modal } from './Modal'
import { Spinner } from './Spinner'
import { api } from '../lib/api'
import type { Entry } from '../lib/types'
import {
  creatureName,
  creatureEpithet,
  creatureSystem,
  searchHaystack,
  statChips,
} from '../lib/creatureModel'
import { systemLabel } from '../lib/systems'

/**
 * Pick creatures from the library to add to a project. Shows every creature
 * not already in this project (including those loose or in another project).
 */
export function AddCreaturesModal({
  projectId,
  onAdd,
  onClose,
}: {
  projectId: string
  onAdd: (entry: Entry) => Promise<void>
  onClose: () => void
}) {
  const [all, setAll] = useState<Entry[] | null>(null)
  const [q, setQ] = useState('')
  const [busyId, setBusyId] = useState<string | null>(null)
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    api.listCreatures().then(
      (list) => setAll(list),
      () => setAll([]),
    )
  }, [])

  const candidates = useMemo(() => {
    const list = (all ?? []).filter((c) => c.project_id !== projectId)
    const query = q.trim().toLowerCase()
    const filtered = query
      ? list.filter((c) => query.split(/\s+/).every((t) => searchHaystack(c).includes(t)))
      : list
    return filtered.sort((a, b) => creatureName(a).localeCompare(creatureName(b)))
  }, [all, projectId, q])

  async function add(entry: Entry) {
    setBusyId(entry.id)
    try {
      await onAdd(entry)
      setAddedIds((s) => new Set(s).add(entry.id))
    } finally {
      setBusyId(null)
    }
  }

  return (
    <Modal title="Add creatures from library" onClose={onClose} wide
      footer={<button className="btn btn-gold" onClick={onClose}>Done</button>}
    >
      <div className="searchbox">
        <span className="sicon" aria-hidden="true">
          ⚲
        </span>
        <input
          className="search-in"
          type="search"
          placeholder="Search the library…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          aria-label="Search the library"
          autoFocus
        />
      </div>

      {all === null ? (
        <Spinner label="Opening the bestiary…" />
      ) : candidates.length === 0 ? (
        <p className="dim" style={{ fontStyle: 'italic', padding: '18px 2px' }}>
          {all.length === 0 ? (
            <>
              Your library has no creatures yet. <Link to="/convert">Convert one</Link> first.
            </>
          ) : (
            'No matching creatures outside this project.'
          )}
        </p>
      ) : (
        <div className="tlist" style={{ maxHeight: '48vh', overflowY: 'auto', paddingRight: 4 }}>
          {candidates.map((c) => {
            const added = addedIds.has(c.id)
            const chips = statChips(c).slice(0, 3)
            return (
              <div key={c.id} className="trow" style={{ cursor: 'default' }}>
                <span style={{ minWidth: 0 }}>
                  <span className="tn" style={{ whiteSpace: 'normal' }}>
                    {creatureName(c)}
                  </span>
                  <span className="te" style={{ display: 'block', marginTop: 2 }}>
                    {creatureEpithet(c) || chips.map((ch) => `${ch.label} ${ch.value}`).join(' · ')}
                  </span>
                </span>
                <span className="detail-actions" style={{ flex: 'none' }}>
                  {creatureSystem(c) && <span className="kind">{systemLabel(creatureSystem(c))}</span>}
                  <button
                    className={'btn btn-sm' + (added ? '' : ' btn-gold')}
                    disabled={busyId === c.id || added}
                    onClick={() => add(c)}
                  >
                    {added ? '✓ Added' : busyId === c.id ? '…' : '＋ Add'}
                  </button>
                </span>
              </div>
            )
          })}
        </div>
      )}
    </Modal>
  )
}
