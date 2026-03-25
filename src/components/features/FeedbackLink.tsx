'use client';

export function FeedbackLink() {
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new CustomEvent('duskwarden-show-feedback'))}
      className="text-accent hover:text-accent-hover transition-colors underline underline-offset-2 text-xs"
    >
      Feedback
    </button>
  );
}
