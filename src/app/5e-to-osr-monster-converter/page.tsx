import type { Metadata } from 'next';
import Link from 'next/link';
import { JsonLd } from '@/components/features/JsonLd';
import { MarketingShell } from '@/components/features/MarketingShell';
import { TrackedLink } from '@/components/features/TrackedLink';
import { buildMetadata, siteConfig } from '@/lib/seo';

export const metadata: Metadata = buildMetadata({
  title: '5e to OSR Monster Converter',
  description:
    'Convert 5e monster stat blocks into streamlined OSR stat cards with printable output, JSON export, and tuning controls for old-school play.',
  path: '/5e-to-osr-monster-converter',
  keywords: [
    '5e to osr monster converter',
    'convert 5e monsters to osr',
    '5e monster stat block to osr',
    'osr monster stat cards',
    'printable monster stat cards',
  ],
});

const faqSchema = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: 'How do I convert 5e monsters to OSR play with Duskwarden?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Paste a 5e monster stat block into Duskwarden, choose an OSR-style output profile, review the generated stat card, then tune difficulty or export it for play.',
      },
    },
    {
      '@type': 'Question',
      name: 'Does Duskwarden preserve the exact 5e rules text?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'No. Duskwarden creates streamlined compatibility-focused stat cards rather than reproducing full official rules text.',
      },
    },
  ],
};

export default function FiveEToOsrPage() {
  return (
    <MarketingShell>
      <main className="px-4 py-12">
        <JsonLd data={faqSchema} />
        <div className="max-w-4xl mx-auto space-y-10">
        <div className="space-y-4">
          <p className="text-sm uppercase tracking-[0.2em] text-accent">5e to OSR workflow</p>
          <h1 className="text-4xl sm:text-5xl font-bold text-text-primary text-balance">
            5e to OSR monster converter for faster, table-ready stat cards
          </h1>
          <p className="text-lg text-text-muted max-w-3xl">
            Duskwarden helps GMs convert 5e monster stat blocks into streamlined OSR stat cards without rebuilding every creature by hand. Paste a source stat block, generate a compact output card, then tune durability, deadliness, and export format.
          </p>
          <div className="flex flex-wrap gap-3">
            <TrackedLink
              href="/app/convert"
              className="px-5 py-3 bg-accent text-bg-base font-semibold rounded-lg hover:bg-accent-hover transition-colors"
              eventName="marketing_cta_click"
              eventProperties={{ location: '5e_lander_hero', destination: 'convert', style: 'primary' }}
            >
              Convert a 5e monster
            </TrackedLink>
            <TrackedLink
              href="/faq"
              className="px-5 py-3 border border-border text-text-primary rounded-lg hover:bg-bg-surface transition-colors"
              eventName="marketing_cta_click"
              eventProperties={{ location: '5e_lander_hero', destination: 'faq', style: 'secondary' }}
            >
              Read the FAQ
            </TrackedLink>
          </div>
        </div>

        <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-bg-surface border border-border rounded-lg p-5">
            <h2 className="text-lg font-semibold text-text-primary">Paste a 5e stat block</h2>
            <p className="mt-2 text-sm text-text-muted">
              Start with an existing 5e monster block from your prep notes or SRD-style content.
            </p>
          </div>
          <div className="bg-bg-surface border border-border rounded-lg p-5">
            <h2 className="text-lg font-semibold text-text-primary">Generate an OSR card</h2>
            <p className="mt-2 text-sm text-text-muted">
              Duskwarden compresses the result into a lighter stat card format that is easier to run at the table.
            </p>
          </div>
          <div className="bg-bg-surface border border-border rounded-lg p-5">
            <h2 className="text-lg font-semibold text-text-primary">Tune and export</h2>
            <p className="mt-2 text-sm text-text-muted">
              Adjust difficulty, save the creature, print it, or export JSON for your own GM workflow.
            </p>
          </div>
        </section>

        <section className="bg-bg-surface border border-border rounded-lg p-6 space-y-4">
          <h2 className="text-2xl font-bold text-text-primary">Why use Duskwarden for 5e to OSR conversion?</h2>
          <p className="text-text-muted">
            Many GMs want to keep the flavor of familiar 5e monsters while running them in lighter old-school systems. Duskwarden is designed for that exact workflow: convert, simplify, tune, and export. Instead of rewriting every stat block from scratch, you can start from a 5e source and build a more compact monster card for old-school play.
          </p>
          <p className="text-text-muted">
            Duskwarden works best when you want practical compatibility output, not a verbatim transcription of official rules text. Generated monsters should still be reviewed and adjusted for your table.
          </p>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-bold text-text-primary">Direct answers</h2>
          <div className="space-y-3">
            <details className="group border border-border rounded-lg bg-bg-surface overflow-hidden">
              <summary className="list-none cursor-pointer px-5 py-4 flex items-center justify-between gap-4">
                <span className="font-semibold text-text-primary">How do I convert 5e monsters to OSR play with Duskwarden?</span>
                <span className="text-text-muted group-open:rotate-180 transition-transform">⌄</span>
              </summary>
              <div className="px-5 pb-5 text-sm text-text-muted">
                Paste a 5e monster stat block into Duskwarden, choose an OSR-style output profile, review the converted card, then tune deadliness and durability before saving or exporting.
              </div>
            </details>
            <details className="group border border-border rounded-lg bg-bg-surface overflow-hidden">
              <summary className="list-none cursor-pointer px-5 py-4 flex items-center justify-between gap-4">
                <span className="font-semibold text-text-primary">Does Duskwarden preserve exact 5e rules text?</span>
                <span className="text-text-muted group-open:rotate-180 transition-transform">⌄</span>
              </summary>
              <div className="px-5 pb-5 text-sm text-text-muted">
                No. Duskwarden is a compatibility-focused converter that produces streamlined output rather than reproducing official rules text verbatim.
              </div>
            </details>
          </div>
        </section>

        <section className="text-sm text-text-muted">
          <p>
            Duskwarden Tools is an independent product and is not affiliated with The Arcane Library, LLC. For Shadowdark-compatible output, see{' '}
            <Link href="/shadowdark-compatible-monster-stat-cards" className="text-accent hover:text-accent-hover underline underline-offset-2">
              the compatibility page
            </Link>
            . For general site information, visit{' '}
            <a href={`mailto:${siteConfig.email}?subject=Duskwarden%20Question`} className="text-accent hover:text-accent-hover underline underline-offset-2">
              {siteConfig.email}
            </a>
            .
          </p>
        </section>
        </div>
      </main>
    </MarketingShell>
  );
}
