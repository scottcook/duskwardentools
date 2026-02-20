/**
 * Storage layer for Duskwarden Tools.
 *
 * Uses Supabase as the primary store. Falls back to localStorage
 * when the Supabase call fails (e.g. offline or during SSR).
 *
 * No auth is required – the anon key has full table access via
 * migration 00002 (RLS disabled, anon role granted).
 */

import { createClient } from '@supabase/supabase-js';
import type { Entry, Project } from '@/types';

// ─────────────────────────────────────────────────────────────
// Supabase client (anon, no auth needed)
// ─────────────────────────────────────────────────────────────
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// A stable, browser-scoped device ID used as user_id for all records.
function getDeviceId(): string {
  if (typeof window === 'undefined') return 'server';
  let id = localStorage.getItem('dw_device_id');
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem('dw_device_id', id);
  }
  return id;
}

// ─────────────────────────────────────────────────────────────
// LocalStorage fallback helpers
// ─────────────────────────────────────────────────────────────
const LS_ENTRIES = 'duskwarden_entries';
const LS_PROJECTS = 'duskwarden_projects';

function lsGet<T>(key: string): T[] {
  if (typeof window === 'undefined') return [];
  try { return JSON.parse(localStorage.getItem(key) || '[]'); }
  catch { return []; }
}

function lsSet<T>(key: string, data: T[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(key, JSON.stringify(data));
}

// ─────────────────────────────────────────────────────────────
// Entries
// ─────────────────────────────────────────────────────────────
export async function getEntries(): Promise<Entry[]> {
  const { data, error } = await supabase
    .from('entries')
    .select('*')
    .order('updated_at', { ascending: false });

  if (error) {
    console.warn('Supabase getEntries failed, using localStorage:', error.message);
    return lsGet<Entry>(LS_ENTRIES);
  }
  return data ?? [];
}

export async function getEntry(id: string): Promise<Entry | undefined> {
  const { data, error } = await supabase
    .from('entries')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    return lsGet<Entry>(LS_ENTRIES).find(e => e.id === id);
  }
  return data ?? undefined;
}

export async function saveEntry(
  entry: Omit<Entry, 'id' | 'created_at' | 'updated_at' | 'user_id'>
): Promise<Entry> {
  const now = new Date().toISOString();
  const newEntry: Entry = {
    ...entry,
    id: crypto.randomUUID(),
    user_id: getDeviceId(),
    created_at: now,
    updated_at: now,
  };

  const { data, error } = await supabase
    .from('entries')
    .insert(newEntry)
    .select()
    .single();

  if (error) {
    console.warn('Supabase saveEntry failed, using localStorage:', error.message);
    const entries = lsGet<Entry>(LS_ENTRIES);
    entries.push(newEntry);
    lsSet(LS_ENTRIES, entries);
    return newEntry;
  }
  return data;
}

export async function updateEntry(
  id: string,
  updates: Partial<Omit<Entry, 'id' | 'created_at' | 'user_id'>>
): Promise<Entry | undefined> {
  const payload = { ...updates, updated_at: new Date().toISOString() };

  const { data, error } = await supabase
    .from('entries')
    .update(payload)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    const entries = lsGet<Entry>(LS_ENTRIES);
    const idx = entries.findIndex(e => e.id === id);
    if (idx === -1) return undefined;
    entries[idx] = { ...entries[idx], ...payload };
    lsSet(LS_ENTRIES, entries);
    return entries[idx];
  }
  return data ?? undefined;
}

export async function deleteEntry(id: string): Promise<boolean> {
  const { error } = await supabase.from('entries').delete().eq('id', id);

  if (error) {
    const entries = lsGet<Entry>(LS_ENTRIES);
    const next = entries.filter(e => e.id !== id);
    if (next.length === entries.length) return false;
    lsSet(LS_ENTRIES, next);
    return true;
  }
  return true;
}

// ─────────────────────────────────────────────────────────────
// Projects
// ─────────────────────────────────────────────────────────────
export async function getProjects(): Promise<Project[]> {
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .order('updated_at', { ascending: false });

  if (error) {
    console.warn('Supabase getProjects failed, using localStorage:', error.message);
    return lsGet<Project>(LS_PROJECTS);
  }
  return data ?? [];
}

export async function getProject(id: string): Promise<Project | undefined> {
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    return lsGet<Project>(LS_PROJECTS).find(p => p.id === id);
  }
  return data ?? undefined;
}

export async function saveProject(
  project: Omit<Project, 'id' | 'created_at' | 'updated_at' | 'user_id'>
): Promise<Project> {
  const now = new Date().toISOString();
  const newProject: Project = {
    ...project,
    id: crypto.randomUUID(),
    user_id: getDeviceId(),
    created_at: now,
    updated_at: now,
  };

  const { data, error } = await supabase
    .from('projects')
    .insert(newProject)
    .select()
    .single();

  if (error) {
    console.warn('Supabase saveProject failed, using localStorage:', error.message);
    const projects = lsGet<Project>(LS_PROJECTS);
    projects.push(newProject);
    lsSet(LS_PROJECTS, projects);
    return newProject;
  }
  return data;
}

export async function updateProject(
  id: string,
  updates: Partial<Omit<Project, 'id' | 'created_at' | 'user_id'>>
): Promise<Project | undefined> {
  const payload = { ...updates, updated_at: new Date().toISOString() };

  const { data, error } = await supabase
    .from('projects')
    .update(payload)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    const projects = lsGet<Project>(LS_PROJECTS);
    const idx = projects.findIndex(p => p.id === id);
    if (idx === -1) return undefined;
    projects[idx] = { ...projects[idx], ...payload };
    lsSet(LS_PROJECTS, projects);
    return projects[idx];
  }
  return data ?? undefined;
}

