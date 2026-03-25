'use client';

import { useCallback, useEffect, useState } from 'react';
import { Button, Input, Modal, Textarea } from '@/components/ui';
import { trackEvent } from '@/lib/analytics';
import { submitContactForm } from './contactForm';

export function FeedbackModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [openSource, setOpenSource] = useState('unknown');
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const handleShow = (event: Event) => {
      const source = (event as CustomEvent<{ source?: string }>).detail?.source ?? 'unknown';
      setOpenSource(source);
      setIsOpen(true);
      setMessage('');
      setEmail('');
      setStatus('idle');
      setErrorMessage('');
    };

    window.addEventListener('duskwarden-show-feedback', handleShow);
    return () => window.removeEventListener('duskwarden-show-feedback', handleShow);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    trackEvent('feedback_open', { source: openSource });
  }, [isOpen, openSource]);

  const dismiss = useCallback(() => {
    setIsOpen(false);
  }, []);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      if (!message.trim() || !email.trim()) {
        return;
      }

      setStatus('submitting');
      setErrorMessage('');

      try {
        await submitContactForm({
          email,
          message,
          subject: 'Duskwarden Feedback',
          kind: 'feedback',
        });
        trackEvent('feedback_submit', { source: openSource });
        setStatus('success');
      } catch {
        setStatus('error');
        setErrorMessage('Something went wrong. Please try again.');
      }
    },
    [email, message, openSource]
  );

  return (
    <Modal isOpen={isOpen} onClose={dismiss} title="Share feedback" size="md">
      {status === 'success' ? (
        <div className="rounded-lg border border-success/30 bg-success/5 px-4 py-3 text-sm text-success">
          <p className="font-medium">Thanks for the feedback.</p>
          <p className="mt-0.5 text-success/90">Your note has been sent.</p>
          <button
            type="button"
            onClick={dismiss}
            className="mt-3 text-xs text-success/80 hover:text-success underline"
          >
            Close
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <p className="text-sm text-text-muted">
            Tell me what&apos;s working, what feels off, or what you&apos;d like to see next.
          </p>
          <Textarea
            label="Add a comment or Feedback"
            placeholder="Share your feedback..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            disabled={status === 'submitting'}
            required
            autoFocus
          />
          <Input
            type="email"
            label="Email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={status === 'submitting'}
            required
          />
          {status === 'error' && <p className="text-sm text-error">{errorMessage}</p>}
          <div className="flex gap-3">
            <Button
              type="submit"
              className="flex-1"
              loading={status === 'submitting'}
              disabled={status === 'submitting'}
            >
              Send feedback
            </Button>
            <button
              type="button"
              onClick={dismiss}
              className="px-4 py-2 text-sm text-text-muted hover:text-text-primary transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}
