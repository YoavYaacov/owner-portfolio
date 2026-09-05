import { describe, expect, it } from 'vitest'
import { decidePublicOnlyRoute, decideProtectedRoute } from '../lib/routeGuard'

// These cover the SRS §22 critical flow at the routing-decision level:
// unauthenticated visitors are bounced to /login, authenticated visitors
// are bounced away from the public-only auth pages, and nothing navigates
// while the auth phase is still resolving (this is what makes the password
// recovery link survive under HashRouter — see ADR-018 / RootRedirect).

describe('decideProtectedRoute', () => {
  it('waits while loading', () => {
    expect(decideProtectedRoute('loading')).toEqual({ type: 'loading' })
  })

  it('redirects unauthenticated visitors to /login', () => {
    expect(decideProtectedRoute('unauthenticated')).toEqual({ type: 'redirect', to: '/login' })
  })

  it('renders for authenticated visitors', () => {
    expect(decideProtectedRoute('authenticated')).toEqual({ type: 'render' })
  })
})

describe('decidePublicOnlyRoute', () => {
  it('waits while loading', () => {
    expect(decidePublicOnlyRoute('loading')).toEqual({ type: 'loading' })
  })

  it('redirects authenticated visitors to /dashboard', () => {
    expect(decidePublicOnlyRoute('authenticated')).toEqual({ type: 'redirect', to: '/dashboard' })
  })

  it('renders for unauthenticated visitors', () => {
    expect(decidePublicOnlyRoute('unauthenticated')).toEqual({ type: 'render' })
  })
})
