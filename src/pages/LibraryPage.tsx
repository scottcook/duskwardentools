import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../lib/api'
import type { Entry, Project } from '../lib/types'
import { creatureSystem, searchHaystack, creatureName } from '../lib/creatureModel'
import { systemLabel } from '../lib/systems'
import { CreatureCard } from '../components/CreatureCard'
import { CreatureDetailModal } from '../components/CreatureDetailModal'
import { AddToProjectMenu } from '../components/AddToProjectMenu'
import { ProjectFormModal } from '../components/ProjectFormModal'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { Spinner } from '../components/Spinner'
import { EmptyState } from '../components/EmptyState'
import { useToast } from '../components/ToastProvider'
import type { NewProject } from '../lib/types'
import { downloadLibraryExport } from '../lib/libraryExport'

type Assignment = 'all' | 'assigned' | 'unassigned'

export function LibraryPage() {
  const { notify } = useToast()
  const [creatures, setCreatures] = useState<Entry[] | null>(null)
  const [projects, setProjects] = useState<Project[]>([])
  const [error, setError] = useState('')

  const [q, setQ] = useState('')
  const [sys, setSys] = useState('all')
  const [assignment, setAssignment] = useState<Assignment>('all')

  const [viewing, setViewing] = useState<Entry | null>(null)
  const [deleting, setDeleting] = useState<Entry | null>(null)
  const [newProjectFor, setNewProjectFor] = useState<Entry | null>(null)

  const load = useCallback(async () => {
    setError('')
    try {
      const [c, p] = await Promise.all([api.listCreatures(), api.listProjects()])
      setCreatures(c)
      setProjects(p)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load the library.')
      setCreatures([])
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const systemsPresent = useMemo(() => {
    const set = new Set<string>()
    for (const c of creatures ?? []) {
      const s = creatureSystem(c)
      if (s) set.add(s)
    }
    return Array.from(set).sort()
  }, [creatures])

  const filtered = useMemo(() => {
    let list = creatures ?? []
    const query = q.trim().toLowerCase()
    if (query) {
      const terms = query.split(/\s+/)
      list = list.filter((c) => terms.every((t) => searchHaystack(c).includes(t)))
    }
    if (sys !== 'all') list = list.filter((c) => creatureSystem(c) === sys)
    if (assignment === 'assigned') list = list.filter((c) => c.project_id)
    else if (assignment === 'unassigned') list = list.filter((c) => !c.project_id)
    return [...list].sort((a, b) => creatureName(a).localeCompare(creatureName(b)))
  }, [creatures, q, sys, assignment])

  async function assign(entry: Entry, projectId: string | null) {
    try {
      const updated = await api.assignCreatureToProject(entry.id, projectId)
      setCreatures((cs) => (cs ?? []).map((c) => (c.id === entry.id ? updated : c)))
      const proj = projects.find((p) => p.id === projectId)
      notify(projectId ? `Added to “${proj?.name ?? 'project'}”` : 'Returned to the library')
    } catch (e) {
      notify(e instanceof Error ? e.message : 'Could not update creature', 'err')
    }
  }

  async function createProjectAndAssign(input: NewProject) {
    const entry = newProjectFor
    const project = await api.createProject(input)
    setProjects((ps) => [{ ...project }, ...ps])
    setNewProjectFor(null)
    if (entry) await assign(entry, project.id)
    else notify(`“${project.name}” created`)
  }

  async function remove() {
    if (!deleting) return
    try {
      await api.deleteCreature(deleting.id)
      setCreatures((cs) => (cs ?? []).filter((c) => c.id !== deleting.id))
      notify(`“${creatureName(deleting)}” struck from the library`)
    } catch (e) {
      notify(e instanceof Error ? e.message : 'Could not delete', 'err')
    } finally {
      setDeleting(null)
    }
  }

  function downloadAll() {
    if (!creatures) return
    downloadLibraryExport(projects, creatures)
    notify(`Downloaded ${creatures.length} creature${creatures.length === 1 ? '' : 's'}`)
  }

  const total = creatures?.length ?? 0

  return (
    <>
      <div className="pagehead">
        <div>
          <h2 className="pagetitle">Creature Library</h2>
          <p className="pagesub">
            Every horror you've saved. Search the bestiary, then bind one to a project.
          </p>
        </div>
        <div className="pagehead-actions">
          <button className="btn" onClick={downloadAll} disabled={creatures === null}>
            ↓ Download all
          </button>
          <Link className="btn" to="/convert">
            ⟶ Convert a new creature
          </Link>
        </div>
      </div>
      <hr className="rule" />

      <div className="toolbar">
        <div className="searchbox">
          <span className="sicon" aria-hidden="true">
            ⚲
          </span>
          <input
            className="search-in"
            type="search"
            placeholder="Search by name, trait, tag, attack…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            aria-label="Search creatures"
          />
        </div>
        <select
          className="filter-sel"
          value={sys}
          onChange={(e) => setSys(e.target.value)}
          aria-label="Filter by system"
        >
          <option value="all">All systems</option>
          {systemsPresent.map((s) => (
            <option key={s} value={s}>
              {systemLabel(s)}
            </option>
          ))}
        </select>
        <select
          className="filter-sel"
          value={assignment}
          onChange={(e) => setAssignment(e.target.value as Assignment)}
          aria-label="Filter by project assignment"
        >
          <option value="all">All creatures</option>
          <option value="unassigned">Unassigned only</option>
          <option value="assigned">In a project</option>
        </select>
      </div>

      {error && (
        <p className="hint" style={{ color: 'var(--danger)', marginBottom: 16 }} role="alert">
          {error}
        </p>
      )}

      {creatures === null ? (
        <Spinner label="Opening the bestiary…" />
      ) : total === 0 ? (
        <EmptyState
          title="Your library is empty"
          action={
            <Link className="btn btn-gold" to="/convert">
              ⟶ Convert your first creature
            </Link>
          }
        >
          Convert a monster in the Converter and save it here, then bind it to any project.
        </EmptyState>
      ) : filtered.length === 0 ? (
        <EmptyState mark="⚲" title="No creatures match">
          Nothing answers to “{q}”. Loosen the filters and try again.
        </EmptyState>
      ) : (
        <>
          <p className="hint" style={{ marginBottom: 16 }}>
            Showing <span className="acc">{filtered.length}</span> of {total} creatures
          </p>
          <div className="grid">
            {filtered.map((c) => (
              <CreatureCard key={c.id} entry={c} onView={setViewing}>
                <Link
                  className="btn btn-sm"
                  to={`/convert?creature=${encodeURIComponent(c.id)}`}
                  aria-label={`Convert ${creatureName(c)} again`}
                >
                  ↻ Convert
                </Link>
                <AddToProjectMenu
                  projects={projects}
                  currentProjectId={c.project_id}
                  onAssign={(pid) => assign(c, pid)}
                  onCreateProject={() => setNewProjectFor(c)}
                />
                <button
                  className="btn btn-sm btn-danger"
                  onClick={() => setDeleting(c)}
                  aria-label={`Delete ${creatureName(c)}`}
                  style={{ flex: 'none' }}
                >
                  ✕
                </button>
              </CreatureCard>
            ))}
          </div>
        </>
      )}

      {viewing && (
        <CreatureDetailModal
          entry={viewing}
          onClose={() => setViewing(null)}
          footer={
            <>
              <Link
                className="btn"
                to={`/convert?creature=${encodeURIComponent(viewing.id)}`}
                onClick={() => setViewing(null)}
              >
                ↻ Convert again
              </Link>
              <AddToProjectMenu
                projects={projects}
                currentProjectId={viewing.project_id}
                onAssign={async (pid) => {
                  await assign(viewing, pid)
                  setViewing((v) => (v ? { ...v, project_id: pid } : v))
                }}
                onCreateProject={() => {
                  setNewProjectFor(viewing)
                }}
              />
            </>
          }
        />
      )}
      {newProjectFor && (
        <ProjectFormModal onSubmit={createProjectAndAssign} onClose={() => setNewProjectFor(null)} />
      )}
      {deleting && (
        <ConfirmDialog
          title="Delete this creature?"
          message={`“${creatureName(deleting)}” will be permanently removed from your library.`}
          confirmLabel="Delete"
          danger
          onConfirm={remove}
          onCancel={() => setDeleting(null)}
        />
      )}
    </>
  )
}
