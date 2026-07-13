import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { api } from '../lib/api'
import type { Entry, Project, NewProject } from '../lib/types'
import { creatureName } from '../lib/creatureModel'
import { CreatureCard } from '../components/CreatureCard'
import { CreatureDetailModal } from '../components/CreatureDetailModal'
import { AddCreaturesModal } from '../components/AddCreaturesModal'
import { ProjectFormModal } from '../components/ProjectFormModal'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { Spinner } from '../components/Spinner'
import { EmptyState } from '../components/EmptyState'
import { useToast } from '../components/ToastProvider'

export function ProjectDetailPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const { notify } = useToast()

  const [project, setProject] = useState<Project | null | undefined>(undefined) // undefined=loading
  const [creatures, setCreatures] = useState<Entry[] | null>(null)
  const [error, setError] = useState('')

  const [adding, setAdding] = useState(false)
  const [editing, setEditing] = useState(false)
  const [deletingProject, setDeletingProject] = useState(false)
  const [viewing, setViewing] = useState<Entry | null>(null)
  const [removing, setRemoving] = useState<Entry | null>(null)

  const load = useCallback(async () => {
    setError('')
    try {
      const [p, c] = await Promise.all([api.getProject(id), api.listCreatures({ projectId: id })])
      setProject(p)
      setCreatures(c)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load project.')
      setProject(null)
      setCreatures([])
    }
  }, [id])

  useEffect(() => {
    load()
  }, [load])

  async function addCreature(entry: Entry) {
    const updated = await api.assignCreatureToProject(entry.id, id)
    setCreatures((cs) => [updated, ...(cs ?? [])])
    notify(`“${creatureName(entry)}” bound to this project`)
  }

  async function removeCreature() {
    if (!removing) return
    try {
      await api.assignCreatureToProject(removing.id, null)
      setCreatures((cs) => (cs ?? []).filter((c) => c.id !== removing.id))
      notify(`“${creatureName(removing)}” returned to the library`)
    } catch (e) {
      notify(e instanceof Error ? e.message : 'Could not remove creature', 'err')
    } finally {
      setRemoving(null)
    }
  }

  async function saveEdit(input: NewProject) {
    const updated = await api.updateProject(id, input)
    setProject(updated)
    setEditing(false)
    notify('Campaign updated')
  }

  async function deleteProject() {
    await api.deleteProject(id)
    notify(`“${project?.name}” dissolved`)
    navigate('/projects')
  }

  if (project === undefined || creatures === null) {
    return <Spinner label="Unsealing the project…" />
  }

  if (project === null) {
    return (
      <div style={{ marginTop: 40 }}>
        <EmptyState
          title="Project not found"
          action={
            <Link className="btn btn-gold" to="/projects">
              ← Back to projects
            </Link>
          }
        >
          {error || 'This project may have been dissolved, or it belongs to another warden.'}
        </EmptyState>
      </div>
    )
  }

  return (
    <>
      <p style={{ margin: '24px 0 0' }}>
        <Link className="mn" to="/projects" style={{ fontSize: 12, letterSpacing: 1 }}>
          ← All projects
        </Link>
      </p>

      <div className="pagehead">
        <div>
          <h2 className="pagetitle">{project.name}</h2>
          {project.description && (
            <p className="pagesub" style={{ maxWidth: '62ch' }}>
              {project.description}
            </p>
          )}
          <span className="pill" style={{ marginTop: 12 }}>
            <span className="acc">{creatures.length}</span>
            {creatures.length === 1 ? 'creature' : 'creatures'}
          </span>
        </div>
        <div className="pagehead-actions">
          <button className="btn btn-gold" onClick={() => setAdding(true)}>
            ＋ Add creatures
          </button>
          <button className="btn" onClick={() => setEditing(true)}>
            Edit
          </button>
          <button className="btn btn-danger" onClick={() => setDeletingProject(true)}>
            Delete
          </button>
        </div>
      </div>
      <hr className="rule" />

      {creatures.length === 0 ? (
        <EmptyState
          title="No creatures bound yet"
          action={
            <div className="detail-actions" style={{ justifyContent: 'center' }}>
              <button className="btn btn-gold" onClick={() => setAdding(true)}>
                ＋ Add from library
              </button>
              <Link className="btn" to="/convert">
                ⟶ Convert a new one
              </Link>
            </div>
          }
        >
          Bind creatures from your library, or convert a fresh horror and save it here.
        </EmptyState>
      ) : (
        <div className="grid">
          {creatures.map((c) => (
            <CreatureCard key={c.id} entry={c} onView={setViewing}>
              <Link
                className="btn btn-sm"
                to={`/convert?creature=${encodeURIComponent(c.id)}`}
                style={{ flex: 1 }}
              >
                ↻ Convert
              </Link>
              <button
                className="btn btn-sm btn-danger"
                onClick={() => setRemoving(c)}
                style={{ flex: 1 }}
              >
                Remove
              </button>
            </CreatureCard>
          ))}
        </div>
      )}

      {adding && (
        <AddCreaturesModal projectId={id} onAdd={addCreature} onClose={() => setAdding(false)} />
      )}
      {editing && (
        <ProjectFormModal initial={project} onSubmit={saveEdit} onClose={() => setEditing(false)} />
      )}
      {viewing && (
        <CreatureDetailModal
          entry={viewing}
          onClose={() => setViewing(null)}
          footer={
            <Link
              className="btn btn-gold"
              to={`/convert?creature=${encodeURIComponent(viewing.id)}`}
              onClick={() => setViewing(null)}
            >
              ↻ Convert again
            </Link>
          }
        />
      )}
      {removing && (
        <ConfirmDialog
          title="Remove from project?"
          message={`“${creatureName(removing)}” will return to your library. It is not deleted.`}
          confirmLabel="Remove"
          danger
          onConfirm={removeCreature}
          onCancel={() => setRemoving(null)}
        />
      )}
      {deletingProject && (
        <ConfirmDialog
          title="Dissolve this project?"
          message={`“${project.name}” will be removed. Its ${creatures.length} creature(s) return to your library.`}
          confirmLabel="Delete project"
          danger
          onConfirm={deleteProject}
          onCancel={() => setDeletingProject(false)}
        />
      )}
    </>
  )
}
