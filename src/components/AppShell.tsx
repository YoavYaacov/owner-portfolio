import type { ReactNode } from 'react'
import { useAuth } from '../hooks/useAuth'

interface AppShellProps {
  children: ReactNode
}

/**
 * Minimal authenticated shell for Phase 2 — header with the signed-in
 * user's name and a sign-out button. Navigation between feature areas
 * (properties, transactions, etc.) is added from Phase 3 onward as those
 * routes come online; there is nothing to navigate to yet.
 */
export default function AppShell({ children }: AppShellProps) {
  const { profile, profileError, signOut } = useAuth()

  return (
    <div className="app-shell">
      <header className="app-header">
        <span className="app-header__brand">ניהול פורטפוליו נדל&quot;ן</span>
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
