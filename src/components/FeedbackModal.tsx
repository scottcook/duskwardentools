import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { Modal } from './Modal'
import { submitContactForm } from '../lib/contact'

type Status = 'idle' | 'submitting' | 'success' | 'error'

export function FeedbackModal() {
  const [isOpen, setIsOpen] = useState(false)
  const [message, setMessage] = useState('')
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<Status>('idle')

  const dismiss = useCallback(() => {
    setIsOpen(false)
  }, [])

  useEffect(() => {
    const handleShow = () => {
      setIsOpen(true)
      setMessage('')
      setEmail('')
      setStatus('idle')
    }

    window.addEventListener('duskwarden-show-feedback', handleShow)
    return () => window.removeEventListener('duskwarden-show-feedback', handleShow)
  }, [])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!message.trim() || !email.trim() || status === 'submitting') return
    setStatus('submitting')
    try {
      await submitContactForm({
        email,
        message,
        subject: 'Duskwarden Feedback',
        kind: 'feedback',
      })
      setStatus('success')
    } catch {
      setStatus('error')
    }
  }

  if (!isOpen) return null

  if (status === 'success') {
    return (
      <Modal title="Send word" onClose={dismiss}>
        <div className="feedback-thanks">
          <div className="empty-mark" aria-hidden="true">
            ✦
          </div>
          <p className="feedback-thanks-title blk">The raven has flown.</p>
          <p className="pagesub" style={{ margin: 0 }}>
            Your words have been carried off. Thank you — every scrap of feedback shapes the
            next incantation.
          </p>
          <button className="btn btn-gold" style={{ marginTop: 18 }} onClick={dismiss}>
            Close
          </button>
        </div>
      </Modal>
    )
  }

  return (
    <Modal
      title="Send word"
      onClose={dismiss}
      footer={
        <>
          <button className="btn" onClick={dismiss} disabled={status === 'submitting'}>
            Cancel
          </button>
          <button
            className="btn btn-gold"
            type="submit"
            form="feedback-form"
            disabled={status === 'submitting' || !message.trim() || !email.trim()}
          >
            {status === 'submitting' ? 'Sending…' : 'Send feedback'}
          </button>
        </>
      }
    >
      <form id="feedback-form" onSubmit={handleSubmit} className="stack">
        <p className="pagesub" style={{ margin: 0 }}>
          Tell us what's working, what feels cursed, or what you'd summon next.
        </p>
        <div className="fld">
          <label className="flbl" htmlFor="feedback-message">
            Your message
          </label>
          <textarea
            id="feedback-message"
            className="ta"
            style={{ minHeight: 140 }}
            placeholder="Speak, warden…"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            disabled={status === 'submitting'}
            required
          />
        </div>
        <div className="fld">
          <label className="flbl" htmlFor="feedback-email">
            Email
          </label>
          <input
            id="feedback-email"
            className="in"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={status === 'submitting'}
            required
          />
        </div>
        {status === 'error' && (
          <p className="feedback-error" role="alert">
            The raven was lost in the dark. Try again.
          </p>
        )}
      </form>
    </Modal>
  )
}
