'use client'
import { Suspense, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Zap } from 'lucide-react'
import Button from '@/components/ui/Button'
import { useAuth } from '@/contexts/AuthContext'

function LoginForm() {
  const { login, user, authLoading } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const nextUrl = searchParams.get('next')

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [redirecting, setRedirecting] = useState(false)

  // Redirect only to internal paths — blocks open redirects like
  // ?next=//evil.com or ?next=/\evil.com (router.push resolves those
  // to external origins).
  const isSafeNext = (value: string | null): value is string =>
    Boolean(
      value &&
        value.startsWith('/') &&
        !value.startsWith('//') &&
        !value.includes('\\') &&
        (() => {
          try {
            const u = new URL(value, window.location.origin)
            return u.origin === window.location.origin
          } catch {
            return false
          }
        })(),
    )

  useEffect(() => {
    if (!redirecting || !user) return
    if (isSafeNext(nextUrl)) {
      router.push(nextUrl)
      return
    }
    router.push('/dashboard')
  }, [redirecting, user, nextUrl, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setBusy(true)
    const result = await login(email.trim(), password)
    setBusy(false)
    if (result.error) {
      setError(result.error)
      return
    }
    setRedirecting(true)
  }

  return (
    <div className="min-h-[calc(100vh-16rem)] py-12 px-4 flex items-center justify-center">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Zap size={32} className="mx-auto text-primary-600" aria-hidden />
          <h1 className="mt-3 text-3xl font-bold text-gray-900">Welcome back</h1>
          <p className="mt-2 text-gray-600">Log in to Jobkar</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-4" noValidate>
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email</label>
            <input
              id="email" type="email" required autoComplete="email"
              value={email} onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">Password</label>
            <input
              id="password" type="password" required autoComplete="current-password"
              value={password} onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="Your password"
            />
            {error && (
              <p role="alert" className="mt-2 text-sm text-red-600">{error}</p>
            )}
          </div>
          <Button type="submit" fullWidth disabled={busy || redirecting || authLoading}>
            {busy ? 'Logging in…' : redirecting ? 'Redirecting…' : 'Log in'}
          </Button>
        </form>

        <p className="mt-4 text-center text-sm text-gray-600">
          New here?{' '}
          <Link href="/signup" className="font-medium text-primary-600 hover:text-primary-700">Create an account</Link>
        </p>
        <p className="mt-6 text-center text-xs text-gray-400">
          Agent and admin accounts are created by the site owner — jobseeker signup is public.
        </p>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="py-16 text-center text-gray-500">Loading…</div>}>
      <LoginForm />
    </Suspense>
  )
}
