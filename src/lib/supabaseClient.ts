import { createClient, type SupabaseClient } from '@supabase/supabase-js'

// Both values below are meant to be public (shipped to the browser) — see
// .env.example. The service role key must never appear in frontend code.
export const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined
export const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey)

// `supabase` is null when the app is misconfigured (missing env vars) rather
// than throwing at import time — this lets the app render a clear Hebrew
// error screen (Master Prompt §23) instead of a blank white page.
export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(supabaseUrl as string, supabaseAnonKey as string, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null

export const functionsUrl = supabaseUrl ? `${supabaseUrl}/functions/v1` : undefined
