'use client'
import { useState } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { Menu, X, Zap, UserCircle } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import Button from '@/components/ui/Button'

export default function Navbar() {
  const { user, login, logout } = useAuth()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [authModalOpen, setAuthModalOpen] = useState(false)

  const navLinks = [
    { href: '/jobs', label: 'Browse Jobs' },
    { href: '/pricing', label: 'Premium' },
    { href: '/dashboard', label: 'Referral' },
  ]

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-200">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <motion.span
            initial={{ rotate: -10, opacity: 0 }}
            animate={{ rotate: 0, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 200 }}
            className="text-primary-600"
          >
            <Zap size={28} strokeWidth={2.5} />
          </motion.span>
          <span className="text-2xl font-extrabold tracking-tighter text-gray-900">
            Job<span className="text-primary-600">kar</span>
          </span>
        </Link>

        <div className="hidden md:flex items-center gap-6">
          {navLinks.map(link => (
            <Link key={link.href} href={link.href} className="text-gray-600 hover:text-gray-900 font-medium transition-colors">
              {link.label}
            </Link>
          ))}
          {user ? (
            <div className="flex items-center gap-3">
              <Link href="/profile" className="flex items-center gap-2 text-gray-700 hover:text-gray-900">
                <UserCircle size={20} />
                <span>{user.name}</span>
              </Link>
              <Button variant="outline" size="sm" onClick={logout}>Logout</Button>
            </div>
          ) : (
            <Button size="sm" onClick={() => setAuthModalOpen(true)}>Login</Button>
          )}
        </div>

        <button className="md:hidden" onClick={() => setMobileOpen(!mobileOpen)}>
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
            <div className="px-4 pt-2 pb-4 space-y-2">
              {navLinks.map(link => (
                <Link key={link.href} href={link.href} className="block py-2 text-gray-600 hover:text-gray-900">
                  {link.label}
                </Link>
              ))}
              {!user && (
                <Button fullWidth onClick={() => setAuthModalOpen(true)}>Login</Button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {authModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center p-4"
            onClick={() => setAuthModalOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white rounded-xl p-6 max-w-sm w-full"
              onClick={e => e.stopPropagation()}
            >
              <h3 className="text-xl font-bold mb-4">Login as Job Seeker</h3>
              <div className="space-y-3">
                <Button
                  fullWidth
                  variant="outline"
                  onClick={() => { login('jobseeker'); setAuthModalOpen(false); }}
                >
                  Job Seeker Login
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  )
}
