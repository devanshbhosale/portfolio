import Link from 'next/link'
import { Zap } from 'lucide-react'

export default function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-300 py-12 mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid md:grid-cols-4 gap-8">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Zap size={24} className="text-primary-500" />
              <span className="text-xl font-bold text-white">Jobkar</span>
            </div>
            <p className="text-sm">Premium blue‑collar job listings with referral rewards.</p>
          </div>
          <div>
            <h4 className="text-white font-semibold mb-3">Quick Links</h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="/jobs" className="hover:text-white">Browse Jobs</Link></li>
              <li><Link href="/pricing" className="hover:text-white">Premium Plans</Link></li>
              <li><Link href="/dashboard" className="hover:text-white">Referral Dashboard</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-white font-semibold mb-3">Support</h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="#" className="hover:text-white">Contact Us</Link></li>
              <li><Link href="#" className="hover:text-white">FAQ</Link></li>
              <li><Link href="#" className="hover:text-white">Terms & Privacy</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-white font-semibold mb-3">For Agents</h4>
            <p className="text-sm">Need to add listings? Agent access is by invite only.</p>
          </div>
        </div>
        <div className="border-t border-gray-800 mt-8 pt-6 text-center text-sm">
          © {new Date().getFullYear()} Jobkar. All rights reserved.
        </div>
      </div>
    </footer>
  )
}
