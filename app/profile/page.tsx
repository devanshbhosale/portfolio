'use client'
import Link from 'next/link'
import { Crown, UserCircle } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import Button from '@/components/ui/Button'

export default function ProfilePage() {
  const { user, authLoading } = useAuth()

  if (authLoading) return <div className="py-16 text-center text-gray-500">Loading…</div>
  if (!user) {
    return (
      <div className="py-16 text-center">
        <p>Please log in to view your profile.</p>
        <Button href="/login?next=/profile" size="sm" className="mt-4">Log in</Button>
      </div>
    )
  }

  return (
    <div className="py-8 px-4 sm:px-6 lg:px-8 max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold">Profile</h1>
      <div className="mt-6 bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-4">
        <div className="flex items-center gap-3 pb-4 border-b border-gray-100">
          <UserCircle size={40} className="text-gray-400" aria-hidden />
          <div>
            <p className="font-semibold text-gray-900">{user.name}</p>
            <p className="text-sm text-gray-500">{user.email}</p>
          </div>
          <span className="ml-auto px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary-50 text-primary-700 capitalize">{user.role}</span>
        </div>

        <dl className="space-y-3 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="text-gray-500">Referral code</dt>
            <dd className="font-mono font-semibold text-primary-600">{user.referralCode}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-gray-500">Premium</dt>
            <dd className="flex items-center gap-1 font-medium">
              {user.premium ? (
                <>
                  <Crown size={14} className="text-amber-500" aria-hidden />
                  Active until {user.premiumExpiresAt ? new Date(user.premiumExpiresAt).toLocaleDateString() : '—'}
                </>
              ) : (
                <Link href="/pricing" className="text-primary-600 hover:text-primary-700">Upgrade</Link>
              )}
            </dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="text-gray-500">Bank account</dt>
            <dd className="font-medium">{user.bankConnected ? 'Connected' : 'Not connected — add it from your referral dashboard'}</dd>
          </div>
        </dl>
      </div>
    </div>
  )
}
