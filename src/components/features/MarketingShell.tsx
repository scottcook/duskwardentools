import Link from 'next/link';
import type { ReactNode } from 'react';
import { NewsletterSignupLink } from './NewsletterSignupLink';

export function MarketingShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-bg-base">
      <header className="border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between gap-4">
          <Link
            href="/"
            className="text-4xl text-text-primary hover:text-accent transition-colors shrink-0"
            style={{ fontFamily: 'var(--font-unifraktur)' }}
          >
            Duskwarden
          </Link>
          <nav className="flex items-center gap-3 sm:gap-5 text-sm text-text-muted flex-wrap justify-end">
            <Link href="/5e-to-osr-monster-converter" className="hover:text-text-primary transition-colors">
              5e to OSR
            </Link>
            <Link href="/shadowdark-compatible-monster-stat-cards" className="hover:text-text-primary transition-colors">
              Shadowdark-compatible
            </Link>
            <Link href="/faq" className="hover:text-text-primary transition-colors">
              FAQ
            </Link>
            <Link
              href="/app"
              className="px-4 py-2 bg-accent text-bg-base font-medium rounded-lg hover:bg-accent-hover transition-colors"
            >
              Open App
            </Link>
          </nav>
        </div>
      </header>

      <div className="flex-1">{children}</div>

      <footer className="border-t border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <p className="text-center text-xs text-text-muted">
            Duskwarden Tools is an independent product and is not affiliated with The Arcane Library, LLC.
          </p>
          <p className="mt-1 text-center text-xs text-text-muted">
            Conversion output uses compatibility heuristics and should be reviewed before publication or play.
          </p>
          <p className="mt-2 text-center text-xs text-text-muted flex items-center justify-center gap-3 flex-wrap">
            <NewsletterSignupLink />
            <span className="text-border">·</span>
            <a
              href="mailto:duskwardentools@gmail.com?subject=Duskwarden%20Feedback"
              className="text-accent hover:text-accent-hover transition-colors underline underline-offset-2"
            >
              Feedback
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
}
