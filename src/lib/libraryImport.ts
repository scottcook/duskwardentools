import type { DataApi } from './api'
import { LIBRARY_EXPORT_VERSION } from './libraryExport'
import type { Entry, NewCreature, ParsedCreature, OutputCreature, Project } from './types'

export interface LibraryExportPayload {
  app: string
  format: string
  version: number
  exportedAt?: string
  counts?: { projects: number; creatures: number }
  projects: Array<Partial<Project> & { id?: string; name?: string; description?: string | null }>
  creatures: Array<
    Partial<Entry> & {
      id?: string
      title?: string
      project_id?: string | null
      tags?: string[]
      source_text?: string | null
      parsed_json?: ParsedCreature | null
      output_json?: OutputCreature | null
    }
  >
}

export interface LibraryImportResult {
  projectsCreated: number
  creaturesCreated: number
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/**
 * Validate a duskwarden-library JSON document.
 * Throws Error with a user-facing message on failure.
 */
export function parseLibraryExport(raw: unknown): LibraryExportPayload {
  if (!isRecord(raw)) {
    throw new Error('That file is not a valid Duskwarden library export.')
  }
  if (raw.format !== 'duskwarden-library') {
    throw new Error('Unrecognized file format — expect a Duskwarden library export.')
  }
  if (raw.version !== LIBRARY_EXPORT_VERSION) {
    throw new Error(
      `Unsupported library export version (${String(raw.version)}). This app reads version ${LIBRARY_EXPORT_VERSION}.`,
    )
  }
  if (!Array.isArray(raw.projects) || !Array.isArray(raw.creatures)) {
    throw new Error('Library export is missing projects or creatures arrays.')
  }

  return {
    app: typeof raw.app === 'string' ? raw.app : 'Duskwarden',
    format: 'duskwarden-library',
    version: LIBRARY_EXPORT_VERSION,
    exportedAt: typeof raw.exportedAt === 'string' ? raw.exportedAt : undefined,
    counts: isRecord(raw.counts)
      ? {
          projects: Number(raw.counts.projects) || 0,
          creatures: Number(raw.counts.creatures) || 0,
        }
      : undefined,
    projects: raw.projects as LibraryExportPayload['projects'],
    creatures: raw.creatures as LibraryExportPayload['creatures'],
  }
}

/**
 * Import a validated export under the current device.
 * Always creates new rows (new UUIDs); remaps project_id via old→new map.
 * Never overwrites existing library entries.
 */
export async function importLibraryExport(
  api: DataApi,
  payload: LibraryExportPayload,
): Promise<LibraryImportResult> {
  const projectIdMap = new Map<string, string>()
  let projectsCreated = 0

  for (const project of payload.projects) {
    const name = String(project.name ?? '').trim() || 'Imported project'
    const description =
      project.description === undefined || project.description === null
        ? undefined
        : String(project.description)
    const created = await api.createProject({ name, description })
    projectsCreated += 1
    if (project.id) {
      projectIdMap.set(String(project.id), created.id)
    }
  }

  let creaturesCreated = 0
  for (const creature of payload.creatures) {
    const oldProjectId = creature.project_id ?? null
    const remapped =
      oldProjectId && projectIdMap.has(String(oldProjectId))
        ? projectIdMap.get(String(oldProjectId))!
        : null

    const input: NewCreature = {
      title: String(creature.title ?? '').trim() || 'Nameless Thing',
      project_id: remapped,
      tags: Array.isArray(creature.tags) ? creature.tags.map(String) : [],
      source_text: creature.source_text ?? null,
      parsed_json: (creature.parsed_json as ParsedCreature | null | undefined) ?? null,
      output_json: (creature.output_json as OutputCreature | null | undefined) ?? null,
    }
    await api.createCreature(input)
    creaturesCreated += 1
  }

  return {
    projectsCreated,
    creaturesCreated,
  }
}
