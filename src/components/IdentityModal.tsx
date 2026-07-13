import { useState } from 'react'
import { Modal } from './Modal'
import { getDeviceId, setDeviceId } from '../lib/device'
import { IS_DEMO } from '../lib/config'
import { useToast } from './ToastProvider'

/**
 * Duskwarden has no login — your library is tied to a device id. This lets a
 * user copy that id (to reclaim their data on another browser) or paste an
 * existing one in.
 */
export function IdentityModal({ onClose }: { onClose: () => void }) {
  const { notify } = useToast()
  const [value, setValue] = useState(getDeviceId())

  function copy() {
    navigator.clipboard?.writeText(getDeviceId()).then(
      () => notify("Warden's mark copied"),
      () => notify('Could not copy', 'err'),
    )
  }

  function apply() {
    const v = value.trim()
    if (!v) return
    setDeviceId(v)
    notify('Identity updated — reloading…')
    setTimeout(() => window.location.reload(), 500)
  }

  return (
    <Modal
      title="Your warden's mark"
      onClose={onClose}
      footer={
        <>
          <button className="btn" onClick={onClose}>
            Close
          </button>
          <button className="btn btn-gold" onClick={apply}>
            Use this mark &amp; reload
          </button>
        </>
      }
    >
      {IS_DEMO ? (
        <p style={{ margin: 0, lineHeight: 1.55, fontSize: 14.5 }}>
          Demo mode stores projects and creatures <b>only in this browser</b>. Clearing site data
          erases them. There is no remote vault to reclaim.
        </p>
      ) : (
        <p style={{ margin: 0, lineHeight: 1.55, fontSize: 14.5 }}>
          Your projects and library are saved remotely, but they are keyed to this browser's{' '}
          <b>warden's mark</b> — there is no account to sign into. Clearing <b>site data / cookies</b>{' '}
          (not cache alone) generates a new mark and the library will look empty, even though
          creatures may still exist on the server under the old mark. Paste a saved mark below to
          reclaim them, or use <b>Download all</b> / <b>Import</b> on the Library page as a second
          safety net.
        </p>
      )}
      <div className="fld">
        <label className="flbl" htmlFor="dev-id">
          Warden's mark
        </label>
        <input
          id="dev-id"
          className="in mn"
          style={{ fontSize: 12.5 }}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          spellCheck={false}
        />
      </div>
      <div className="detail-actions">
        <button className="btn btn-sm" onClick={copy}>
          Copy current mark
        </button>
        {IS_DEMO && (
          <span className="dim" style={{ fontSize: 12.5, fontStyle: 'italic' }}>
            Demo mode — data lives only in this browser.
          </span>
        )}
      </div>
    </Modal>
  )
}
