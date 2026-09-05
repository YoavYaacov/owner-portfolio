import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { decidePublicOnlyRoute } from '../lib/routeGuard'
import LoadingScreen from './LoadingScreen'
import ConfigurationError from './ConfigurationError'

/**
 * Wraps login/forgot-password so an already-authenticated user is sent
 * straight to the dashboard instead of seeing the login form again.
 */
export default function PublicOnlyRoute() {
  const { phase, configured } = useAuth()

  if (!configured) return <ConfigurationError />

  const decision = decidePublicOnlyRoute(phase)
  if (decision.type === 'loading') return <LoadingScreen />
  if (decision.type === 'redirect') return <Navigate to={decision.to} replace />
  return <Outlet />
}
