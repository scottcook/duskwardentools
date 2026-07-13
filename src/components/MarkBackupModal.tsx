import { Modal } from './Modal'
import { getDeviceId } from '../lib/device'
import { ackMarkBackup, showIdentityModal } from '../lib/libraryPrefs'
import { useToast } from './ToastProvider'

/**
 * Shown after the first successful save to the library (production only).
 * Nudges the warden to copy their device mark before they need it.
 */
export function MarkBackupModal({ onClose }: { onClose: () => void }) {
  const { notify } = useToast()
  const mark = getDeviceId()

  function finish() {
    ackMarkBackup()
    onClose()
  }

  function copy() {
    navigator.clipboard?.writeText(mark).then(
      () => {
        notify('Warden\'s mark copied — keep it somewhere safe')
        finish()
      },
      () => notify('Could not copy', 'err'),
    )
  }

  function openFullIdentity() {
    finish()
    showIdentityModal()
  }

  return (
    <Modal
      title="Save your warden's mark"
      onClose={finish}
      footer={
        <>
          <button type="button" className="btn" onClick={finish}>
            I've saved it
          </button>
          <button type="button" className="btn btn-gold" onClick={copy}>
            Copy mark
          </button>
        </>
      }
    >
      <p style={{ margin: 0, lineHeight: 1.55, fontSize: 14.5 }}>
        Your library is saved remotely, but it is keyed to <b>this browser's mark</b> — there is no
        account to sign into. If you clear site data or switch browsers, the library will look empty
        until you restore this mark.
      </p>
      <div className="fld" style={{ marginTop: 14 }}>
        <label className="flbl" htmlFor="mark-backup-id">
          Your mark
        </label>
        <input
          id="mark-backup-id"
          className="in mn"
          style={{ fontSize: 12.5 }}
          value={mark}
          readOnly
          spellCheck={false}
          onFocus={(e) => e.currentTarget.select()}
        />
      </div>
      <p className="hint" style={{ marginTop: 12 }}>
        Copy it now and keep it with your notes. You can also restore a mark later from{' '}
        <button type="button" className="link-btn" onClick={openFullIdentity}>
          your warden's mark
        </button>
        .
      </p>
    </Modal>
  )
}
