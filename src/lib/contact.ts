/**
 * Feedback / newsletter plumbing — mirrors 1.0's `contactForm.ts`.
 *
 * Both flows post to the same Formspree form when
 * `VITE_FORMSPREE_NEWSLETTER_ID` is set (destination: duskwardentools@gmail.com).
 * Without it, each flow falls back to a prefilled mailto: draft.
 */

export const CONTACT_EMAIL = 'duskwardentools@gmail.com'
export const DONATE_URL = 'https://buymeacoffee.com/duskwarden'

const FORMSPREE_ID =
  import.meta.env.VITE_FORMSPREE_NEWSLETTER_ID?.trim() ||
  import.meta.env.VITE_FORMSPREE_ID?.trim() ||
  ''

export type ContactFormKind = 'newsletter' | 'feedback'

export interface SubmitContactFormOptions {
  email: string
  subject: string
  kind: ContactFormKind
  message?: string
}

export async function submitContactForm({
  email,
  subject,
  kind,
  message,
}: SubmitContactFormOptions): Promise<void> {
  const trimmedEmail = email.trim()
  const trimmedMessage = message?.trim()

  if (FORMSPREE_ID) {
    const payload: Record<string, string> = {
      email: trimmedEmail,
      source: kind,
      _subject: subject,
    }

    if (trimmedMessage) {
      payload.message = trimmedMessage
    }

    const response = await fetch(`https://formspree.io/f/${FORMSPREE_ID}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      throw new Error('Submission failed')
    }

    return
  }

  const body =
    kind === 'feedback'
      ? `Feedback:\n${trimmedMessage ?? ''}\n\nEmail: ${trimmedEmail}`
      : `Please add me to the newsletter: ${trimmedEmail}`

  const params = new URLSearchParams({
    subject,
    body,
  })

  window.location.href = `mailto:${CONTACT_EMAIL}?${params.toString()}`
}

/** @deprecated Use submitContactForm — kept for any legacy imports. */
export async function submitFeedback({
  email,
  message,
}: {
  email: string
  message: string
}): Promise<void> {
  return submitContactForm({
    email,
    message,
    subject: 'Duskwarden Feedback',
    kind: 'feedback',
  })
}
