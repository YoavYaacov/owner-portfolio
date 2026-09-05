import { Navigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import LoadingScreen from './LoadingScreen'
import ConfigurationError from './ConfigurationError'

/**
 * Used for both "/" and the catch-all "*" route.
 *
 * Deliberately does NOT navigate until `phase` leaves 'loading'. This
 * matters specifically for the password-recovery flow (ADR-018): Supabase's
 * recovery email link lands with auth tokens appended to the URL hash,
 * which HashRouter also uses for routing. Navigating away immediately
 * (before Supabase has had a chance to parse those tokens out of the URL)
 * would destroy the recovery session before it's ever established. Because
 * `phase` only leaves 'loading' after supabase-js's own URL-detection has
 * resolved, waiting for it here is what makes the reset-password link work
 * reliably under HashRouter.
 */
export default function RootRedirect() {
  const { phase, configured, recoveryPending } = useAuth()

  if (!configured) return <ConfigurationError />
  if (phase === 'loading') return <LoadingScreen />
  if (recoveryPending) return <Navigate to="/reset-password" replace />
  if (phase === 'authenticated') return <Navigate to="/dashboard" replace />
  return <Navigate to="/login" replace />
}
