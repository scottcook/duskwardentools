import { describe, expect, it, vi } from 'vitest'
import { buildLibraryExport } from './libraryExport'
import { importLibraryExport, parseLibraryExport } from './libraryImport'
import type { DataApi } from './api'
import type { Entry, Project } from './types'

const sampleProject: Project = {
  id: 'proj-old-1',
  user_id: 'device-a',
  name: 'Barrow Vault',
  description: 'Cold tombs',
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
}

const sampleCreature: Entry = {
  id: 'entry-old-1',
  user_id: 'device-a',
  project_id: 'proj-old-1',
  type: 'creature',
  title: 'Ghoul',
  tags: ['undead'],
  source_text: 'GHOUL…',
  parsed_json: { name: 'Ghoul', hd: 2 },
  output_json: { system: 'ose', text: 'AC 7' },
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
}

describe('parseLibraryExport', () => {
  it('accepts a buildLibraryExport payload', () => {
    const built = buildLibraryExport([sampleProject], [sampleCreature])
    const parsed = parseLibraryExport(built)
    expect(parsed.format).toBe('duskwarden-library')
    expect(parsed.version).toBe(1)
    expect(parsed.projects).toHaveLength(1)
    expect(parsed.creatures).toHaveLength(1)
    expect(parsed.projects[0]).not.toHaveProperty('user_id')
    expect(parsed.creatures[0]).not.toHaveProperty('user_id')
  })

  it('rejects wrong format', () => {
    expect(() => parseLibraryExport({ format: 'other', version: 1, projects: [], creatures: [] })).toThrow(
      /Unrecognized file format/,
    )
  })

  it('rejects unsupported version', () => {
    expect(() =>
      parseLibraryExport({ format: 'duskwarden-library', version: 99, projects: [], creatures: [] }),
    ).toThrow(/Unsupported library export version/)
  })

  it('rejects missing arrays', () => {
    expect(() => parseLibraryExport({ format: 'duskwarden-library', version: 1 })).toThrow(
      /missing projects or creatures/,
    )
  })
})

describe('importLibraryExport', () => {
  it('creates new rows and remaps project ids without reusing export ids', async () => {
    const createdProjectIds: string[] = []
    const createdCreatures: Array<{ title: string; project_id: string | null }> = []

    const api = {
      isDemo: true,
      createProject: vi.fn(async (input: { name: string; description?: string }) => {
        const id = `new-proj-${createdProjectIds.length + 1}`
        createdProjectIds.push(id)
        return {
          id,
          user_id: 'current-device',
          name: input.name,
          description: input.description ?? null,
          created_at: '2026-07-13T00:00:00.000Z',
          updated_at: '2026-07-13T00:00:00.000Z',
        }
      }),
      createCreature: vi.fn(async (input: { title: string; project_id?: string | null }) => {
        createdCreatures.push({
          title: input.title,
          project_id: input.project_id ?? null,
        })
        return {
          id: `new-entry-${createdCreatures.length}`,
          user_id: 'current-device',
          project_id: input.project_id ?? null,
          type: 'creature' as const,
          title: input.title,
          tags: [],
          source_text: null,
          parsed_json: null,
          output_json: null,
          created_at: '2026-07-13T00:00:00.000Z',
          updated_at: '2026-07-13T00:00:00.000Z',
        }
      }),
    } as unknown as DataApi

    const payload = parseLibraryExport(buildLibraryExport([sampleProject], [sampleCreature]))
    const result = await importLibraryExport(api, payload)

    expect(result.projectsCreated).toBe(1)
    expect(result.creaturesCreated).toBe(1)
    expect(createdProjectIds[0]).toBe('new-proj-1')
    expect(createdProjectIds[0]).not.toBe('proj-old-1')
    expect(createdCreatures[0].title).toBe('Ghoul')
    expect(createdCreatures[0].project_id).toBe('new-proj-1')
    expect(api.createCreature).toHaveBeenCalledWith(
      expect.not.objectContaining({ id: 'entry-old-1' }),
    )
  })

  it('imports unassigned creatures with null project_id', async () => {
    const api = {
      isDemo: true,
      createProject: vi.fn(),
      createCreature: vi.fn(async (input: { title: string; project_id?: string | null }) => ({
        id: 'new-1',
        user_id: 'current',
        project_id: input.project_id ?? null,
        type: 'creature' as const,
        title: input.title,
        tags: [],
        source_text: null,
        parsed_json: null,
        output_json: null,
        created_at: '2026-07-13T00:00:00.000Z',
        updated_at: '2026-07-13T00:00:00.000Z',
      })),
    } as unknown as DataApi

    const orphan = { ...sampleCreature, project_id: null, id: 'orphan' }
    const payload = parseLibraryExport(buildLibraryExport([], [orphan]))
    await importLibraryExport(api, payload)
    expect(api.createProject).not.toHaveBeenCalled()
    expect(api.createCreature).toHaveBeenCalledWith(expect.objectContaining({ project_id: null }))
  })
})
