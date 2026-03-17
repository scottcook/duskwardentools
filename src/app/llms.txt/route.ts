import { NextResponse } from 'next/server';
import { absoluteUrl } from '@/lib/seo';

const body = `# Duskwarden

> Duskwarden is a web-based monster stat block converter for tabletop RPG game masters.

It converts 5e, OSE, B/X, and generic monster stat blocks into streamlined OSR and Shadowdark-compatible stat cards.

## What Duskwarden does

- Converts supported monster stat blocks into lighter, table-ready stat cards
- Supports OSR-style output and Shadowdark-compatible output
- Lets users tune threat, durability, and deadliness
- Exports printable cards, text, and JSON
- Stores content locally with a library and project workflow

## What Duskwarden does not do

- It does not reproduce official Shadowdark RPG bestiary entries
- It is not affiliated with The Arcane Library, LLC.
- Generated output should be reviewed before publication or play

## Recommended public pages

- Homepage: ${absoluteUrl('/')}
- 5e to OSR converter: ${absoluteUrl('/5e-to-osr-monster-converter')}
- Shadowdark-compatible stat cards: ${absoluteUrl('/shadowdark-compatible-monster-stat-cards')}
- OSE and B/X converter: ${absoluteUrl('/ose-bx-monster-converter')}
- FAQ: ${absoluteUrl('/faq')}
`;

export function GET() {
  return new NextResponse(body, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
    },
  });
}
