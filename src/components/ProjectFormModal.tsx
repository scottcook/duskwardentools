import { useState } from 'react'
import { Modal } from './Modal'
import type { NewProject, Project } from '../lib/types'

/** Create or edit a project. */
export function ProjectFormModal({
  initial,
  onSubmit,
  onClose,
}: {
  initial?: Project
  onSubmit: (input: NewProject) => Promise<void>
  onClose: () => void
}) {
  const [name, setName] = useState(initial?.name ?? '')
  const [description, setDescription] = useState(initial?.description ?? '')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const editing = !!initial

  async function save() {
    if (!name.trim()) {
      setErr('A campaign needs a name.')
      return
    }
    setBusy(true)
    setErr('')
    try {
      await onSubmit({ name, description })
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Something went wrong.')
      setBusy(false)
    }
  }

  return (
    <Modal
      title={editing ? 'Rename the campaign' : 'Forge a new project'}
      onClose={busy ? () => {} : onClose}
      footer={
        <>
          <button className="btn" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button className="btn btn-gold" onClick={save} disabled={busy}>
            {busy ? '…' : editing ? 'Save' : 'Create project'}
          </button>
        </>
      }
    >
      <form
        onSubmit={(e) => {
          e.preventDefault()
          save()
        }}
        className="stack"
      >
        <div className="fld">
          <label className="flbl" htmlFor="pf-name">
            Name
          </label>
          <input
            id="pf-name"
            className="in"
            value={name}
            maxLength={120}
            placeholder="The Barrowmoor Vault"
            onChange={(e) => setName(e.target.value)}
            autoFocus
          />
        </div>
        <div className="fld">
          <label className="flbl" htmlFor="pf-desc">
            Description <span className="dim">— optional</span>
          </label>
          <textarea
            id="pf-desc"
            className="ta"
            style={{ minHeight: 110 }}
            value={description}
            maxLength={2000}
            placeholder="A drowned necropolis beneath the fens…"
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
        {err && (
          <p className="hint" style={{ color: 'var(--danger)' }} role="alert">
            {err}
          </p>
        )}
        <button type="submit" style={{ display: 'none' }} aria-hidden="true" />
      </form>
    </Modal>
  )
}
