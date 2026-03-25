'use client';

import { useState, useEffect, useCallback } from 'react';
import { Input, Button } from '@/components/ui';
import { useBodyScrollLock } from '@/components/ui/useBodyScrollLock';
import { trackEvent } from '@/lib/analytics';
import { submitContactForm } from './contactForm';

const SESSION_KEY = 'duskwarden-newsletter-seen';
const AUTO_OPEN_DELAY_MS = 3000;

export function NewsletterModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [openSource, setOpenSource] = useState('auto');
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  useBodyScrollLock(isOpen);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const seen = sessionStorage.getItem(SESSION_KEY);
    if (!seen) {
      const timeout = window.setTimeout(() => {
        setOpenSource('auto');
        setIsOpen(true);
      }, AUTO_OPEN_DELAY_MS);
      return () => window.clearTimeout(timeout);
    }
  }, []);

  useEffect(() => {
    const handleShow = (event: Event) => {
      const source = (event as CustomEvent<{ source?: string }>).detail?.source ?? 'manual';
      setOpenSource(source);
      setIsOpen(true);
      setEmail('');
      setStatus('idle');
      setErrorMessage('');
    };
    window.addEventListener('duskwarden-show-newsletter', handleShow);
    return () => window.removeEventListener('duskwarden-show-newsletter', handleShow);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    trackEvent('newsletter_open', { source: openSource });
  }, [isOpen, openSource]);

  const dismiss = useCallback(() => {
    setIsOpen(false);
    sessionStorage.setItem(SESSION_KEY, 'dismissed');
  }, []);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!email.trim()) return;

      setStatus('submitting');
      setErrorMessage('');

      try {
        await submitContactForm({
          email,
          subject: 'Duskwarden Newsletter Signup',
          kind: 'newsletter',
        });
        trackEvent('newsletter_submit', { source: openSource });
        setStatus('success');
        sessionStorage.setItem(SESSION_KEY, 'submitted');
      } catch {
        setStatus('error');
        setErrorMessage('Something went wrong. Please try again.');
      }
    },
    [email, openSource]
  );

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') dismiss();
    };
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
    }
    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, dismiss]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="newsletter-modal-title"
      aria-describedby="newsletter-modal-desc"
      onClick={(e) => e.target === e.currentTarget && dismiss()}
    >
      <div
        className="w-full max-w-md bg-bg-surface border border-border rounded-xl shadow-2xl shadow-black/40 animate-in zoom-in-95 fade-in duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative px-6 pt-6 pb-6">
          <button
            type="button"
            onClick={dismiss}
            className="absolute top-4 right-4 p-2 -m-2 text-text-muted hover:text-text-primary rounded-lg hover:bg-bg-elevated transition-colors focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-bg-surface"
            aria-label="Close"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          <div className="pr-8">
            <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <h2 id="newsletter-modal-title" className="text-xl font-semibold text-text-primary mb-1">
              Stay in the loop
            </h2>
            <p id="newsletter-modal-desc" className="text-sm text-text-muted mb-6">
              Get updates on new features, tips, and conversion profiles. No spam — just the occasional note.
            </p>
          </div>

          {status === 'success' ? (
            <div className="rounded-lg border border-success/30 bg-success/5 px-4 py-3 text-sm text-success">
              <p className="font-medium">Thanks for signing up!</p>
              <p className="mt-0.5 text-success/90">We&apos;ll be in touch.</p>
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
              <Input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={status === 'submitting'}
                required
                autoFocus
                aria-label="Email address"
                className="text-base"
              />
              {status === 'error' && (
                <p className="text-sm text-error">{errorMessage}</p>
              )}
              <div className="flex gap-3">
                <Button
                  type="submit"
                  className="flex-1"
                  loading={status === 'submitting'}
                  disabled={status === 'submitting'}
                >
                  Subscribe
                </Button>
                <button
                  type="button"
                  onClick={dismiss}
                  className="px-4 py-2 text-sm text-text-muted hover:text-text-primary transition-colors"
                >
                  Maybe later
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
