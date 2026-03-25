const FORMSPREE_ID = process.env.NEXT_PUBLIC_FORMSPREE_NEWSLETTER_ID;
const CONTACT_EMAIL = 'duskwardentools@gmail.com';

type ContactFormKind = 'newsletter' | 'feedback';

interface SubmitContactFormOptions {
  email: string;
  subject: string;
  kind: ContactFormKind;
  message?: string;
}

export async function submitContactForm({
  email,
  subject,
  kind,
  message,
}: SubmitContactFormOptions): Promise<void> {
  const trimmedEmail = email.trim();
  const trimmedMessage = message?.trim();

  if (FORMSPREE_ID) {
    const payload: Record<string, string> = {
      email: trimmedEmail,
      source: kind,
      _subject: subject,
    };

    if (trimmedMessage) {
      payload.message = trimmedMessage;
    }

    const response = await fetch(`https://formspree.io/f/${FORMSPREE_ID}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error('Submission failed');
    }

    return;
  }

  const body =
    kind === 'feedback'
      ? `Feedback:\n${trimmedMessage ?? ''}\n\nEmail: ${trimmedEmail}`
      : `Please add me to the newsletter: ${trimmedEmail}`;

  const params = new URLSearchParams({
    subject,
    body,
  });

  window.location.href = `mailto:${CONTACT_EMAIL}?${params.toString()}`;
}