export async function deleteProject(id: string): Promise<boolean> {
  const { error } = await supabase.from('projects').delete().eq('id', id);

  if (error) {
    const projects = lsGet<Project>(LS_PROJECTS);
    const next = projects.filter(p => p.id !== id);
    if (next.length === projects.length) return false;
    lsSet(LS_PROJECTS, next);
    // disassociate entries from deleted project in LS
    const entries = lsGet<Entry>(LS_ENTRIES);
    lsSet(LS_ENTRIES, entries.map(e => e.project_id === id ? { ...e, project_id: null } : e));
    return true;
  }

  // also null-out project_id on entries in Supabase
  await supabase.from('entries').update({ project_id: null }).eq('project_id', id);
  return true;
}

// ─────────────────────────────────────────────────────────────
// Dashboard helpers
// ─────────────────────────────────────────────────────────────
export async function getEntriesCount(): Promise<{ creatures: number; notes: number; projects: number }> {
  const [creaturesRes, notesRes, projectsRes] = await Promise.all([
    supabase.from('entries').select('id', { count: 'exact', head: true }).eq('type', 'creature'),
    supabase.from('entries').select('id', { count: 'exact', head: true }).eq('type', 'adventure_note'),
    supabase.from('projects').select('id', { count: 'exact', head: true }),
  ]);

  if (creaturesRes.error || notesRes.error || projectsRes.error) {
    const entries = lsGet<Entry>(LS_ENTRIES);
    const projects = lsGet<Project>(LS_PROJECTS);
    return {
      creatures: entries.filter(e => e.type === 'creature').length,
      notes: entries.filter(e => e.type === 'adventure_note').length,
      projects: projects.length,
    };
  }

  return {
    creatures: creaturesRes.count ?? 0,
    notes: notesRes.count ?? 0,
    projects: projectsRes.count ?? 0,
  };
}

export async function getRecentEntries(limit = 5): Promise<Entry[]> {
  const { data, error } = await supabase
    .from('entries')
    .select('*')
    .order('updated_at', { ascending: false })
    .limit(limit);

  if (error) {
    return lsGet<Entry>(LS_ENTRIES)
      .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
      .slice(0, limit);
  }
  return data ?? [];
}

// ─────────────────────────────────────────────────────────────
// Reference Statblocks (Shadowdark verify mode)
//
// Reference text is private per-device. It is stored in Supabase
// only scoped to the device_id so it survives page refreshes, but
// is never exposed publicly (no RLS needed — the device_id acts
// as a natural partition key). Falls back to localStorage silently.
// ─────────────────────────────────────────────────────────────
const LS_REFS = 'dw_ref_statblocks';

interface RefStatblock {
  device_id: string;
  entry_id: string | null;
  raw_text: string;
}

function lsGetRef(entryId: string | null): string {
  if (typeof window === 'undefined') return '';
  try {
    const all: RefStatblock[] = JSON.parse(localStorage.getItem(LS_REFS) || '[]');
    return all.find(r => r.entry_id === entryId)?.raw_text ?? '';
  } catch { return ''; }
}

function lsSetRef(entryId: string | null, rawText: string): void {
  if (typeof window === 'undefined') return;
  try {
    const all: RefStatblock[] = JSON.parse(localStorage.getItem(LS_REFS) || '[]');
    const idx = all.findIndex(r => r.entry_id === entryId);
    const rec = { device_id: getDeviceId(), entry_id: entryId, raw_text: rawText };
    if (idx === -1) all.push(rec); else all[idx] = rec;
    localStorage.setItem(LS_REFS, JSON.stringify(all));
  } catch { /* silent */ }
}

/**
 * Load the reference stat block for a given entry (or the active draft when
 * entryId is null). Returns empty string if none stored.
 */
export async function getReferenceStatblock(entryId: string | null): Promise<string> {
  const deviceId = getDeviceId();
  const query = supabase
    .from('device_reference_statblocks')
    .select('raw_text')
    .eq('device_id', deviceId);

  const { data, error } = await (
    entryId ? query.eq('entry_id', entryId) : query.is('entry_id', null)
  ).maybeSingle();

  if (error) return lsGetRef(entryId);
  return data?.raw_text ?? '';
}

/**
 * Upsert the reference stat block for a given entry (or draft).
 * No-ops silently on error (falls back to localStorage).
 */
export async function saveReferenceStatblock(
  entryId: string | null,
  rawText: string
): Promise<void> {
  const deviceId = getDeviceId();
  lsSetRef(entryId, rawText); // Always persist locally first

  const { error } = await supabase
    .from('device_reference_statblocks')
    .upsert(
      { device_id: deviceId, entry_id: entryId, raw_text: rawText },
      { onConflict: 'device_id,entry_id', ignoreDuplicates: false }
    );

  if (error) {
    console.warn('saveReferenceStatblock remote failed (localStorage used):', error.message);
  }
}

/**
 * Delete the reference stat block for a given entry (e.g. when entry is deleted).
 */
export async function deleteReferenceStatblock(entryId: string | null): Promise<void> {
  lsSetRef(entryId, '');
  const deviceId = getDeviceId();
  const query = supabase
    .from('device_reference_statblocks')
    .delete()
    .eq('device_id', deviceId);
  await (entryId ? query.eq('entry_id', entryId) : query.is('entry_id', null));
}
