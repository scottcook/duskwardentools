'use client';

import { trackEvent } from '@/lib/analytics';

interface NewsletterSignupLinkProps {
  location?: string;
  className?: string;
}

export function NewsletterSignupLink({
  location = 'unknown',
  className = 'text-accent hover:text-accent-hover transition-colors underline underline-offset-2 text-xs',
}: NewsletterSignupLinkProps) {
  return (
    <button
      type="button"
      onClick={() => {
        trackEvent('newsletter_open_click', { location });
        window.dispatchEvent(new CustomEvent('duskwarden-show-newsletter', { detail: { source: location } }));
      }}
      className={className}
    >
      Newsletter Sign up
    </button>
  );
}
