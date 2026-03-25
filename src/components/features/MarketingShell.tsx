import Link from 'next/link';
import type { ReactNode } from 'react';
import { FeedbackLink } from './FeedbackLink';
import { NewsletterSignupLink } from './NewsletterSignupLink';
import { TrackedLink } from './TrackedLink';

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
            <TrackedLink
              href="/5e-to-osr-monster-converter"
              className="hover:text-text-primary transition-colors"
              eventName="marketing_nav_click"
              eventProperties={{ location: 'marketing_header', destination: '5e_to_osr' }}
            >
              5e to OSR
            </TrackedLink>
            <TrackedLink
              href="/shadowdark-compatible-monster-stat-cards"
              className="hover:text-text-primary transition-colors"
              eventName="marketing_nav_click"
              eventProperties={{ location: 'marketing_header', destination: 'shadowdark' }}
            >
              Shadowdark-compatible
            </TrackedLink>
            <TrackedLink
              href="/faq"
              className="hover:text-text-primary transition-colors"
              eventName="marketing_nav_click"
              eventProperties={{ location: 'marketing_header', destination: 'faq' }}
            >
              FAQ
            </TrackedLink>
            <TrackedLink
              href="/app/convert"
              className="px-4 py-2 bg-accent text-bg-base font-medium rounded-lg hover:bg-accent-hover transition-colors"
              eventName="marketing_cta_click"
              eventProperties={{ location: 'marketing_header', destination: 'convert' }}
            >
              Start Converting
            </TrackedLink>
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
            <NewsletterSignupLink location="marketing_footer" />
            <span className="text-border">·</span>
            <FeedbackLink location="marketing_footer" />
          </p>
        </div>
      </footer>
    </div>
  );
}
