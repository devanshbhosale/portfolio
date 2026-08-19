'use client'
import { useState } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { Menu, X, Zap, UserCircle, LogOut } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import Button from '@/components/ui/Button'

export default function Navbar() {
  const { user, logout, authLoading } = useAuth()
  const [mobileOpen, setMobileOpen] = useState(false)

  const dashboardLink = { href: '/dashboard', label: 'Referral' }

  const navLinks = user
    ? [
        { href: '/jobs', label: 'Browse Jobs' },
        { href: '/pricing', label: 'Premium' },
        dashboardLink,
      ]
    : [
        { href: '/jobs', label: 'Browse Jobs' },
        { href: '/pricing', label: 'Premium' },
      ]

  const handleLogout = async () => {
    await logout()
    setMobileOpen(false)
  }

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-200">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between" aria-label="Main">
        <Link href="/" className="flex items-center gap-2">
          <motion.span
            initial={{ rotate: -10, opacity: 0 }}
            animate={{ rotate: 0, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 200 }}
            className="text-primary-600"
          >
            <Zap size={28} strokeWidth={2.5} aria-hidden />
          </motion.span>
          <span className="text-2xl font-extrabold tracking-tighter text-gray-900">
            Job<span className="text-primary-600">kar</span>
          </span>
        </Link>

        <div className="hidden md:flex items-center gap-6">
          {navLinks.map((link) => (
            <Link key={link.href} href={link.href} className="text-gray-600 hover:text-gray-900 font-medium transition-colors">
              {link.label}
            </Link>
          ))}
          {authLoading ? (
            <span className="text-sm text-gray-400" aria-label="Loading">…</span>
          ) : user ? (
            <div className="flex items-center gap-3">
              <Link href="/profile" className="flex items-center gap-2 text-gray-700 hover:text-gray-900">
                <UserCircle size={20} aria-hidden />
                <span>{user.name}</span>
              </Link>
              <Button variant="outline" size="sm" onClick={handleLogout}>
                <LogOut size={14} className="mr-1" aria-hidden /> Logout
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <Link href="/login" className="text-gray-600 hover:text-gray-900 font-medium">Log in</Link>
              <Button size="sm" href="/signup">Sign up</Button>
            </div>
          )}
        </div>

        <button
          className="md:hidden p-2 -mr-2"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-expanded={mobileOpen}
          aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
        >
          {mobileOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </nav>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="md:hidden bg-white border-b border-gray-200 overflow-hidden"
          >
            <div className="px-4 pt-2 pb-4 space-y-1">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className="block py-3 text-gray-600 hover:text-gray-900"
                >
                  {link.label}
                </Link>
              ))}
              {authLoading ? null : user ? (
                <div className="pt-2 flex items-center gap-3">
                  <Link href="/profile" onClick={() => setMobileOpen(false)} className="flex items-center gap-2 text-gray-700">
                    <UserCircle size={20} aria-hidden /> {user.name}
                  </Link>
                  <Button variant="outline" size="sm" onClick={handleLogout}>Logout</Button>
                </div>
              ) : (
                <div className="pt-2 space-y-2">
                  <Button fullWidth variant="outline" href="/login" onClick={() => setMobileOpen(false)}>Log in</Button>
                  <Button fullWidth href="/signup" onClick={() => setMobileOpen(false)}>Sign up</Button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  )
}
