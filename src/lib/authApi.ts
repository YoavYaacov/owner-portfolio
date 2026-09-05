import { functionsUrl, supabaseAnonKey } from './supabaseClient'

// Thin client for the two Phase 2 Edge Functions (ADR-015, ADR-016).
// Both functions must be deployed with JWT verification disabled
// (they exist precisely so unauthenticated visitors can log in / request a
// reset) — see the Phase 2 apply guide. The anon key is sent because
// Supabase's API gateway still expects an `apikey` header even when the
// function itself doesn't require a signed-in user.

interface EdgeSession {
  access_token: string
  refresh_token: string
}

class AuthApiError extends Error {}

async function callFunction<T>(name: string, body: unknown): Promise<T> {
  if (!functionsUrl || !supabaseAnonKey) {
    throw new AuthApiError('המערכת אינה מוגדרת כראוי (חסרים פרטי חיבור ל-Supabase).')
  }

  let response: Response
  try {
    response = await fetch(`${functionsUrl}/${name}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: supabaseAnonKey,
        Authorization: `Bearer ${supabaseAnonKey}`,
      },
      body: JSON.stringify(body),
    })
  } catch {
    throw new AuthApiError('לא הצלחנו להתחבר לשרת. בדוק/י את החיבור לאינטרנט ונסה/י שוב.')
  }

  const data = await response.json().catch(() => null)

  if (!response.ok) {
    const message =
      (data && typeof data.error === 'string' && data.error) ||
      'אירעה שגיאה. נסה/י שוב בעוד רגע.'
    throw new AuthApiError(message)
  }

  return data as T
}

export async function loginWithUsername(username: string, password: string): Promise<EdgeSession> {
  const data = await callFunction<{ session: EdgeSession }>('login-with-username', {
    username: username.trim().toLowerCase(),
    password,
  })
  return data.session
}

export async function requestPasswordReset(username: string): Promise<string> {
  const data = await callFunction<{ message: string }>('request-password-reset', {
    username: username.trim().toLowerCase(),
  })
  return data.message
}

export { AuthApiError }
