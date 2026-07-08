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
      () => notify('Device id copied'),
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
            Use this id &amp; reload
          </button>
        </>
      }
    >
      <p style={{ margin: 0, lineHeight: 1.5, fontSize: 14.5 }}>
        Duskwarden ties your projects and library to this browser's <b>device id</b> — there is no
        account to sign into. Copy it to carry your data to another browser, or paste a saved id to
        reclaim an existing library.
      </p>
      <div className="fld">
        <label className="flbl" htmlFor="dev-id">
          Device id
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
          Copy current id
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
