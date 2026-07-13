/**
 * Local preferences for library backup / recovery UX.
 * These are advisory only — they do not affect RLS or ownership.
 */

const MARK_BACKUP_ACK_KEY = 'duskwarden.mark_backup_acked'
const LAST_EXPORT_COUNT_KEY = 'duskwarden.last_export_creature_count'

const NUDGE_THRESHOLD = 5

function readNumber(key: string): number | null {
  if (typeof localStorage === 'undefined') return null
  const raw = localStorage.getItem(key)
  if (raw === null || raw === '') return null
  const n = Number(raw)
  return Number.isFinite(n) ? n : null
}

export function hasAckedMarkBackup(): boolean {
  if (typeof localStorage === 'undefined') return true
  return localStorage.getItem(MARK_BACKUP_ACK_KEY) === '1'
}

export function ackMarkBackup(): void {
  if (typeof localStorage === 'undefined') return
  localStorage.setItem(MARK_BACKUP_ACK_KEY, '1')
}

export function recordLibraryExport(creatureCount: number): void {
  if (typeof localStorage === 'undefined') return
  localStorage.setItem(LAST_EXPORT_COUNT_KEY, String(Math.max(0, creatureCount)))
}

/** Soft nudge when the library has grown by at least 5 since last export (or never exported and ≥5). */
export function shouldNudgeExport(currentCount: number): boolean {
  if (currentCount < NUDGE_THRESHOLD) return false
  const last = readNumber(LAST_EXPORT_COUNT_KEY)
  if (last === null) return true
  return currentCount - last >= NUDGE_THRESHOLD
}

export function showIdentityModal(): void {
  window.dispatchEvent(new CustomEvent('duskwarden-show-identity'))
}
