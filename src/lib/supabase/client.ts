import { createBrowserClient } from '@supabase/ssr';
import { requirePublicSupabaseEnv } from '@/lib/env';

export function createClient() {
  const env = requirePublicSupabaseEnv('creating the browser Supabase client');

  return createBrowserClient(
    env.url,
    env.anonKey
  );
}
