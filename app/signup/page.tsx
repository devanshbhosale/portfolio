'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { CheckCircle2, Mail } from 'lucide-react'
import Button from '@/components/ui/Button'
import { useAuth } from '@/contexts/AuthContext'

export default function SignupPage() {
  const { signUp, user, authLoading } = useAuth()
  const router = useRouter()

  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [needsConfirmation, setNeedsConfirmation] = useState(false)

  useEffect(() => {
    if (user && !needsConfirmation) router.push('/dashboard')
  }, [user, needsConfirmation, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }
    setBusy(true)
    const result = await signUp(email.trim(), password, fullName.trim())
    setBusy(false)
    if (result.error) {
      setError(result.error)
      return
    }
    if (result.needsConfirmation) setNeedsConfirmation(true)
  }

  if (needsConfirmation) {
    return (
      <div className="min-h-[calc(100vh-16rem)] py-12 px-4 flex items-center justify-center">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-8 max-w-md w-full text-center">
          <Mail size={32} className="mx-auto text-primary-600" aria-hidden />
          <h1 className="mt-3 text-2xl font-bold text-gray-900">Confirm your email</h1>
          <p className="mt-2 text-gray-600">
            We sent a confirmation link to <strong>{email}</strong>. Click it, then log in.
          </p>
          <Button href="/login" className="mt-6" fullWidth>Go to login</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-[calc(100vh-16rem)] py-12 px-4 flex items-center justify-center">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <CheckCircle2 size={32} className="mx-auto text-primary-600" aria-hidden />
          <h1 className="mt-3 text-3xl font-bold text-gray-900">Create your account</h1>
          <p className="mt-2 text-gray-600">Browse jobs, refer friends, earn 20%+ commission</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-4" noValidate>
          <div>
            <label htmlFor="fullName" className="block text-sm font-medium text-gray-700">Full name</label>
            <input
              id="fullName" type="text" required autoComplete="name"
              value={fullName} onChange={(e) => setFullName(e.target.value)}
              className="mt-1 w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="Your name"
            />
          </div>
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
              id="password" type="password" required autoComplete="new-password" minLength={8}
              value={password} onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="At least 8 characters"
            />
            {error && <p role="alert" className="mt-2 text-sm text-red-600">{error}</p>}
          </div>
          <Button type="submit" fullWidth disabled={busy || authLoading}>
            {busy ? 'Creating account…' : 'Sign up'}
          </Button>
        </form>

        <p className="mt-4 text-center text-sm text-gray-600">
          Already have an account?{' '}
          <Link href="/login" className="font-medium text-primary-600 hover:text-primary-700">Log in</Link>
        </p>
      </div>
    </div>
  )
}
