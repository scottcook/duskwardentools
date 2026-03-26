import type { Metadata } from 'next';
import { JsonLd } from '@/components/features/JsonLd';
import { MarketingShell } from '@/components/features/MarketingShell';
import { TrackedLink } from '@/components/features/TrackedLink';
import { buildMetadata, siteConfig } from '@/lib/seo';

export const metadata: Metadata = buildMetadata({
  title: '5e, OSE, and B/X Monster Converter for OSR and Shadowdark-Compatible Stat Cards',
  description:
    'Convert 5e, OSE, B/X, and generic monster stat blocks into streamlined OSR and Shadowdark-compatible stat cards. Tune difficulty, print cards, and export JSON.',
  path: '/',
  keywords: [
    'monster stat block converter',
    '5e to osr monster converter',
    'ose monster converter',
    'b/x monster converter',
    'shadowdark compatible monster stat cards',
    'printable monster stat cards',
    'monster stat card generator',
  ],
});

const softwareSchema = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: siteConfig.name,
  applicationCategory: 'UtilitiesApplication',
  operatingSystem: 'Web',
  url: siteConfig.url,
  description: siteConfig.defaultDescription,
  offers: {
    '@type': 'Offer',
    price: '0',
    priceCurrency: 'USD',
  },
  featureList: [
    'Convert 5e, OSE, B/X, and generic monster stat blocks',
    'Generate OSR and Shadowdark-compatible stat cards',
    'Tune deadliness and durability',
    'Save creatures to a library and projects',
    'Export printable cards, text, and JSON',
  ],
};

const websiteSchema = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: siteConfig.name,
  url: siteConfig.url,
  description: siteConfig.defaultDescription,
};

const organizationSchema = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: siteConfig.name,
  url: siteConfig.url,
  email: siteConfig.email,
};

const workflowCards = [
  {
    title: '5e to OSR',
    description: 'Turn fuller 5e monster blocks into faster, lighter cards built for old-school pacing.',
    href: '/5e-to-osr-monster-converter',
    eventDestination: '5e_to_osr',
  },
  {
    title: 'Shadowdark-compatible',
    description: 'Generate compatibility-focused cards for Shadowdark-ready prep without rebuilding everything by hand.',
    href: '/shadowdark-compatible-monster-stat-cards',
    eventDestination: 'shadowdark',
  },
  {
    title: 'OSE and B/X',
    description: 'Standardize old-school monsters into compact printable cards and exportable JSON.',
    href: '/ose-bx-monster-converter',
    eventDestination: 'ose_bx',
  },
];

