import type { Metadata } from 'next';
import Link from 'next/link';
import { JsonLd } from '@/components/features/JsonLd';
import { NewsletterSignupLink } from '@/components/features/NewsletterSignupLink';
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

const faqItems = [
  {
    question: 'Can Duskwarden convert 5e monsters to OSR stat cards?',
    answer:
      'Yes. Duskwarden converts 5e, OSE, B/X, and generic monster stat blocks into streamlined OSR-style stat cards that are easier to run at the table.',
  },
  {
    question: 'Does Duskwarden support OSE and B/X monster stat blocks?',
    answer:
      'Yes. Duskwarden supports OSE and B/X style inputs and can turn them into compact stat cards with printable and JSON export options.',
  },
  {
    question: 'Can I use Duskwarden for Shadowdark RPG?',
    answer:
      'Duskwarden offers Shadowdark-compatible output designed for use with Shadowdark RPG. It is a compatibility tool and does not reproduce official bestiary entries.',
  },
  {
    question: 'Can I print or export converted monsters?',
    answer:
      'Yes. You can copy converted creatures as text, download JSON, print cards, and save them in the library for later editing or organization.',
  },
];

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

const faqSchema = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: faqItems.map((item) => ({
    '@type': 'Question',
    name: item.question,
    acceptedAnswer: {
      '@type': 'Answer',
      text: item.answer,
    },
  })),
};

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col bg-bg-base">
      <JsonLd data={softwareSchema} />
      <JsonLd data={websiteSchema} />
      <JsonLd data={organizationSchema} />
      <JsonLd data={faqSchema} />

      <header className="border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <Link
            href="/"
            className="text-4xl text-text-primary hover:text-accent transition-colors"
            style={{ fontFamily: 'var(--font-unifraktur)' }}
          >
            Duskwarden
          </Link>
          <div className="flex items-center gap-3">
            <Link
              href="/faq"
              className="text-sm text-text-muted hover:text-text-primary transition-colors"
            >
              FAQ
            </Link>
            <Link
              href="/app"
              className="px-4 py-2 bg-accent text-bg-base font-medium rounded-lg hover:bg-accent-hover transition-colors focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-bg-base"
            >
              Open App
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <section className="px-4 pt-16 pb-10">
          <div className="max-w-5xl mx-auto text-center">
            <p className="text-sm uppercase tracking-[0.2em] text-accent/80 mb-4">
              Monster stat block converter for tabletop RPG GMs
            </p>
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-text-primary max-w-5xl mx-auto text-balance leading-tight">
              Convert 5e, OSE, and B/X monster stat blocks into OSR and Shadowdark-compatible stat cards
            </h1>
            <p className="mt-6 text-lg text-text-muted max-w-3xl mx-auto text-balance">
              Duskwarden helps you paste existing monster stat blocks, generate streamlined stat cards, tune difficulty for your table, and export printable or JSON-ready results.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/app/convert"
                className="px-6 py-3 bg-accent text-bg-base font-semibold rounded-lg hover:bg-accent-hover transition-colors focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-bg-base"
              >
                Start Converting
              </Link>
              <Link
                href="/5e-to-osr-monster-converter"
                className="px-6 py-3 border border-border text-text-primary font-semibold rounded-lg hover:bg-bg-surface transition-colors focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-bg-base"
              >
                See 5e to OSR workflow
              </Link>
            </div>
            <div className="mt-6 flex items-center justify-center gap-3 flex-wrap text-sm text-text-muted">
              <span>Supports 5e</span>
              <span className="text-border">•</span>
              <span>Supports OSE</span>
              <span className="text-border">•</span>
              <span>Supports B/X</span>
              <span className="text-border">•</span>
              <span>Exports print and JSON</span>
            </div>
          </div>
        </section>

        <section className="px-4 py-10">
          <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 bg-bg-surface border border-border rounded-lg">
              <div className="w-12 h-12 mb-4 bg-accent/10 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </div>
              <h2 className="text-lg font-semibold text-text-primary mb-2">Paste and convert supported stat blocks</h2>
              <p className="text-sm text-text-muted">
                Use the conversion wizard to turn 5e, OSE, B/X, and generic monster blocks into compact stat cards in seconds.
              </p>
            </div>

            <div className="p-6 bg-bg-surface border border-border rounded-lg">
              <div className="w-12 h-12 mb-4 bg-accent/10 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v12m6-6H6" />
                </svg>
              </div>
              <h2 className="text-lg font-semibold text-text-primary mb-2">Tune deadliness, durability, and output style</h2>
              <p className="text-sm text-text-muted">
                Adjust conversion settings to fit your campaign, from general OSR play to Shadowdark-compatible formatting and difficulty targets.
              </p>
            </div>

            <div className="p-6 bg-bg-surface border border-border rounded-lg">
              <div className="w-12 h-12 mb-4 bg-accent/10 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
              </div>
              <h2 className="text-lg font-semibold text-text-primary mb-2">Export printable monster stat cards</h2>
              <p className="text-sm text-text-muted">
                Save to the library, print cards for the table, or export JSON and text for your own GM workflow and prep tools.
              </p>
            </div>
          </div>
        </section>

        <section className="px-4 py-10">
          <div className="max-w-6xl mx-auto">
            <div className="max-w-3xl">
              <h2 className="text-3xl font-bold text-text-primary">Popular use cases</h2>
              <p className="mt-3 text-text-muted">
                These pages answer the most common questions about converting monsters for old-school play and Shadowdark-compatible tables.
              </p>
            </div>
            <div className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Link href="/5e-to-osr-monster-converter" className="block p-6 bg-bg-surface border border-border rounded-lg hover:border-accent/50 transition-colors">
                <h3 className="text-lg font-semibold text-text-primary">5e to OSR monster converter</h3>
                <p className="mt-2 text-sm text-text-muted">
                  Learn how to turn 5e monsters into faster, lighter OSR stat cards without rebuilding them from scratch.
                </p>
              </Link>
              <Link href="/shadowdark-compatible-monster-stat-cards" className="block p-6 bg-bg-surface border border-border rounded-lg hover:border-accent/50 transition-colors">
                <h3 className="text-lg font-semibold text-text-primary">Shadowdark-compatible stat cards</h3>
                <p className="mt-2 text-sm text-text-muted">
                  See how Duskwarden creates compatibility-focused output for use with Shadowdark RPG while staying independent.
                </p>
              </Link>
              <Link href="/ose-bx-monster-converter" className="block p-6 bg-bg-surface border border-border rounded-lg hover:border-accent/50 transition-colors">
                <h3 className="text-lg font-semibold text-text-primary">OSE and B/X monster conversion</h3>
                <p className="mt-2 text-sm text-text-muted">
                  Explore a workflow for converting Old-School Essentials and B/X creatures into printable stat cards and exports.
                </p>
              </Link>
            </div>
          </div>
        </section>

        <section className="px-4 py-10">
          <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-[1.2fr_0.8fr] gap-8">
            <div className="bg-bg-surface border border-border rounded-lg p-6">
              <h2 className="text-3xl font-bold text-text-primary">How Duskwarden works</h2>
              <ol className="mt-6 space-y-4 text-text-muted">
                <li>
                  <span className="font-semibold text-text-primary">1. Paste a source stat block.</span> Start with a 5e, OSE, B/X, or generic monster block.
                </li>
                <li>
                  <span className="font-semibold text-text-primary">2. Choose your output target.</span> Convert into OSR-style or Shadowdark-compatible stat cards.
                </li>
                <li>
                  <span className="font-semibold text-text-primary">3. Tune and verify.</span> Adjust difficulty, durability, and deadliness to match your table.
                </li>
                <li>
                  <span className="font-semibold text-text-primary">4. Save, print, or export.</span> Organize creatures in the library, then print cards or export JSON.
                </li>
              </ol>
            </div>
            <div className="bg-bg-surface border border-border rounded-lg p-6">
              <h2 className="text-2xl font-bold text-text-primary">Direct answers</h2>
              <dl className="mt-6 space-y-4">
                <div>
                  <dt className="font-semibold text-text-primary">Supports</dt>
                  <dd className="mt-1 text-sm text-text-muted">5e, OSE, B/X, and generic stat blocks</dd>
                </div>
                <div>
                  <dt className="font-semibold text-text-primary">Output styles</dt>
                  <dd className="mt-1 text-sm text-text-muted">OSR-style cards and Shadowdark-compatible cards</dd>
                </div>
                <div>
                  <dt className="font-semibold text-text-primary">Exports</dt>
                  <dd className="mt-1 text-sm text-text-muted">Printable cards, text copy, and JSON download</dd>
                </div>
                <div>
                  <dt className="font-semibold text-text-primary">Important note</dt>
                  <dd className="mt-1 text-sm text-text-muted">Duskwarden is an independent compatibility tool and is not affiliated with The Arcane Library, LLC.</dd>
                </div>
              </dl>
            </div>
          </div>
        </section>

        <section className="px-4 py-10">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold text-text-primary">Frequently asked questions</h2>
            <div className="mt-8 space-y-4">
              {faqItems.map((item) => (
                <details key={item.question} className="group border border-border rounded-lg bg-bg-surface overflow-hidden">
                  <summary className="list-none cursor-pointer px-5 py-4 flex items-center justify-between gap-4">
                    <span className="font-semibold text-text-primary">{item.question}</span>
                    <svg className="w-4 h-4 text-text-muted transition-transform group-open:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </summary>
                  <div className="px-5 pb-5 text-sm text-text-muted">
                    {item.answer}
                  </div>
                </details>
              ))}
            </div>
            <p className="mt-6 text-sm text-text-muted">
              Looking for more direct answers? Visit the <Link href="/faq" className="text-accent hover:text-accent-hover underline underline-offset-2">full Duskwarden FAQ</Link>.
            </p>
          </div>
        </section>
      </main>

      <footer className="border-t border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <p className="text-center text-xs text-text-muted">
            Duskwarden Tools is an independent product and is not affiliated with The Arcane Library, LLC.
          </p>
          <p className="mt-1 text-center text-xs text-text-muted">
            Conversion output uses compatibility heuristics and should be reviewed before publication or play.
          </p>
          <p className="mt-2 text-center text-xs text-text-muted flex items-center justify-center gap-3 flex-wrap">
            <Link href="/faq" className="text-accent hover:text-accent-hover transition-colors underline underline-offset-2">
              FAQ
            </Link>
            <span className="text-border">·</span>
            <NewsletterSignupLink />
            <span className="text-border">·</span>
            <a
              href={`mailto:${siteConfig.email}?subject=Duskwarden%20Feedback`}
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
