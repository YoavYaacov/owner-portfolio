// login-with-username — implements ADR-011 / ADR-015.
//
// The client sends { username, password }. This function resolves the
// username to an email server-side (the `usernames` table has zero RLS
// policies — only the service role, used exclusively here, can read it)
// and performs the actual sign-in, returning only session tokens. The
// email itself is never sent back to the client.
//
// Deploy this function with JWT verification DISABLED — it exists
// specifically to let an unauthenticated visitor log in. See the Phase 2
// apply guide for the exact deploy command / dashboard toggle.

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

// Deliberately identical for "unknown username" and "wrong password" so the
// response never confirms whether a given username exists (Master Prompt
// §10 — protection against enumeration / IDOR-adjacent leaks).
const GENERIC_ERROR = 'שם המשתמש או הסיסמה שגויים.'

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

  let body: { username?: unknown; password?: unknown }
  try {
    body = await req.json()
  } catch {
    return jsonResponse({ error: GENERIC_ERROR }, 400, headers)
  }

  const username = typeof body.username === 'string' ? body.username.trim().toLowerCase() : ''
  const password = typeof body.password === 'string' ? body.password : ''

  if (!username || !password) {
    return jsonResponse({ error: GENERIC_ERROR }, 400, headers)
  }

  const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  })

  // 1. username -> user_id
  const { data: usernameRow, error: usernameError } = await adminClient
    .from('usernames')
    .select('user_id')
    .eq('username', username)
    .maybeSingle()

  if (usernameError || !usernameRow) {
    return jsonResponse({ error: GENERIC_ERROR }, 401, headers)
  }

  // 2. user_id -> email (admin API; requires service role)
  const { data: userData, error: userError } = await adminClient.auth.admin.getUserById(
    usernameRow.user_id
  )
  const email = userData?.user?.email
  if (userError || !email) {
    return jsonResponse({ error: GENERIC_ERROR }, 401, headers)
  }

  // 3. Perform the real sign-in with the anon key — this is the same
  //    password grant supabase-js's signInWithPassword makes client-side;
  //    running it here just means the client never has to see `email`.
  const anonClient = createClient(SUPABASE_URL, ANON_KEY, {
    auth: { persistSession: false },
  })
  const { data: signInData, error: signInError } = await anonClient.auth.signInWithPassword({
    email,
    password,
  })

  if (signInError || !signInData.session) {
    return jsonResponse({ error: GENERIC_ERROR }, 401, headers)
  }

  return jsonResponse(
    {
      session: {
        access_token: signInData.session.access_token,
        refresh_token: signInData.session.refresh_token,
      },
    },
    200,
    headers
  )
})
