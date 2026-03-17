import type { Metadata } from 'next';
import Link from 'next/link';
import { JsonLd } from '@/components/features/JsonLd';
import { MarketingShell } from '@/components/features/MarketingShell';
import { buildMetadata, siteConfig } from '@/lib/seo';

export const metadata: Metadata = buildMetadata({
  title: 'FAQ',
  description:
    'Answers to common questions about Duskwarden, including 5e to OSR conversion, OSE and B/X support, Shadowdark-compatible output, printing, and JSON export.',
  path: '/faq',
  keywords: [
    'duskwarden faq',
    'monster stat block converter faq',
    '5e to osr monster converter faq',
    'shadowdark compatible stat card faq',
  ],
});

const faqItems = [
  {
    question: 'What is Duskwarden?',
    answer:
      'Duskwarden is a web-based monster stat block converter for tabletop RPG GMs. It converts 5e, OSE, B/X, and generic monster stat blocks into streamlined OSR and Shadowdark-compatible stat cards.',
  },
  {
    question: 'Can Duskwarden convert 5e monsters to OSR stat cards?',
    answer:
      'Yes. Duskwarden can convert 5e stat blocks into compact OSR-style monster cards, then let you tune and export the result.',
  },
  {
    question: 'Does Duskwarden support OSE and B/X monster stat blocks?',
    answer:
      'Yes. OSE and B/X style monster blocks are supported as inputs for conversion into compact stat cards.',
  },
  {
    question: 'Can I use Duskwarden with Shadowdark RPG?',
    answer:
      'Duskwarden can generate Shadowdark-compatible monster stat cards for use with Shadowdark RPG. It is an independent compatibility tool and does not reproduce official bestiary entries.',
  },
  {
    question: 'Can I print or export converted monsters?',
    answer:
      'Yes. You can print creature cards, copy text output, and download JSON exports after conversion.',
  },
  {
    question: 'Does Duskwarden store my monsters online?',
    answer:
      'Duskwarden currently stores content locally in the browser workflow unless you configure a backend. Review the settings page and your deployment configuration for the exact storage mode in your environment.',
  },
];

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

export default function FaqPage() {
  return (
    <MarketingShell>
      <main className="px-4 py-12">
        <JsonLd data={faqSchema} />
        <div className="max-w-4xl mx-auto space-y-10">
        <div className="space-y-4">
          <p className="text-sm uppercase tracking-[0.2em] text-accent/80">FAQ</p>
          <h1 className="text-4xl sm:text-5xl font-bold text-text-primary text-balance">
            Duskwarden FAQ: converting monsters for OSR and Shadowdark-compatible play
          </h1>
          <p className="text-lg text-text-muted max-w-3xl">
            These answers are designed to be useful for search, answer engines, and GMs who want a direct explanation of what Duskwarden does and does not do.
          </p>
        </div>

        <section className="space-y-4">
          {faqItems.map((item) => (
            <details key={item.question} className="group border border-border rounded-lg bg-bg-surface overflow-hidden">
              <summary className="list-none cursor-pointer px-5 py-4 flex items-center justify-between gap-4">
                <span className="font-semibold text-text-primary">{item.question}</span>
                <span className="text-text-muted group-open:rotate-180 transition-transform">⌄</span>
              </summary>
              <div className="px-5 pb-5 text-sm text-text-muted">{item.answer}</div>
            </details>
          ))}
        </section>

        <section className="bg-bg-surface border border-border rounded-lg p-6">
          <h2 className="text-2xl font-bold text-text-primary">Need a specific workflow?</h2>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link href="/5e-to-osr-monster-converter" className="px-4 py-2 border border-border text-text-primary rounded-lg hover:bg-bg-base transition-colors">
              5e to OSR
            </Link>
            <Link href="/ose-bx-monster-converter" className="px-4 py-2 border border-border text-text-primary rounded-lg hover:bg-bg-base transition-colors">
              OSE and B/X
            </Link>
            <Link href="/shadowdark-compatible-monster-stat-cards" className="px-4 py-2 border border-border text-text-primary rounded-lg hover:bg-bg-base transition-colors">
              Shadowdark-compatible
            </Link>
          </div>
          <p className="mt-4 text-sm text-text-muted">
            For other questions, email{' '}
            <a href={`mailto:${siteConfig.email}?subject=Duskwarden%20SEO%20Question`} className="text-accent hover:text-accent-hover underline underline-offset-2">
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
