'use client';

import { trackEvent } from '@/lib/analytics';

interface FeedbackLinkProps {
  location?: string;
  className?: string;
}

export function FeedbackLink({
  location = 'unknown',
  className = 'text-accent hover:text-accent-hover transition-colors underline underline-offset-2 text-xs',
}: FeedbackLinkProps) {
  return (
    <button
      type="button"
      onClick={() => {
        trackEvent('feedback_open_click', { location });
        window.dispatchEvent(new CustomEvent('duskwarden-show-feedback', { detail: { source: location } }));
      }}
      className={className}
    >
      Feedback
    </button>
  );
}
