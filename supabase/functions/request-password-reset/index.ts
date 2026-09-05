// request-password-reset — implements ADR-016.
//
// The client sends { username }. This ALWAYS responds with the same
// generic success message, regardless of whether the username exists or
// whether the email actually went out — otherwise this endpoint becomes a
// username-enumeration oracle. Deploy with JWT verification DISABLED (same
// reasoning as login-with-username).

import { createClient } from 'npm:@supabase/supabase-js@2.45.4'

// CORS helper inlined (rather than imported from ../_shared/cors.ts):
// the Supabase Dashboard's function editor only uploads a single file per
// function and does not resolve relative imports to sibling folders, so a
// shared file breaks deployment there. This duplicates ~10 lines across two
// functions in exchange for working with both the Dashboard and the CLI.
function buildCorsHeaders(requestOrigin: string | null): HeadersInit {
  const allowedOrigin = Deno.env.get('ALLOWED_ORIGIN') ?? ''
  // Fail closed: only echo the allow-listed origin back when the request's
  // own Origin header actually matches it. A misconfigured/missing
  // ALLOWED_ORIGIN, or a request from anywhere else, gets an empty value —
  // the browser then blocks the response, rather than the server allowing
  // everything by accident (ADR-020).
  const allow = allowedOrigin && requestOrigin === allowedOrigin ? allowedOrigin : ''
  return {
    'Access-Control-Allow-Origin': allow,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    Vary: 'Origin',
  }
}

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!
// Full URL incl. hash route, e.g. https://yoavyaacov.github.io/owner-portfolio/#/reset-password
// Must also be added to Supabase Auth -> URL Configuration -> Redirect URLs,
// or resetPasswordForEmail will silently fail to produce a working link.
const PASSWORD_RESET_REDIRECT_URL = Deno.env.get('PASSWORD_RESET_REDIRECT_URL') ?? ''

const GENERIC_MESSAGE = 'אם שם המשתמש קיים במערכת, נשלח אליו מייל עם קישור לאיפוס הסיסמה.'

function jsonResponse(body: unknown, status: number, headers: HeadersInit) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...headers, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req: Request) => {
  const headers = buildCorsHeaders(req.headers.get('origin'))

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers })
  }
  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405, headers)
  }

  let body: { username?: unknown }
  try {
    body = await req.json()
  } catch {
    body = {}
  }

  const username = typeof body.username === 'string' ? body.username.trim().toLowerCase() : ''

  if (username && PASSWORD_RESET_REDIRECT_URL) {
    try {
      const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
        auth: { persistSession: false },
      })
      const { data: usernameRow } = await adminClient
        .from('usernames')
        .select('user_id')
        .eq('username', username)
        .maybeSingle()

      if (usernameRow) {
        const { data: userData } = await adminClient.auth.admin.getUserById(usernameRow.user_id)
        const email = userData?.user?.email
        if (email) {
          const anonClient = createClient(SUPABASE_URL, ANON_KEY, {
            auth: { persistSession: false },
          })
          await anonClient.auth.resetPasswordForEmail(email, {
            redirectTo: PASSWORD_RESET_REDIRECT_URL,
          })
        }
      }
    } catch (_err) {
      // Intentionally swallowed — the same generic response is returned
      // below no matter what happened above (ADR-016).
    }
  }

  // Always 200 with the same body — success, unknown-username and
  // transient-failure all look identical from the outside.
  return jsonResponse({ message: GENERIC_MESSAGE }, 200, headers)
})
