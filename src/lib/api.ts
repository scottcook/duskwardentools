/**
 * Data layer. One interface (`DataApi`), two implementations:
 *
 *   • SupabaseApi — talks to the real `Duskwarden Tools` Postgres via PostgREST,
 *     device-scoped by the `x-device-id` header (RLS). Used in production.
 *   • MockApi     — localStorage, seeded from mockData. Used in demo mode so the
 *     app runs with no network / no credentials.
 *
 * The active implementation is chosen once, at module load, from `config`.
 */
import { config } from './config'
import { getSupabase } from './supabase'
import { getDeviceId } from './device'
import { searchHaystack, creatureName } from './creatureModel'
import type { Entry, Project, ProjectWithCount, NewProject, NewCreature } from './types'
import { freshSeedEntries, freshSeedProjects } from './mockData'

export interface ListCreaturesOpts {
  /** undefined = all; null = only unassigned (no project); string = that project. */
  projectId?: string | null
  search?: string
}

export interface DataApi {
  isDemo: boolean

  listProjects(): Promise<ProjectWithCount[]>
  getProject(id: string): Promise<Project | null>
  createProject(input: NewProject): Promise<Project>
  updateProject(id: string, patch: Partial<NewProject>): Promise<Project>
  deleteProject(id: string): Promise<void>

  listCreatures(opts?: ListCreaturesOpts): Promise<Entry[]>
  getCreature(id: string): Promise<Entry | null>
  createCreature(input: NewCreature): Promise<Entry>
  assignCreatureToProject(entryId: string, projectId: string | null): Promise<Entry>
  deleteCreature(entryId: string): Promise<void>
}

function matchesSearch(e: Entry, search?: string): boolean {
  if (!search) return true
  const q = search.trim().toLowerCase()
  if (!q) return true
  return q.split(/\s+/).every((term) => searchHaystack(e).includes(term))
}

function byName(a: Entry, b: Entry): number {
  return creatureName(a).localeCompare(creatureName(b))
}

/* -------------------------------------------------------------------------- */
/* Supabase implementation                                                    */
/* -------------------------------------------------------------------------- */
class SupabaseApi implements DataApi {
  isDemo = false

  async listProjects(): Promise<ProjectWithCount[]> {
    const sb = getSupabase()
    const [{ data: projects, error: pErr }, { data: counts, error: cErr }] = await Promise.all([
      sb.from('projects').select('*').order('updated_at', { ascending: false }),
      sb.from('entries').select('project_id').eq('type', 'creature'),
    ])
    if (pErr) throw pErr
    if (cErr) throw cErr
    const tally = new Map<string, number>()
    for (const row of counts ?? []) {
      const pid = (row as { project_id: string | null }).project_id
      if (pid) tally.set(pid, (tally.get(pid) ?? 0) + 1)
    }
    return (projects ?? []).map((p) => ({
      ...(p as Project),
      creature_count: tally.get((p as Project).id) ?? 0,
    }))
  }

  async getProject(id: string): Promise<Project | null> {
    const sb = getSupabase()
    const { data, error } = await sb.from('projects').select('*').eq('id', id).maybeSingle()
    if (error) throw error
    return (data as Project) ?? null
  }

  async createProject(input: NewProject): Promise<Project> {
    const sb = getSupabase()
    const { data, error } = await sb
      .from('projects')
      .insert({
        user_id: getDeviceId(),
        name: input.name.trim(),
        description: input.description?.trim() || null,
      })
      .select('*')
      .single()
    if (error) throw error
    return data as Project
  }

  async updateProject(id: string, patch: Partial<NewProject>): Promise<Project> {
    const sb = getSupabase()
    const update: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if (patch.name !== undefined) update.name = patch.name.trim()
    if (patch.description !== undefined) update.description = patch.description?.trim() || null
    const { data, error } = await sb.from('projects').update(update).eq('id', id).select('*').single()
    if (error) throw error
    return data as Project
  }

