import type { ReactNode } from 'react'
import { NavLink } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

interface AppShellProps {
  children: ReactNode
}

/**
 * Authenticated shell — header with sign-in state plus the top-level nav
 * that came online in Phase 3 (Dashboard, Properties). More areas
 * (transactions/leases/loans/etc. as their own screens, not just "add"
 * forms) are added as later phases build their routes.
 */
export default function AppShell({ children }: AppShellProps) {
  const { profile, profileError, signOut } = useAuth()

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="app-header__brand-nav">
          <span className="app-header__brand">ניהול פורטפוליו נדל&quot;ן</span>
          <nav className="app-nav">
            <NavLink to="/dashboard" className={({ isActive }) => (isActive ? 'app-nav__link app-nav__link--active' : 'app-nav__link')}>
              Dashboard
            </NavLink>
            <NavLink to="/properties" className={({ isActive }) => (isActive ? 'app-nav__link app-nav__link--active' : 'app-nav__link')}>
              נכסים
            </NavLink>
          </nav>
        </div>
        <div className="app-header__user">
          {profileError ? (
            <span>{profileError}</span>
          ) : (
            <span>{profile?.display_name ?? '…'}</span>
          )}
          <button type="button" className="btn-link" onClick={() => void signOut()}>
            התנתקות
          </button>
        </div>
      </header>
      <main className="app-main">{children}</main>
    </div>
  )
}
