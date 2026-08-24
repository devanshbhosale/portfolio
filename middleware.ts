import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import type { Database } from '@/lib/database.types'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Session refresh with the current @supabase/ssr cookie pattern.
  let supabaseResponse = NextResponse.next({ request })
  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          )
        },
      },
    },
  )
  const { data: { user } } = await supabase.auth.getUser()

  // Logged-in users never stay on /login (operators browse as jobseekers).
  if (pathname === '/login' && user) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  const isProtected = pathname.startsWith('/dashboard') || pathname.startsWith('/profile')
  if (isProtected && !user) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('next', pathname)
    return NextResponse.redirect(loginUrl)
  }

  return supabaseResponse
}

export const config = {
  // / and /jobs are in the matcher so Supabase session refresh (token
  // rotation) runs on the highest-traffic pages too — without it, a rotated
  // refresh token set during an RSC render is dropped → silent logouts.
  matcher: ['/', '/jobs/:path*', '/dashboard/:path*', '/profile', '/login'],
}
