import { useEffect, useRef, useState } from 'react'
import type { Project } from '../lib/types'

/**
 * Dropdown to assign a creature to a project (or move / remove it). A creature
 * belongs to at most one project — matching the DB's single `project_id`.
 */
export function AddToProjectMenu({
  projects,
  currentProjectId,
  onAssign,
  onCreateProject,
  label,
}: {
  projects: Project[]
  currentProjectId: string | null
  onAssign: (projectId: string | null) => Promise<void> | void
  onCreateProject?: () => void
  label?: string
}) {
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const current = projects.find((p) => p.id === currentProjectId) || null
  const btnLabel = label ?? (current ? `In: ${current.name}` : '+ Add to project')

  async function choose(projectId: string | null) {
    setBusy(true)
    try {
      await onAssign(projectId)
      setOpen(false)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="atp" ref={wrapRef} style={{ position: 'relative' }}>
      <button
        className="btn btn-sm"
        aria-haspopup="menu"
        aria-expanded={open}
        disabled={busy}
        onClick={() => setOpen((o) => !o)}
        style={{ width: '100%' }}
      >
        <span
          style={{
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            maxWidth: '100%',
          }}
        >
          {busy ? '…' : btnLabel}
        </span>
        <span aria-hidden="true" style={{ opacity: 0.7 }}>
          ▾
        </span>
      </button>
      {open && (
        <div className="dropdown-menu" role="menu">
          {projects.length === 0 && (
            <div className="dim" style={{ padding: '10px 12px', fontSize: 13, fontStyle: 'italic' }}>
              No projects yet.
            </div>
          )}
          {projects.map((p) => (
            <button
              key={p.id}
              role="menuitem"
              className="menu-row"
              onClick={() => choose(p.id)}
              disabled={p.id === currentProjectId}
              style={menuRowStyle(p.id === currentProjectId)}
            >
              <span
                style={{
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {p.name}
              </span>
              {p.id === currentProjectId && <span className="acc">✓</span>}
            </button>
          ))}
          {current && (
            <button
              role="menuitem"
              onClick={() => choose(null)}
              style={{ ...menuRowStyle(false), color: 'var(--danger)', borderTop: '1px solid var(--line)' }}
            >
              Remove from project
            </button>
          )}
          {onCreateProject && (
            <button
              role="menuitem"
              onClick={() => {
                setOpen(false)
                onCreateProject()
              }}
              style={{
                ...menuRowStyle(false),
                color: 'var(--acc)',
                borderTop: '1px solid var(--line)',
              }}
            >
              ＋ New project…
            </button>
          )}
        </div>
      )}
    </div>
  )
}

function menuRowStyle(active: boolean): React.CSSProperties {
  return {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    width: '100%',
    textAlign: 'left',
    background: 'none',
    border: 0,
    color: active ? 'var(--dim)' : 'var(--text)',
    font: 'inherit',
    fontSize: 14,
    padding: '9px 12px',
    cursor: active ? 'default' : 'pointer',
  }
}
