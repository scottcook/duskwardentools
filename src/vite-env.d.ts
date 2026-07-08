/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string
  readonly VITE_SUPABASE_ANON_KEY?: string
  readonly VITE_DEMO?: string
  readonly VITE_FORMSPREE_NEWSLETTER_ID?: string
  /** @deprecated Use VITE_FORMSPREE_NEWSLETTER_ID */
  readonly VITE_FORMSPREE_ID?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
