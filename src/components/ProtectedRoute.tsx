import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { decideProtectedRoute } from '../lib/routeGuard'
import LoadingScreen from './LoadingScreen'
import ConfigurationError from './ConfigurationError'

/** Wraps any route that requires a signed-in user (SRS §43). */
export default function ProtectedRoute() {
  const { phase, configured } = useAuth()

  if (!configured) return <ConfigurationError />

  const decision = decideProtectedRoute(phase)
  if (decision.type === 'loading') return <LoadingScreen />
  if (decision.type === 'redirect') return <Navigate to={decision.to} replace />
  return <Outlet />
}
