import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient'
import type { AuthPhase, Profile } from '../types/auth'

interface AuthContextValue {
  configured: boolean
  session: Session | null
  profile: Profile | null
  phase: AuthPhase
  profileError: string | null
  /**
   * True once Supabase has detected a password-recovery link in the URL
   * (the official Supabase pattern: listen for the `PASSWORD_RECOVERY`
   * auth event — see ADR-018 for why this, rather than the URL path alone,
   * is what routes the user to /reset-password under HashRouter).
   */
  recoveryPending: boolean
  clearRecoveryPending: () => void
  signOut: () => Promise<void>
  applySession: (tokens: { access_token: string; refresh_token: string }) => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [profileError, setProfileError] = useState<string | null>(null)
  const [recoveryPending, setRecoveryPending] = useState(false)

  // One subscription for the whole app (ADR-019). supabase-js itself
  // handles token refresh (autoRefreshToken) and cross-tab sync
  // (persistSession -> localStorage), so no custom refresh logic lives here.
  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
      setLoading(false)
      return
    }

    let active = true

    supabase.auth.getSession().then(({ data }) => {
      if (!active) return
      setSession(data.session)
      setLoading(false)
    })

    const { data: subscription } = supabase.auth.onAuthStateChange((event, newSession) => {
      setSession(newSession)
      if (event === 'PASSWORD_RECOVERY') {
        setRecoveryPending(true)
      }
    })

    return () => {
      active = false
      subscription.subscription.unsubscribe()
    }
  }, [])

  // Fetch the caller's own profile row whenever the session changes. This is
  // read via `profiles_select_own` RLS — never assume role/display_name from
  // client-held state alone; the server-side policy is the real gate.
  useEffect(() => {
    if (!supabase || !session) {
      setProfile(null)
      setProfileError(null)
      return
    }

    let active = true
    setProfileError(null)

    supabase
      .from('profiles')
      .select('id, display_name, role, created_at, updated_at')
      .eq('id', session.user.id)
      .single()
      .then(({ data, error }) => {
        if (!active) return
        if (error) {
          setProfile(null)
          setProfileError('לא הצלחנו לטעון את פרטי המשתמש. נסה/י לרענן את הדף.')
        } else {
          setProfile(data as Profile)
        }
      })

    return () => {
      active = false
    }
  }, [session])

  const phase: AuthPhase = loading ? 'loading' : session ? 'authenticated' : 'unauthenticated'

  const signOut = async () => {
    if (!supabase) return
    await supabase.auth.signOut()
  }

  const applySession = async (tokens: { access_token: string; refresh_token: string }) => {
    if (!supabase) {
      throw new Error('המערכת אינה מוגדרת כראוי.')
    }
    const { error } = await supabase.auth.setSession(tokens)
    if (error) throw error
  }

  const clearRecoveryPending = () => setRecoveryPending(false)

  const value = useMemo<AuthContextValue>(
    () => ({
      configured: isSupabaseConfigured,
      session,
      profile,
      phase,
      profileError,
      recoveryPending,
      clearRecoveryPending,
      signOut,
      applySession,
    }),
    [session, profile, phase, profileError, recoveryPending]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth must be used within an <AuthProvider>')
  }
  return ctx
}
