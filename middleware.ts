import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import type { Database, UserRole } from '@/lib/database.types'

const DASHBOARDS_ON = process.env.ENABLE_DASHBOARDS === 'true'

async function getRole(userId: string, getAll: () => { name: string; value: string }[]) {
  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll, setAll: () => {} } },
  )
  const { data } = await supabase.from('profiles').select('role').eq('id', userId).single()
  return (data?.role ?? 'jobseeker') as UserRole
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Public-website mode: admin/agent surfaces do not exist at all.
  if (
    !DASHBOARDS_ON &&
    (pathname.startsWith('/dashboard/admin') ||
      pathname.startsWith('/dashboard/agent') ||
      pathname.startsWith('/api/admin'))
  ) {
    return new NextResponse(null, { status: 404 })
  }

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

  if (pathname === '/login') {
    if (user) {
      const role = await getRole(user.id, () => request.cookies.getAll())
      const dest = role === 'admin' ? '/dashboard/admin' : role === 'agent' ? '/dashboard/agent' : '/dashboard'
      return NextResponse.redirect(new URL(dest, request.url))
    }
    return supabaseResponse
  }

  const isProtected = pathname.startsWith('/dashboard') || pathname.startsWith('/profile')
  if (isProtected && !user) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('next', pathname)
    return NextResponse.redirect(loginUrl)
  }

  if (user) {
    const role = await getRole(user.id, () => request.cookies.getAll())
    if (pathname.startsWith('/dashboard/admin') && role !== 'admin') {
      return NextResponse.redirect(new URL('/', request.url))
    }
    if (pathname.startsWith('/dashboard/agent') && role !== 'agent') {
      return NextResponse.redirect(new URL('/', request.url))
    }
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/dashboard/:path*', '/profile', '/login', '/api/admin/:path*'],
}
