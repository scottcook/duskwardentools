import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { Modal } from './Modal'
import { submitContactForm } from '../lib/contact'

const SESSION_KEY = 'duskwarden-newsletter-seen'
const AUTO_OPEN_DELAY_MS = 3000

type Status = 'idle' | 'submitting' | 'success' | 'error'

export function NewsletterModal() {
  const [isOpen, setIsOpen] = useState(false)
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<Status>('idle')

  const dismiss = useCallback(() => {
    setIsOpen(false)
    sessionStorage.setItem(SESSION_KEY, 'dismissed')
  }, [])

  useEffect(() => {
    const seen = sessionStorage.getItem(SESSION_KEY)
    if (seen) return

    const timeout = window.setTimeout(() => setIsOpen(true), AUTO_OPEN_DELAY_MS)
    return () => window.clearTimeout(timeout)
  }, [])

  useEffect(() => {
    const handleShow = () => {
      setIsOpen(true)
      setEmail('')
      setStatus('idle')
    }

    window.addEventListener('duskwarden-show-newsletter', handleShow)
    return () => window.removeEventListener('duskwarden-show-newsletter', handleShow)
  }, [])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!email.trim() || status === 'submitting') return

    setStatus('submitting')
    try {
      await submitContactForm({
        email,
        subject: 'Duskwarden Newsletter Signup',
        kind: 'newsletter',
      })
      setStatus('success')
      sessionStorage.setItem(SESSION_KEY, 'submitted')
    } catch {
      setStatus('error')
    }
  }

  if (!isOpen) return null

  if (status === 'success') {
    return (
      <Modal title="Stay in the loop" onClose={dismiss}>
        <div className="feedback-thanks">
          <div className="empty-mark" aria-hidden="true">
            ✦
          </div>
          <p className="feedback-thanks-title blk">You&apos;re on the list.</p>
          <p className="pagesub" style={{ margin: 0 }}>
            We&apos;ll send the occasional note — new features, tips, and conversion profiles. No spam.
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
      title="Stay in the loop"
      onClose={dismiss}
      footer={
        <>
          <button className="btn" onClick={dismiss} disabled={status === 'submitting'}>
            Maybe later
          </button>
          <button
            className="btn btn-gold"
            type="submit"
            form="newsletter-form"
            disabled={status === 'submitting' || !email.trim()}
          >
            {status === 'submitting' ? 'Subscribing…' : 'Subscribe'}
          </button>
        </>
      }
    >
      <form id="newsletter-form" onSubmit={handleSubmit} className="stack">
        <p className="pagesub" style={{ margin: 0 }}>
          Get updates on new features, tips, and conversion profiles. No spam — just the occasional note.
        </p>
        <div className="fld">
          <label className="flbl" htmlFor="newsletter-email">
            Email
          </label>
          <input
            id="newsletter-email"
            className="in"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={status === 'submitting'}
            required
            autoFocus
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
