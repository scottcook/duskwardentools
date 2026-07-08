-- =============================================================================
-- Duskwarden — reference schema
-- =============================================================================
-- This is a REFERENCE / DOCUMENTATION file describing the *existing* schema of
-- the live "Duskwarden Tools" Supabase project. The production database ALREADY
-- HAS these objects — do NOT run this against production.
--
-- Use it to:
--   • understand the data model the app is built against, or
--   • stand up a local Supabase (`supabase start`) with the same shape.
--
-- Identity model: there is no auth login. Every table is scoped by a device id
-- sent in the `x-device-id` request header and read by `get_device_id()`.
-- =============================================================================

create extension if not exists "uuid-ossp";

-- device identity read from the PostgREST request header -----------------------
create or replace function public.get_device_id()
returns text
language plpgsql
stable security definer
set search_path to 'public'
as $$
begin
  return coalesce(current_setting('request.headers', true)::json->>'x-device-id', '');
exception
  when others then return '';
end;
$$;

-- entry type -------------------------------------------------------------------
do $$ begin
  create type public.entry_type as enum ('creature', 'adventure_note');
exception when duplicate_object then null; end $$;

-- profiles ---------------------------------------------------------------------
create table if not exists public.profiles (
  id           uuid primary key,
  display_name text,
  created_at   timestamptz not null default now()
);

-- projects (campaigns / dungeons) ---------------------------------------------
create table if not exists public.projects (
  id          uuid primary key default uuid_generate_v4(),
  user_id     text not null,               -- device id
  name        text not null,
  description text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- entries (creatures + adventure notes) ---------------------------------------
create table if not exists public.entries (
  id          uuid primary key default uuid_generate_v4(),
  user_id     text not null,               -- device id
  project_id  uuid references public.projects(id),   -- nullable: loose = library
  type        public.entry_type not null,
  title       text not null,
  tags        text[] default '{}',
  source_text text,                         -- pasted stat block
  parsed_json jsonb,                        -- neutral reading (name/ac/hp/…)
  output_json jsonb,                        -- converted stat block
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists entries_user_idx    on public.entries (user_id);
create index if not exists entries_project_idx on public.entries (project_id);
create index if not exists entries_type_idx    on public.entries (type);

-- version history + device reference (present in prod; not used by this app) ---
create table if not exists public.entry_versions (
  id            uuid primary key default uuid_generate_v4(),
  entry_id      uuid not null references public.entries(id),
  user_id       text not null,
  snapshot_json jsonb not null,
  created_at    timestamptz not null default now()
);

create table if not exists public.device_reference_statblocks (
  id         uuid primary key default uuid_generate_v4(),
  device_id  text not null,
  entry_id   uuid references public.entries(id),
  raw_text   text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- =============================================================================
-- Row Level Security — every row belongs to one device id
-- =============================================================================
alter table public.profiles                    enable row level security;
alter table public.projects                    enable row level security;
alter table public.entries                     enable row level security;
alter table public.entry_versions              enable row level security;
alter table public.device_reference_statblocks enable row level security;

-- projects
create policy "Users can view own projects"   on public.projects for select using (user_id = get_device_id());
create policy "Users can create own projects" on public.projects for insert with check (user_id = get_device_id());
create policy "Users can update own projects" on public.projects for update using (user_id = get_device_id());
create policy "Users can delete own projects" on public.projects for delete using (user_id = get_device_id());

-- entries
create policy "Users can view own entries"    on public.entries for select using (user_id = get_device_id());
create policy "Users can create own entries"  on public.entries for insert with check (user_id = get_device_id());
create policy "Users can update own entries"  on public.entries for update using (user_id = get_device_id());
create policy "Users can delete own entries"  on public.entries for delete using (user_id = get_device_id());

-- (profiles / entry_versions / device_reference_statblocks carry equivalent
--  own-row policies in production.)
