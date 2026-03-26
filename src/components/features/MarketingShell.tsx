'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, type ReactNode } from 'react';
import { FeedbackLink } from './FeedbackLink';
import { NewsletterSignupLink } from './NewsletterSignupLink';
import { ThemeToggle } from './ThemeToggle';
import { TrackedLink } from './TrackedLink';

const marketingNavItems = [
  {
    href: '/5e-to-osr-monster-converter',
    label: '5e to OSR',
    eventName: 'marketing_nav_click',
    eventProperties: { location: 'marketing_header', destination: '5e_to_osr' },
  },
  {
    href: '/shadowdark-compatible-monster-stat-cards',
    label: 'Shadowdark-compatible',
    eventName: 'marketing_nav_click',
    eventProperties: { location: 'marketing_header', destination: 'shadowdark' },
  },
  {
    href: '/faq',
    label: 'FAQ',
    eventName: 'marketing_nav_click',
    eventProperties: { location: 'marketing_header', destination: 'faq' },
  },
] as const;

export function MarketingShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isActive = (href: string) => pathname === href;

  return (
    <div className="min-h-screen flex flex-col bg-bg-base">
      <header className="sticky top-0 z-40 border-b border-border bg-bg-base/95 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between gap-4 py-4">
            <Link
              href="/"
              className="text-4xl text-text-primary hover:text-accent transition-colors shrink-0"
              style={{ fontFamily: 'var(--font-unifraktur)' }}
            >
              Duskwarden
            </Link>
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <nav className="hidden md:flex items-center gap-3 lg:gap-5 text-sm text-text-muted" aria-label="Marketing navigation">
                {marketingNavItems.map((item) => (
                  <TrackedLink
                    key={item.href}
                    href={item.href}
                    className={`rounded-lg px-2.5 py-2 transition-colors focus:outline-none focus:ring-2 focus:ring-accent ${
                      isActive(item.href)
                        ? 'border border-(--pill-active-border) bg-(--pill-active-bg) text-(--pill-active-text)'
                        : 'hover:text-text-primary'
                    }`}
                    eventName={item.eventName}
                    eventProperties={item.eventProperties}
                    aria-current={isActive(item.href) ? 'page' : undefined}
                  >
                    {item.label}
                  </TrackedLink>
                ))}
                <TrackedLink
                  href="/app/convert"
                  className="whitespace-nowrap px-4 py-2 bg-accent text-bg-base font-medium rounded-lg hover:bg-accent-hover transition-colors focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-bg-base"
                  eventName="marketing_cta_click"
                  eventProperties={{ location: 'marketing_header', destination: 'convert' }}
                >
                  Start Converting
                </TrackedLink>
              </nav>

              <button
                type="button"
                onClick={() => setMobileMenuOpen((open) => !open)}
                className="md:hidden p-2.5 text-text-muted hover:text-text-primary rounded-lg hover:bg-bg-elevated transition-colors focus:outline-none focus:ring-2 focus:ring-accent min-w-[44px] min-h-[44px] flex items-center justify-center"
                aria-label="Toggle marketing menu"
                aria-expanded={mobileMenuOpen}
                aria-controls="marketing-mobile-menu"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  {mobileMenuOpen ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  )}
                </svg>
              </button>
            </div>
          </div>
        </div>

        {mobileMenuOpen && (
          <nav
            id="marketing-mobile-menu"
            className="md:hidden border-t border-border bg-bg-surface"
            aria-label="Marketing mobile navigation"
          >
            <div className="max-w-7xl mx-auto px-4 py-3 space-y-1">
              {marketingNavItems.map((item) => (
                <TrackedLink
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`block rounded-lg px-4 py-3 text-base font-medium transition-colors min-h-[48px] ${
                    isActive(item.href)
                      ? 'border border-(--pill-active-border) bg-(--pill-active-bg) text-(--pill-active-text)'
                      : 'text-text-muted hover:text-text-primary hover:bg-bg-elevated'
                  }`}
                  eventName={item.eventName}
                  eventProperties={item.eventProperties}
                  aria-current={isActive(item.href) ? 'page' : undefined}
                >
                  {item.label}
                </TrackedLink>
              ))}
              <TrackedLink
                href="/app/convert"
                onClick={() => setMobileMenuOpen(false)}
                className="mt-2 inline-flex min-h-[48px] w-full items-center justify-center whitespace-nowrap rounded-lg bg-accent px-4 py-3 text-base font-semibold text-bg-base transition-colors hover:bg-accent-hover focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-bg-surface"
                eventName="marketing_cta_click"
                eventProperties={{ location: 'marketing_header_mobile', destination: 'convert' }}
              >
                Start Converting
              </TrackedLink>
            </div>
          </nav>
        )}
      </header>

      <div className="flex-1">{children}</div>

      <footer className="border-t border-border">
        <div className="max-w-7xl mx-auto px-4 py-4">
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
