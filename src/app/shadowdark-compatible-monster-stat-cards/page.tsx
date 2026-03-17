import type { Metadata } from 'next';
import Link from 'next/link';
import { JsonLd } from '@/components/features/JsonLd';
import { MarketingShell } from '@/components/features/MarketingShell';
import { buildMetadata } from '@/lib/seo';

export const metadata: Metadata = buildMetadata({
  title: 'Shadowdark-Compatible Monster Stat Cards',
  description:
    'Create Shadowdark-compatible monster stat cards from existing 5e, OSE, B/X, and generic stat blocks with tuning, verification workflow, and printable exports.',
  path: '/shadowdark-compatible-monster-stat-cards',
  keywords: [
    'shadowdark compatible monster stat cards',
    'convert monsters for shadowdark',
    'shadowdark compatible stat block tool',
    'shadowdark style monster stat cards',
    '5e to shadowdark compatible monster converter',
  ],
});

const schema = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: 'Can Duskwarden create official Shadowdark stat blocks?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'No. Duskwarden creates Shadowdark-compatible stat cards for use with Shadowdark RPG, but it does not reproduce official bestiary entries.',
      },
    },
    {
      '@type': 'Question',
      name: 'How does Shadowdark-compatible verification work?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Duskwarden lets users paste their own reference text into the conversion review flow so they can compare a generated compatibility result against text they already own.',
      },
    },
  ],
};

export default function ShadowdarkCompatiblePage() {
  return (
    <MarketingShell>
      <main className="px-4 py-12">
        <JsonLd data={schema} />
        <div className="max-w-4xl mx-auto space-y-10">
        <div className="space-y-4">
          <p className="text-sm uppercase tracking-[0.2em] text-accent/80">For use with Shadowdark RPG</p>
          <h1 className="text-4xl sm:text-5xl font-bold text-text-primary text-balance">
            Create Shadowdark-compatible monster stat cards from your existing source material
          </h1>
          <p className="text-lg text-text-muted max-w-3xl">
            Duskwarden helps GMs turn existing monster stat blocks into compatibility-focused stat cards for use with Shadowdark RPG. It is designed for practical prep and table use, not for reproducing official bestiary content.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link href="/app/convert" className="px-5 py-3 bg-accent text-bg-base font-semibold rounded-lg hover:bg-accent-hover transition-colors">
              Build a compatible card
            </Link>
            <Link href="/ose-bx-monster-converter" className="px-5 py-3 border border-border text-text-primary rounded-lg hover:bg-bg-surface transition-colors">
              Compare OSE and B/X workflows
            </Link>
          </div>
        </div>

        <section className="bg-bg-surface border border-border rounded-lg p-6 space-y-4">
          <h2 className="text-2xl font-bold text-text-primary">What Duskwarden does</h2>
          <ul className="space-y-2 text-text-muted">
            <li>Converts supported monster stat blocks into Shadowdark-compatible output</li>
            <li>Lets you tune stat bands, durability, and deadliness for your table</li>
            <li>Supports a reference comparison workflow for users who already own source text</li>
            <li>Saves, prints, and exports the final compatibility card</li>
          </ul>
        </section>

        <section className="bg-bg-surface border border-border rounded-lg p-6 space-y-4">
          <h2 className="text-2xl font-bold text-text-primary">What Duskwarden does not do</h2>
          <p className="text-text-muted">
            Duskwarden does not generate official Shadowdark bestiary entries, does not embed proprietary rules text, and does not claim affiliation with The Arcane Library, LLC. It is an independent compatibility tool intended to help you review and tune monsters for your own game prep.
          </p>
        </section>

        <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-bg-surface border border-border rounded-lg p-6">
            <h2 className="text-xl font-bold text-text-primary">Compatibility-first workflow</h2>
            <p className="mt-3 text-text-muted">
              Start with a source stat block, choose the Shadowdark-compatible profile, then review the generated card. If you own reference text, you can compare against it as part of the review process.
            </p>
          </div>
          <div className="bg-bg-surface border border-border rounded-lg p-6">
            <h2 className="text-xl font-bold text-text-primary">Answer-engine clarity</h2>
            <p className="mt-3 text-text-muted">
              The best way to describe Duskwarden is “Shadowdark-compatible monster stat cards” or “for use with Shadowdark RPG.” That wording is accurate and reflects how the app is built today.
            </p>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-2xl font-bold text-text-primary">Common questions</h2>
          <details className="group border border-border rounded-lg bg-bg-surface overflow-hidden">
            <summary className="list-none cursor-pointer px-5 py-4 flex items-center justify-between gap-4">
              <span className="font-semibold text-text-primary">Can Duskwarden create official Shadowdark stat blocks?</span>
              <span className="text-text-muted group-open:rotate-180 transition-transform">⌄</span>
            </summary>
            <div className="px-5 pb-5 text-sm text-text-muted">
              No. Duskwarden creates compatibility-focused output for use with Shadowdark RPG. It does not reproduce official bestiary entries.
            </div>
          </details>
          <details className="group border border-border rounded-lg bg-bg-surface overflow-hidden">
            <summary className="list-none cursor-pointer px-5 py-4 flex items-center justify-between gap-4">
              <span className="font-semibold text-text-primary">How does verification work?</span>
              <span className="text-text-muted group-open:rotate-180 transition-transform">⌄</span>
            </summary>
            <div className="px-5 pb-5 text-sm text-text-muted">
              If you already own the relevant text, you can paste a reference stat block into the review flow and compare the compatibility result before saving or printing.
            </div>
          </details>
        </section>
        </div>
      </main>
    </MarketingShell>
  );
}