  async deleteProject(id: string): Promise<void> {
    const sb = getSupabase()
    // Return the project's creatures to the library rather than destroying them.
    const { error: unassignErr } = await sb
      .from('entries')
      .update({ project_id: null, updated_at: new Date().toISOString() })
      .eq('project_id', id)
    if (unassignErr) throw unassignErr
    const { error } = await sb.from('projects').delete().eq('id', id)
    if (error) throw error
  }

  async listCreatures(opts: ListCreaturesOpts = {}): Promise<Entry[]> {
    const sb = getSupabase()
    let query = sb.from('entries').select('*').eq('type', 'creature')
    if (opts.projectId === null) query = query.is('project_id', null)
    else if (typeof opts.projectId === 'string') query = query.eq('project_id', opts.projectId)
    query = query.order('updated_at', { ascending: false })
    const { data, error } = await query
    if (error) throw error
    // Search across parsed_json is done client-side for accuracy.
    return (data as Entry[]).filter((e) => matchesSearch(e, opts.search))
  }

  async getCreature(id: string): Promise<Entry | null> {
    const sb = getSupabase()
    const { data, error } = await sb
      .from('entries')
      .select('*')
      .eq('id', id)
      .eq('type', 'creature')
      .maybeSingle()
    if (error) throw error
    return (data as Entry) ?? null
  }

  async createCreature(input: NewCreature): Promise<Entry> {
    const sb = getSupabase()
    const { data, error } = await sb
      .from('entries')
      .insert({
        user_id: getDeviceId(),
        type: 'creature',
        title: input.title.trim() || 'Nameless Thing',
        project_id: input.project_id ?? null,
        tags: input.tags ?? [],
        source_text: input.source_text ?? null,
        parsed_json: input.parsed_json ?? null,
        output_json: input.output_json ?? null,
      })
      .select('*')
      .single()
    if (error) throw error
    return data as Entry
  }

  async assignCreatureToProject(entryId: string, projectId: string | null): Promise<Entry> {
    const sb = getSupabase()
    const { data, error } = await sb
      .from('entries')
      .update({ project_id: projectId, updated_at: new Date().toISOString() })
      .eq('id', entryId)
      .select('*')
      .single()
    if (error) throw error
    return data as Entry
  }

  async deleteCreature(entryId: string): Promise<void> {
    const sb = getSupabase()
    const { error } = await sb.from('entries').delete().eq('id', entryId)
    if (error) throw error
  }
}

/* -------------------------------------------------------------------------- */
/* Mock implementation (localStorage)                                         */
/* -------------------------------------------------------------------------- */
const LS_PROJECTS = 'duskwarden.demo.projects'
const LS_ENTRIES = 'duskwarden.demo.entries'

function uid(prefix: string): string {
  try {
    if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  } catch {
    /* ignore */
  }
  return prefix + '-' + Math.random().toString(36).slice(2) + Date.now().toString(36)
}

class MockApi implements DataApi {
  isDemo = true

  private load<T>(key: string, seed: () => T[]): T[] {
    try {
      const raw = localStorage.getItem(key)
      if (raw) return JSON.parse(raw) as T[]
    } catch {
      /* ignore corrupt storage */
    }
    const seeded = seed()
    localStorage.setItem(key, JSON.stringify(seeded))
    return seeded
  }
  private projects(): Project[] {
    return this.load(LS_PROJECTS, freshSeedProjects)
  }
  private entries(): Entry[] {
    return this.load(LS_ENTRIES, freshSeedEntries)
  }
  private saveProjects(p: Project[]) {
    localStorage.setItem(LS_PROJECTS, JSON.stringify(p))
  }
  private saveEntries(e: Entry[]) {
    localStorage.setItem(LS_ENTRIES, JSON.stringify(e))
  }
  private delay<T>(v: T): Promise<T> {
    return new Promise((r) => setTimeout(() => r(v), 120))
  }

