/**
 * Device identity.
 *
 * The Duskwarden database identifies users by a device id sent in the
 * `x-device-id` header (RLS: `get_device_id()`), NOT by an authenticated
 * session. We persist a stable id per browser in localStorage.
 *
 * Because the id lives in browser storage, a fresh browser starts with an
 * empty library — which is correct. Power users can move their existing data
 * across browsers by copying their device id (surfaced in the UI footer).
 */

const KEY = 'duskwarden.device_id'

function makeId(): string {
  // Prefer crypto.randomUUID where available; fall back for old engines.
  try {
    if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
      return crypto.randomUUID()
    }
  } catch {
    /* ignore */
  }
  return 'dw-' + Math.random().toString(36).slice(2) + Date.now().toString(36)
}

export function getDeviceId(): string {
  if (typeof localStorage === 'undefined') return 'server'
  let id = localStorage.getItem(KEY)
  if (!id) {
    id = makeId()
    localStorage.setItem(KEY, id)
  }
  return id
}

/** Replace the device id (e.g. to reclaim data created on another browser). */
export function setDeviceId(id: string): void {
  const clean = id.trim()
  if (!clean) return
  localStorage.setItem(KEY, clean)
}
