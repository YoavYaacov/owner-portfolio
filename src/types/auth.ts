// Mirrors public.profiles (supabase/migrations/20260728090200_profiles.sql).
// Kept as a small hand-written type for Phase 2; will be replaced/merged
// with generated types once `supabase gen types` is wired into the project
// (noted as deferred in the Master Project Document).
export interface Profile {
  id: string
  display_name: string
  role: 'owner' | 'admin' | 'viewer' | 'family_member'
  created_at: string
  updated_at: string
}

export type AuthPhase = 'loading' | 'authenticated' | 'unauthenticated'
