# Duskwarden Tools

roll for initiative

A creature conversion workbench for tabletop RPG GMs. Paste stat blocks from any system, convert them to a generic format, and organize your campaign content.

## Features

- **Creature Conversion**: Paste stat blocks from 5e, OSE, B/X, or other systems and convert them
- **Adjustable Stats**: Deadliness and durability sliders for quick tuning
- **Project Organization**: Group creatures and notes by campaign or adventure
- **Library Search**: Full-text search across all your content
- **Export Options**: Copy to clipboard, JSON download, and print-friendly cards

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS 4
- **Database**: Supabase (PostgreSQL with RLS)
- **Auth**: Supabase Auth (Magic Link)

## Getting Started

### Prerequisites

- Node.js 18+
- npm
- Supabase project

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install --include=dev
   ```

3. Copy the environment example:
   ```bash
   cp .env.local.example .env.local
   ```

4. Update `.env.local` with your Supabase credentials

5. Run database migrations (via Supabase dashboard or CLI)

6. Start the development server:
   ```bash
   npm run dev
   ```

### Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run test` - Run unit tests (watch mode)
- `npm run test:run` - Run unit tests once
- `npm run test:e2e` - Run end-to-end tests

## Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── (auth)/             # Auth routes (login)
│   ├── app/                # Protected app routes
│   └── auth/               # Auth callback routes
├── components/
│   ├── ui/                 # Design system components
│   └── features/           # Feature-specific components
├── lib/
│   ├── supabase/           # Supabase client setup
│   ├── parser/             # Stat block parser
│   └── conversion/         # Conversion engine
└── types/                  # TypeScript types
```

## System Packs

Duskwarden uses a **System Pack** architecture so conversions can be truly accurate when lawful data is available, and "assist + verify" when it is not.

### Available Packs

| Pack ID | Display Name | Data Source | License |
|---|---|---|---|
| `osr_generic` | OSR Generic | Heuristics | Internal |
| `dnd5e_srd` | D&D 5e (SRD) | SRD 5.1 monster list | CC BY 4.0 |
| `shadowdark_private_verify` | For use with Shadowdark RPG (verify) | User-provided reference text | UserProvided |

### D&D 5e SRD — Ingesting Data

A curated seed list of SRD monsters ships with the repo. To replace it with a fuller list from a structured JSON file:

```bash
npm run ingest:srd -- --input /path/to/srd-monsters.json
```

**Input format:**
```json
[
  { "name": "Goblin", "ac": 15, "hp": 7, "cr": "1/4", "movement": "30 ft",
    "attacks": [{ "name": "Scimitar", "bonus": 4, "damage": "1d6+2" }] }
]
```

> Only ingest content from the D&D 5e SRD (CC BY 4.0). Do NOT ingest content from the PHB, MM, DMG, or any non-SRD source. Attribution is automatically written to `data/packs/dnd5e_srd/license.json` and included in all exports.

### Shadowdark Verify Mode

The `shadowdark_private_verify` pack ships zero proprietary Shadowdark content. Users paste the official stat block text from their own copy of the Shadowdark rules into a **Reference** textarea. The app:

1. Converts the source stat block using Shadowdark-tuned parameters
2. Diffs the output against the user's reference field-by-field
3. Shows an **Accuracy %** score and highlights mismatches
4. Offers one-click "Apply Reference Values" to use the user's text as ground truth

Reference text is stored only in the user's browser (`localStorage`) and is never transmitted to any server.

### Adding a New System Pack

1. **Extend the identifier union** in `src/lib/systemPacks/types.ts`:
   ```ts
   export type SystemPackId = 'osr_generic' | 'dnd5e_srd' | 'shadowdark_private_verify' | 'your_new_pack';
   ```

2. **Create the pack file** at `src/lib/systemPacks/packs/yourNewPack.ts` implementing `SystemPack`:
   ```ts
   export const yourNewPack: SystemPack = {
     id: 'your_new_pack',
     displayName: 'Your Pack Name',
     description: 'One-line description shown in UI.',
     license: { type: 'CC-BY-4.0', attributionText: '...' },
     canAutoFindStatblocks: false,
     requiresUserReference: false,
     parseSourceStatblock(text) { /* use parseStatBlock from @/lib/parser */ },
     convertToTarget(parsed, options) { /* use buildConvertedStat from conversionUtils */ },
     validate(converted, reference) { /* use generateValidationReport from validateUtils */ },
   };
   ```

3. **Register it** in `src/lib/systemPacks/index.ts`:
   ```ts
   import { yourNewPack } from './packs/yourNewPack';
   
   export const SYSTEM_PACKS = {
     // ...existing packs...
     your_new_pack: yourNewPack,
   };
   
   export const SYSTEM_PACK_OPTIONS = [
     // ...existing options...
     { value: 'your_new_pack', label: yourNewPack.displayName, description: yourNewPack.description },
   ];
   ```

4. **Write tests** in `tests/unit/systemPacks.test.ts` — at minimum test `convertToTarget` stamps the correct `outputPackId` and `validate` returns a report.

### Needed Inputs Checklist

Before deploying to production, provide:

- [ ] **SRD 5.1 monster JSON**: A structured JSON file of all SRD monsters (or confirm the seed list in `data/packs/dnd5e_srd/monsters.json` is sufficient). Run `npm run ingest:srd -- --input <path>` to replace the seed data.
- [ ] **Supabase credentials**: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` in `.env.local`.
- [ ] **Shadowdark verify mode**: No data needed — users paste reference text they own at runtime.

---

## Legal Notice

**Duskwarden Tools is an independent product and is not affiliated with The Arcane Library, LLC.**

- Content labeled "for use with Shadowdark RPG" indicates compatibility only; it does not imply official status.
- D&D 5e SRD data is used under CC BY 4.0. Attribution text is included in all exports from the `dnd5e_srd` pack.
- No proprietary Shadowdark RPG rules text is embedded in or shipped with this application.

## License

MIT
