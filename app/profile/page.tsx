'use client'
import { UserCircle } from 'lucide-react'
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
      <div className="mt-6 bg-white rounded-xl border border-gray-200 shadow-xs p-6">
        <div className="flex items-center gap-3">
          <UserCircle size={40} className="text-gray-400" aria-hidden />
          <div>
            <p className="font-semibold text-gray-900">{user.name}</p>
            <p className="text-sm text-gray-500">{user.email}</p>
          </div>
          <span className="ml-auto px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary-50 text-primary-700 capitalize">{user.role}</span>
        </div>
      </div>
    </div>
  )
}
