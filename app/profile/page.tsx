'use client'
import { useAuth } from '@/contexts/AuthContext'

export default function ProfilePage() {
  const { user } = useAuth()
  if (!user) return <div className="py-16 text-center">Please login to view profile.</div>
  return (
    <div className="py-8 px-4 sm:px-6 lg:px-8 max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold">Profile</h1>
      <div className="mt-6 bg-white rounded-xl border p-6">
        <p><strong>Name:</strong> {user.name}</p>
        <p><strong>Email:</strong> {user.email}</p>
        <p><strong>Referral Code:</strong> {user.referralCode}</p>
        <p><strong>Premium:</strong> {user.premium ? 'Yes' : 'No'}</p>
      </div>
    </div>
  )
}
