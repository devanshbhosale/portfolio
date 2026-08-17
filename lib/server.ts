import { createServerClient } from '@supabase/ssr'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import type { Database, ProfileRow } from './database.types'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

/** Route-handler client reading the session from cookies (the pattern the
 *  original plan got wrong: service-role clients have no session). */
export function createRouteClient() {
  const cookieStore = cookies()
  return createServerClient<Database>(url!, anonKey!, {
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
  return createClient<Database>(url!, serviceKey, { auth: { persistSession: false } })
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
