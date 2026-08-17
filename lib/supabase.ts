import { createBrowserClient } from '@supabase/ssr'
import type { Database } from './database.types'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!url || !anonKey) {
  throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY — copy .env.example to .env.local and fill it in.')
}

/** Singleton browser client for client components. */
export const supabase = createBrowserClient<Database>(url, anonKey)
