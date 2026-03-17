import type { Metadata } from 'next';
import Link from 'next/link';
import { MarketingShell } from '@/components/features/MarketingShell';
import { buildMetadata } from '@/lib/seo';

export const metadata: Metadata = buildMetadata({
  title: 'OSE and B/X Monster Converter',
  description:
    'Convert OSE and B/X monster stat blocks into streamlined old-school monster cards with print and JSON export for tabletop RPG prep.',
  path: '/ose-bx-monster-converter',
  keywords: [
    'ose monster converter',
    'b/x monster converter',
    'old-school essentials monster converter',
    'bx monster stat card',
    'ose monster stat card',
  ],
});

export default function OseBxMonsterConverterPage() {
  return (
    <MarketingShell>
      <main className="px-4 py-12">
        <div className="max-w-4xl mx-auto space-y-10">
        <div className="space-y-4">
          <p className="text-sm uppercase tracking-[0.2em] text-accent/80">OSE and B/X conversion</p>
          <h1 className="text-4xl sm:text-5xl font-bold text-text-primary text-balance">
            Convert OSE and B/X monster stat blocks into printable old-school monster cards
          </h1>
          <p className="text-lg text-text-muted max-w-3xl">
            Duskwarden supports OSE and B/X style monster stat blocks and helps you turn them into compact, exportable monster cards for faster prep and table use.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link href="/app/convert" className="px-5 py-3 bg-accent text-bg-base font-semibold rounded-lg hover:bg-accent-hover transition-colors">
              Convert an OSE or B/X monster
            </Link>
            <Link href="/5e-to-osr-monster-converter" className="px-5 py-3 border border-border text-text-primary rounded-lg hover:bg-bg-surface transition-colors">
              Compare with 5e conversion
            </Link>
          </div>
        </div>

        <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-bg-surface border border-border rounded-lg p-5">
            <h2 className="text-lg font-semibold text-text-primary">Supported inputs</h2>
            <p className="mt-2 text-sm text-text-muted">OSE, B/X, and generic old-school stat blocks with lightweight parsing and conversion support.</p>
          </div>
          <div className="bg-bg-surface border border-border rounded-lg p-5">
            <h2 className="text-lg font-semibold text-text-primary">Compact output</h2>
            <p className="mt-2 text-sm text-text-muted">Generate stat cards with core defenses, attacks, traits, morale, and table-ready formatting.</p>
          </div>
          <div className="bg-bg-surface border border-border rounded-lg p-5">
            <h2 className="text-lg font-semibold text-text-primary">Export options</h2>
            <p className="mt-2 text-sm text-text-muted">Print cards, save to the library, or download JSON for your own prep workflow.</p>
          </div>
        </section>

        <section className="bg-bg-surface border border-border rounded-lg p-6 space-y-4">
          <h2 className="text-2xl font-bold text-text-primary">Best use cases</h2>
          <p className="text-text-muted">
            Use Duskwarden when you want to organize, print, or standardize OSE and B/X monsters in a consistent card format. It is also useful when you want one conversion workspace that can handle both old-school inputs and 5e inputs in the same tool.
          </p>
        </section>

        <section className="bg-bg-surface border border-border rounded-lg p-6 space-y-4">
          <h2 className="text-2xl font-bold text-text-primary">Need Shadowdark-compatible output instead?</h2>
          <p className="text-text-muted">
            If your goal is compatibility output for Shadowdark RPG rather than general old-school cards, visit the dedicated{' '}
            <Link href="/shadowdark-compatible-monster-stat-cards" className="text-accent hover:text-accent-hover underline underline-offset-2">
              Shadowdark-compatible page
            </Link>
            .
          </p>
        </section>
        </div>
      </main>
    </MarketingShell>
  );
}
