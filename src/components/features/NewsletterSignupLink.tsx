'use client';

export function NewsletterSignupLink() {
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new CustomEvent('duskwarden-show-newsletter'))}
      className="text-accent hover:text-accent-hover transition-colors underline underline-offset-2 text-xs"
    >
      Newsletter Sign up
    </button>
  );
}
