import { createServerClient } from '@supabase/ssr'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import type { Database, ProfileRow } from './database.types'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// supabase-js calls plain global.fetch, which Next.js caches in the Vercel
// Data Cache — and that cache SURVIVES deploys. A settings row (prices,
// withdraw threshold) fetched once stays stale across every future deploy
// until cache expiry. Route-level `dynamic = 'force-dynamic'` does not reach
// into the client library, so every DB-reading client below opts its fetches
// out explicitly (via global.fetch). Never pass a caching fetch to these
// clients.
const noStoreFetch: typeof fetch = (input, init) =>
  fetch(input, { ...init, cache: 'no-store' })

/** Route-handler client reading the session from cookies (the pattern the
 *  original plan got wrong: service-role clients have no session). */
export function createRouteClient() {
  const cookieStore = cookies()
  return createServerClient<Database>(url!, anonKey!, {
    global: { fetch: noStoreFetch },
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (toSet) => {
        try {
          toSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options))
        } catch {
          // Server Component render — middleware handles refresh.
        }
      },
    },
  })
}

/** Service-role client: bypasses RLS. Server-side mutations only. */
export function adminClient(): SupabaseClient<Database> {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceKey) throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY')
  return createClient<Database>(url!, serviceKey, {
    auth: { persistSession: false },
    global: { fetch: noStoreFetch },
  })
}

/** Authenticated user for a route-handler request, or null. */
export async function getAuthedUser() {
  const { data, error } = await createRouteClient().auth.getUser()
  if (error) return null
  return data.user
}

/** Profile row for the authed user (role, referral code, premium, bank). */
export async function getAuthedProfile(): Promise<ProfileRow | null> {
  const user = await getAuthedUser()
  if (!user) return null
  const { data, error } = await adminClient()
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()
  if (error || !data) return null
  return data
}

export function isPremiumActive(profile: Pick<ProfileRow, 'premium_expires_at'> | null | undefined) {
  if (!profile?.premium_expires_at) return false
  return new Date(profile.premium_expires_at).getTime() > Date.now()
}

/** Safe JSON body read: null on malformed JSON instead of a thrown 500. */
export async function readJson(req: Request): Promise<unknown> {
  try {
    return await req.json()
  } catch {
    return null
  }
}
