/**
 * Runtime configuration.
 *
 * Duskwarden talks to the *existing* Supabase project (`Duskwarden Tools`).
 * Its security model is device-scoped: there is no login. Row Level Security
 * on every table compares `user_id` / `device_id` against `get_device_id()`,
 * which reads the `x-device-id` HTTP header. See `device.ts` + `supabase.ts`.
 *
 * If the Supabase env vars are absent (or VITE_DEMO=true), the app falls back
 * to a localStorage-backed DEMO data layer so it still runs offline / in CI.
 */

const url = import.meta.env.VITE_SUPABASE_URL?.trim() || ''
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim() || ''
const forceDemo = import.meta.env.VITE_DEMO?.trim() === 'true'

export const config = {
  supabaseUrl: url,
  supabaseAnonKey: anonKey,
  /** True when we should use the localStorage mock instead of Supabase. */
  isDemo: forceDemo || !url || !anonKey,
} as const

export const IS_DEMO = config.isDemo