export default function LandingPage() {
  return (
    <MarketingShell>
      <JsonLd data={softwareSchema} />
      <JsonLd data={websiteSchema} />
      <JsonLd data={organizationSchema} />
      <main className="px-4 py-12 sm:py-16">
        <div className="max-w-7xl mx-auto space-y-12 sm:space-y-16">
          <section className="grid gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(360px,0.9fr)] lg:items-center">
            <div className="max-w-3xl">
              <p className="text-sm uppercase tracking-[0.24em] text-accent/80">
                Monster stat block converter for tabletop RPG GMs
              </p>
              <h1 className="mt-5 text-4xl sm:text-5xl lg:text-6xl font-bold text-text-primary text-balance leading-tight">
                Convert source stat blocks into table-ready OSR and Shadowdark-compatible cards
              </h1>
              <p className="mt-6 text-lg text-text-muted max-w-2xl text-balance">
                Paste a 5e, OSE, or B/X monster, tune the result for your table, and export a cleaner stat card without rebuilding the creature from scratch.
              </p>
              <div className="mt-8 flex flex-col sm:flex-row items-start gap-4">
                <TrackedLink
                  href="/app/convert"
                  className="inline-flex w-full sm:w-auto items-center justify-center px-6 py-3 bg-accent text-bg-base font-semibold rounded-xl hover:bg-accent-hover transition-colors focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-bg-base"
                  eventName="marketing_cta_click"
                  eventProperties={{ location: 'home_hero', destination: 'convert', style: 'primary' }}
                >
                  Start Converting
                </TrackedLink>
                <TrackedLink
                  href="/faq"
                  className="inline-flex items-center justify-center px-6 py-3 text-sm font-medium text-text-muted hover:text-text-primary transition-colors"
                  eventName="marketing_cta_click"
                  eventProperties={{ location: 'home_hero', destination: 'faq', style: 'text' }}
                >
                  Read the FAQ
                </TrackedLink>
              </div>
              <div className="mt-8 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-text-muted">
                <span>Supports 5e, OSE, and B/X</span>
                <span className="text-border">•</span>
                <span>OSR and Shadowdark-compatible outputs</span>
                <span className="text-border">•</span>
                <span>Print, text, and JSON export</span>
              </div>
            </div>

            <div className="relative">
              <div className="absolute -inset-3 rounded-4xl bg-accent/8 blur-2xl" aria-hidden="true" />
              <div className="relative overflow-hidden rounded-[1.75rem] border border-border bg-bg-surface/95 shadow-2xl shadow-black/30">
                <div className="border-b border-border px-5 py-4">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-xs uppercase tracking-[0.22em] text-accent/70">Product Preview</p>
                      <p className="mt-1 text-sm font-medium text-text-primary">A calmer way to prep monster cards</p>
                    </div>
                    <span className="rounded-full border border-border bg-bg-base px-3 py-1 text-xs text-text-muted">
                      Converter flow
                    </span>
                  </div>
                </div>

                <div className="grid gap-4 p-5">
                  <div className="rounded-2xl border border-border bg-bg-base/80 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-text-primary">Step 1</p>
                        <p className="mt-1 text-sm text-text-muted">Paste a source stat block and choose the output profile.</p>
                      </div>
                      <span className="rounded-full bg-accent/10 px-3 py-1 text-xs font-medium text-accent">
                        Parse
                      </span>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-border bg-bg-base/80 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-text-primary">Step 2</p>
                        <p className="mt-1 text-sm text-text-muted">Tune threat, durability, and compatibility output for your table.</p>
                      </div>
                      <span className="rounded-full bg-accent/10 px-3 py-1 text-xs font-medium text-accent">
                        Adjust
                      </span>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-accent/20 bg-accent/5 p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-lg font-semibold text-text-primary">Goblin Cutpurse</p>
                        <p className="mt-1 text-sm text-text-muted">Compact card preview</p>
                      </div>
                      <span className="rounded-full border border-accent/20 bg-bg-base px-3 py-1 text-xs text-accent">
                        Tier 1
                      </span>
                    </div>
                    <div className="mt-4 grid grid-cols-3 gap-3 text-sm">
                      <div className="rounded-xl border border-border bg-bg-base px-3 py-2">
                        <p className="text-xs uppercase tracking-[0.18em] text-text-muted">AC</p>
                        <p className="mt-1 font-semibold text-text-primary">13</p>
                      </div>
                      <div className="rounded-xl border border-border bg-bg-base px-3 py-2">
                        <p className="text-xs uppercase tracking-[0.18em] text-text-muted">HP</p>
                        <p className="mt-1 font-semibold text-text-primary">7</p>
                      </div>
                      <div className="rounded-xl border border-border bg-bg-base px-3 py-2">
                        <p className="text-xs uppercase tracking-[0.18em] text-text-muted">Move</p>
                        <p className="mt-1 font-semibold text-text-primary">30&apos;</p>
                      </div>
                    </div>
                    <div className="mt-4 space-y-2 text-sm text-text-muted">
                      <p><span className="font-medium text-text-primary">Attack:</span> Scimitar +3 (1d6)</p>
                      <p><span className="font-medium text-text-primary">Trait:</span> Gains advantage when striking from surprise.</p>
                      <p><span className="font-medium text-text-primary">Export:</span> Save to library, print card, or download JSON.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-border bg-bg-surface p-6">
              <p className="text-sm font-semibold text-text-primary">Fewer steps</p>
              <p className="mt-2 text-sm text-text-muted">
                Paste, convert, and export in one flow without stitching together multiple prep tools.
              </p>
            </div>
            <div className="rounded-2xl border border-border bg-bg-surface p-6">
              <p className="text-sm font-semibold text-text-primary">Sharper table output</p>
              <p className="mt-2 text-sm text-text-muted">
                Generate leaner cards built for reading quickly at the table instead of scanning dense source text.
              </p>
            </div>
            <div className="rounded-2xl border border-border bg-bg-surface p-6">
              <p className="text-sm font-semibold text-text-primary">Export-ready</p>
              <p className="mt-2 text-sm text-text-muted">
                Save creatures, print cards, or move the results into your own workflow as structured JSON.
              </p>
            </div>
          </section>

          <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
            <div>
              <p className="text-sm uppercase tracking-[0.22em] text-accent/80">Choose your workflow</p>
              <h2 className="mt-3 text-3xl font-bold text-text-primary">Use the page that matches what you are trying to do</h2>
              <p className="mt-3 max-w-2xl text-text-muted">
                The homepage is here to get you into the tool quickly. The dedicated workflow pages go deeper on use cases, compatibility language, and search-oriented explanations.
              </p>
              <div className="mt-8 grid gap-4 lg:grid-cols-3">
                {workflowCards.map((card) => (
                  <TrackedLink
                    key={card.href}
                    href={card.href}
                    className="group rounded-2xl border border-border bg-bg-surface p-6 transition-colors hover:border-accent/40"
                    eventName="marketing_cta_click"
                    eventProperties={{ location: 'home_workflows', destination: card.eventDestination, style: 'card' }}
                  >
                    <p className="text-lg font-semibold text-text-primary">{card.title}</p>
                    <p className="mt-3 text-sm text-text-muted">{card.description}</p>
                    <p className="mt-5 text-sm font-medium text-accent">Explore this workflow</p>
                  </TrackedLink>
                ))}
              </div>
            </div>

            <div className="rounded-[1.75rem] border border-border bg-bg-surface p-6">
              <p className="text-sm uppercase tracking-[0.22em] text-accent/80">Start Here</p>
              <h2 className="mt-3 text-2xl font-bold text-text-primary">Open the converter when you already know the job to be done</h2>
              <p className="mt-3 text-sm text-text-muted">
                Best for returning users, quick prep sessions, or anyone arriving with a stat block already in hand.
              </p>
              <TrackedLink
                href="/app/convert"
                className="mt-6 inline-flex items-center justify-center w-full px-5 py-3 bg-accent text-bg-base font-semibold rounded-xl hover:bg-accent-hover transition-colors focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-bg-surface"
                eventName="marketing_cta_click"
                eventProperties={{ location: 'home_sidebar', destination: 'convert', style: 'primary' }}
              >
                Go straight to Convert
              </TrackedLink>
              <TrackedLink
                href="/faq"
                className="mt-3 inline-flex items-center justify-center w-full px-5 py-3 border border-border text-text-primary font-medium rounded-xl hover:bg-bg-base transition-colors focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-bg-surface"
                eventName="marketing_cta_click"
                eventProperties={{ location: 'home_sidebar', destination: 'faq', style: 'secondary' }}
              >
                Read common questions first
              </TrackedLink>
            </div>
          </section>
        </div>
      </main>
    </MarketingShell>
  );
}
