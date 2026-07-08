import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import type { ProjectWithCount, NewProject } from '../lib/types'
import { Spinner } from '../components/Spinner'
import { EmptyState } from '../components/EmptyState'
import { ProjectFormModal } from '../components/ProjectFormModal'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { useToast } from '../components/ToastProvider'

export function ProjectsPage() {
  const { notify } = useToast()
  const navigate = useNavigate()
  const [projects, setProjects] = useState<ProjectWithCount[] | null>(null)
  const [error, setError] = useState('')
  const [creating, setCreating] = useState(false)
  const [editing, setEditing] = useState<ProjectWithCount | null>(null)
  const [deleting, setDeleting] = useState<ProjectWithCount | null>(null)

  const load = useCallback(async () => {
    setError('')
    try {
      setProjects(await api.listProjects())
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load projects.')
      setProjects([])
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  async function create(input: NewProject) {
    const project = await api.createProject(input)
    setCreating(false)
    notify(`“${project.name}” raised from the mist`)
    navigate(`/projects/${project.id}`)
  }

  async function saveEdit(input: NewProject) {
    if (!editing) return
    await api.updateProject(editing.id, input)
    setEditing(null)
    notify('Campaign renamed')
    load()
  }

  async function remove() {
    if (!deleting) return
    await api.deleteProject(deleting.id)
    notify(`“${deleting.name}” dissolved — its creatures returned to the library`)
    setDeleting(null)
    load()
  }

  return (
    <>
      <div className="pagehead">
        <div>
          <h2 className="pagetitle">Projects</h2>
          <p className="pagesub">Campaigns and dungeons — each a vault for the horrors you gather.</p>
        </div>
        <div className="pagehead-actions">
          <button className="btn btn-gold" onClick={() => setCreating(true)}>
            ＋ New project
          </button>
        </div>
      </div>
      <hr className="rule" />

      {error && (
        <p className="hint" style={{ color: 'var(--danger)', marginBottom: 16 }} role="alert">
          {error}
        </p>
      )}

      {projects === null ? (
        <Spinner label="Gathering your campaigns…" />
      ) : projects.length === 0 ? (
        <EmptyState
          title="No projects yet"
          action={
            <button className="btn btn-gold" onClick={() => setCreating(true)}>
              ＋ Forge your first project
            </button>
          }
        >
          A project holds the creatures for one campaign or dungeon. Raise one, then fill it from the
          library.
        </EmptyState>
      ) : (
        <div className="grid">
          {projects.map((p) => (
            <div
              key={p.id}
              className="pcard"
              role="button"
              tabIndex={0}
              onClick={() => navigate(`/projects/${p.id}`)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  navigate(`/projects/${p.id}`)
                }
              }}
            >
              <div className="pcard-body">
                <h3 className="pcard-name">{p.name}</h3>
                {p.description && <p className="pcard-desc">{p.description}</p>}
              </div>
              <div className="pcard-foot">
                <span className="pill">
                  <span className="acc">{p.creature_count}</span>
                  {p.creature_count === 1 ? 'creature' : 'creatures'}
                </span>
                <span className="detail-actions" onClick={(e) => e.stopPropagation()}>
                  <button
                    className="btn btn-sm"
                    onClick={() => setEditing(p)}
                    aria-label={`Rename ${p.name}`}
                  >
                    Rename
                  </button>
                  <button
                    className="btn btn-sm btn-danger"
                    onClick={() => setDeleting(p)}
                    aria-label={`Delete ${p.name}`}
                  >
                    Delete
                  </button>
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {creating && <ProjectFormModal onSubmit={create} onClose={() => setCreating(false)} />}
      {editing && (
        <ProjectFormModal initial={editing} onSubmit={saveEdit} onClose={() => setEditing(null)} />
      )}
      {deleting && (
        <ConfirmDialog
          title="Dissolve this project?"
          message={`“${deleting.name}” will be removed. Its ${deleting.creature_count} creature(s) are not destroyed — they return to your library.`}
          confirmLabel="Delete project"
          danger
          onConfirm={remove}
          onCancel={() => setDeleting(null)}
        />
      )}
    </>
  )
}
