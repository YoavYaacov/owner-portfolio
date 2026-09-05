import type { AuthPhase } from '../types/auth'

// Extracted as a pure function (no React, no router) so the redirect logic
// itself is unit-testable independent of rendering (SRS §55, §22 — critical
// login->dashboard flow must be covered).

export type GuardDecision =
  | { type: 'loading' }
  | { type: 'redirect'; to: string }
  | { type: 'render' }

export function decideProtectedRoute(phase: AuthPhase): GuardDecision {
  if (phase === 'loading') return { type: 'loading' }
  if (phase === 'unauthenticated') return { type: 'redirect', to: '/login' }
  return { type: 'render' }
}

export function decidePublicOnlyRoute(phase: AuthPhase): GuardDecision {
  if (phase === 'loading') return { type: 'loading' }
  if (phase === 'authenticated') return { type: 'redirect', to: '/dashboard' }
  return { type: 'render' }
}
