# Duskwarden

A dark, OSR-flavoured **TTRPG monster toolkit**: build campaign **projects**, search
a **creature library**, add creatures to projects, and **transmute** stat blocks
between eight game systems.

Built to the Claude Design handoff (see [`project/`](project/) and
[`chats/`](chats/)) and wired to the existing **Duskwarden Tools** Supabase
database.

- **Projects** — create / rename / delete campaigns; each is a vault of creatures.
- **Creature Library** — search 160+ saved creatures by name, trait, tag, attack,
  or system; filter by system and by project assignment; add / move / remove a
  creature to a project; switch between converted and original source blocks;
  send any saved creature back to the converter; export the complete library;
  delete.
- **Converter** — a faithful build of the design's two-panel transmuter. Edit a
  beast in the neutral "forge", roll the die, and render it into D&D 5E, OSE/B/X,
  AD&D 1E, Shadowdark, DCC, Mörk Borg, Pathfinder 2E, or Knave. Copy the block,
  download JSON, or **save both the converted block and its source straight into
  your library**. Missing source fields are surfaced before conversion instead
  of silently relying on fallback arithmetic.

## Stack

- **React 18 + TypeScript + Vite**
- **React Router** for navigation
- **@supabase/supabase-js** against the existing Postgres (PostgREST) backend
- Zero UI dependencies — the Mörk Borg × Shadowdark look is hand-authored CSS
  ported from the design (`src/styles/theme.css`).

## Quickstart

```bash
npm install
cp .env.example .env      # fill in the two Supabase values (below)
npm run dev               # http://localhost:5173
```

Build & preview production:

```bash
npm run build
npm run preview
```

## Configuration

Set these in `.env` (or in your host's env vars, e.g. Vercel Project Settings):

| Variable                 | Where to find it                                   |
| ------------------------ | -------------------------------------------------- |
| `VITE_SUPABASE_URL`      | Supabase → Project Settings → API → Project URL    |
| `VITE_SUPABASE_ANON_KEY` | Supabase → Project Settings → API → publishable key |

For the existing **Duskwarden Tools** project these are:

```
VITE_SUPABASE_URL=https://helxjdcxaxzcsvojscyd.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable_5k7pDIfGW04KpQVVCBt8jA_jp8DegoX
```

The anon/publishable key is safe to ship in a client bundle — it is protected by
Row Level Security. Never put the **service_role** key here.

### Demo mode

If the two variables are absent (or `VITE_DEMO=true`), the app runs against a
**localStorage** data layer seeded with a sample bestiary — no network, no
credentials. A banner makes this obvious. Handy for offline UI work and CI.

## How it maps to the existing database

The database identifies users **by device, not by login** — there is no auth
screen. Row Level Security on every table compares `user_id` / `device_id` to
`get_device_id()`, which reads the **`x-device-id` HTTP header**. The client
sends a stable per-browser id on every request (`src/lib/device.ts` +
`src/lib/supabase.ts`).

Consequences worth knowing:

- A **fresh browser starts empty** — it owns nothing yet. That's correct.
- Your data is portable via the device id, not an account. The footer's
  **"your warden's mark"** dialog lets you copy the current id or paste a saved
  one to reclaim a library on another browser.

Data model (see [`supabase/schema.sql`](supabase/schema.sql) for the full,
reverse-engineered reference — the live DB already has it):

| Concept            | Table / column                                              |
| ------------------ | ----------------------------------------------------------- |
| Project            | `projects` (`name`, `description`, `user_id` = device)      |
| Creature           | `entries` where `type = 'creature'`                         |
| Creature in a project | `entries.project_id` → `projects.id` (nullable = library) |
| Neutral stats      | `entries.parsed_json` (name / ac / hp / level / attacks / …) |
| Converted block    | `entries.output_json`                                       |

**"Add a creature to a project"** sets that creature's `project_id`; **"remove"**
sets it back to `null` (the creature returns to the library, never destroyed).
Deleting a project likewise returns its creatures to the library.

## Project structure

```
src/
  lib/
    config.ts          env + demo-mode detection
    device.ts          per-browser device id (x-device-id)
    supabase.ts        Supabase client (sends the device header)
    types.ts           row types mirroring the DB
    api.ts             DataApi: SupabaseApi + MockApi (chosen by config)
    mockData.ts        demo-mode seed bestiary
    convert.ts         the design's transmutation engine (ported)
    creatureBridge.ts  forge ⇄ entry mapping (save / load)
    creatureModel.ts   read helpers for heterogeneous creature JSON
    systems.ts         system codes ⇄ labels
  components/          Layout, Modal, toasts, cards, menus, dialogs
  pages/              ProjectsPage, ProjectDetailPage, LibraryPage, ConverterPage
  styles/theme.css    the full design system
project/ , chats/     original Claude Design handoff (source of truth for the look)
supabase/schema.sql   reference schema + RLS
```

## Deploy (Vercel)

Vite SPA. Set the two `VITE_…` env vars in the project, build command
`npm run build`, output `dist`. Add a rewrite so client-side routes resolve:

```json
{ "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }] }
```

## Verification

- Typecheck + production build are clean (`npm run build`).
- All three required flows — **create a project**, **search the library**, and
  **add a creature to a project** — plus the converter's save-to-library loop
  were driven end-to-end in a headless browser (demo mode).
- The real Supabase path (insert/select/assign under the `anon` role + device
  header) and RLS isolation were validated directly against the live database.
