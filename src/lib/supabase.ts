import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { config } from './config'
import { getDeviceId } from './device'

/**
 * A single Supabase client, configured to send the device identity on every
 * request. The DB's RLS reads this header via `get_device_id()`.
 *
 * In demo mode we never construct a real client (the mock data layer is used
 * instead), so this is created lazily and only when needed.
 */
let client: SupabaseClient | null = null

export function getSupabase(): SupabaseClient {
  if (config.isDemo) {
    throw new Error(
      'Supabase client requested while in demo mode. This is a bug — the ' +
        'data layer should route to the mock instead.',
    )
  }
  if (!client) {
    client = createClient(config.supabaseUrl, config.supabaseAnonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: {
        headers: { 'x-device-id': getDeviceId() },
      },
    })
  }
  return client
}