  async listProjects(): Promise<ProjectWithCount[]> {
    const projects = this.projects()
    const entries = this.entries()
    const withCount = projects
      .map((p) => ({
        ...p,
        creature_count: entries.filter((e) => e.type === 'creature' && e.project_id === p.id).length,
      }))
      .sort((a, b) => (a.updated_at < b.updated_at ? 1 : -1))
    return this.delay(withCount)
  }

  async getProject(id: string): Promise<Project | null> {
    return this.delay(this.projects().find((p) => p.id === id) ?? null)
  }

  async createProject(input: NewProject): Promise<Project> {
    const now = new Date().toISOString()
    const project: Project = {
      id: uid('proj'),
      user_id: 'demo-device',
      name: input.name.trim(),
      description: input.description?.trim() || null,
      created_at: now,
      updated_at: now,
    }
    const all = this.projects()
    all.unshift(project)
    this.saveProjects(all)
    return this.delay(project)
  }

  async updateProject(id: string, patch: Partial<NewProject>): Promise<Project> {
    const all = this.projects()
    const idx = all.findIndex((p) => p.id === id)
    if (idx < 0) throw new Error('Project not found')
    const updated: Project = {
      ...all[idx],
      name: patch.name !== undefined ? patch.name.trim() : all[idx].name,
      description:
        patch.description !== undefined ? patch.description?.trim() || null : all[idx].description,
      updated_at: new Date().toISOString(),
    }
    all[idx] = updated
    this.saveProjects(all)
    return this.delay(updated)
  }

  async deleteProject(id: string): Promise<void> {
    this.saveProjects(this.projects().filter((p) => p.id !== id))
    const entries = this.entries().map((e) =>
      e.project_id === id ? { ...e, project_id: null } : e,
    )
    this.saveEntries(entries)
    return this.delay(undefined)
  }

  async listCreatures(opts: ListCreaturesOpts = {}): Promise<Entry[]> {
    let list = this.entries().filter((e) => e.type === 'creature')
    if (opts.projectId === null) list = list.filter((e) => e.project_id === null)
    else if (typeof opts.projectId === 'string')
      list = list.filter((e) => e.project_id === opts.projectId)
    list = list.filter((e) => matchesSearch(e, opts.search)).sort(byName)
    return this.delay(list)
  }

  async getCreature(id: string): Promise<Entry | null> {
    const entry = this.entries().find((candidate) => candidate.id === id && candidate.type === 'creature')
    return this.delay(entry ?? null)
  }

  async createCreature(input: NewCreature): Promise<Entry> {
    const now = new Date().toISOString()
    const entry: Entry = {
      id: uid('entry'),
      user_id: 'demo-device',
      project_id: input.project_id ?? null,
      type: 'creature',
      title: input.title.trim() || 'Nameless Thing',
      tags: input.tags ?? [],
      source_text: input.source_text ?? null,
      parsed_json: input.parsed_json ?? null,
      output_json: input.output_json ?? null,
      created_at: now,
      updated_at: now,
    }
    const all = this.entries()
    all.unshift(entry)
    this.saveEntries(all)
    return this.delay(entry)
  }

  async assignCreatureToProject(entryId: string, projectId: string | null): Promise<Entry> {
    const all = this.entries()
    const idx = all.findIndex((e) => e.id === entryId)
    if (idx < 0) throw new Error('Creature not found')
    all[idx] = { ...all[idx], project_id: projectId, updated_at: new Date().toISOString() }
    this.saveEntries(all)
    return this.delay(all[idx])
  }

  async deleteCreature(entryId: string): Promise<void> {
    this.saveEntries(this.entries().filter((e) => e.id !== entryId))
    return this.delay(undefined)
  }
}

export const api: DataApi = config.isDemo ? new MockApi() : new SupabaseApi()
