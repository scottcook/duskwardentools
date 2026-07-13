import type { Entry, Project } from './types'

export const LIBRARY_EXPORT_VERSION = 1

export function buildLibraryExport(
  projects: Project[],
  creatures: Entry[],
  exportedAt = new Date(),
) {
  return {
    app: 'Duskwarden',
    format: 'duskwarden-library',
    version: LIBRARY_EXPORT_VERSION,
    exportedAt: exportedAt.toISOString(),
    counts: {
      projects: projects.length,
      creatures: creatures.length,
    },
    projects: projects.map(({ user_id: _userId, ...project }) => project),
    creatures: creatures.map(({ user_id: _userId, ...creature }) => creature),
  }
}

export function downloadLibraryExport(projects: Project[], creatures: Entry[]): void {
  const now = new Date()
  const payload = buildLibraryExport(projects, creatures, now)
  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: 'application/json;charset=utf-8',
  })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `duskwarden-library-${now.toISOString().slice(0, 10)}.json`
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 2_000)
}

