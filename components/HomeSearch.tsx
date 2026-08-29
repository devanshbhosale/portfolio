'use client'
// Homepage hero search — role + location inputs land on the jobs feed with
// server-side filters (the same params the /jobs page reads from its URL).
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Search, MapPin } from 'lucide-react'

export default function HomeSearch() {
  const router = useRouter()
  const [q, setQ] = useState('')
  const [location, setLocation] = useState('')

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    const p = new URLSearchParams()
    if (q.trim()) p.set('q', q.trim())
    if (location.trim()) p.set('location', location.trim())
    router.push(p.toString() ? `/jobs?${p}` : '/jobs')
  }

  return (
    <form
      onSubmit={submit}
      className="mt-8 mx-auto w-full max-w-2xl flex flex-col sm:flex-row gap-2 bg-white p-2 rounded-xl shadow-md border border-gray-200"
      role="search"
    >
      <div className="flex-1 relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} aria-hidden />
        <label htmlFor="home-search-q" className="sr-only">Job title or role</label>
        <input
          id="home-search-q"
          type="search"
          placeholder="Job title or role"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="w-full pl-10 pr-3 py-2.5 rounded-lg border-0 focus:outline-none focus:ring-2 focus:ring-primary-500 text-gray-900"
        />
      </div>
      <div className="flex-1 relative sm:border-l sm:border-gray-200">
        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} aria-hidden />
        <label htmlFor="home-search-location" className="sr-only">Location</label>
        <input
          id="home-search-location"
          type="search"
          placeholder="Location"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          className="w-full pl-10 pr-3 py-2.5 rounded-lg border-0 focus:outline-none focus:ring-2 focus:ring-primary-500 text-gray-900"
        />
      </div>
      <button
        type="submit"
        className="inline-flex items-center justify-center gap-2 bg-primary-600 hover:bg-primary-700 text-white font-medium px-6 py-2.5 rounded-lg transition-colors"
      >
        <Search size={18} aria-hidden />
        Search
      </button>
    </form>
  )
}
