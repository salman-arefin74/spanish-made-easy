import { createClient, type SupabaseClient } from "@supabase/supabase-js"

export type SupabaseConfig = {
  url: string
  anonKey: string
}

export function readSupabaseConfig(): SupabaseConfig | null {
  const url = import.meta.env.VITE_SUPABASE_URL?.trim()
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim()
  if (!url || !anonKey) return null
  return { url, anonKey }
}

export function turnstileSiteKey(): string | null {
  const siteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY?.trim()
  return siteKey || null
}

let client: SupabaseClient | null = null

export function getSupabase(): SupabaseClient | null {
  const config = readSupabaseConfig()
  if (!config) return null
  if (!client) {
    client = createClient(config.url, config.anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
      },
    })
  }
  return client
}
