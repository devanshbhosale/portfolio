import './globals.css'
import { Inter } from 'next/font/google'
import { AuthProvider } from '@/contexts/AuthContext'
import { PremiumProvider } from '@/contexts/PremiumContext'
import { DataProvider } from '@/contexts/DataContext'
import Navbar from '@/components/Navbar'
import Footer from '@/components/Footer'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })

export const metadata = {
  title: 'Jobkar – Find Your Next Job',
  description: 'Premium job listings, referral rewards, and more.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="min-h-screen bg-gray-50 text-gray-900 antialiased">
        <AuthProvider>
          <PremiumProvider>
            <DataProvider>
              <Navbar />
              <main className="pt-16">{children}</main>
              <Footer />
            </DataProvider>
          </PremiumProvider>
        </AuthProvider>
      </body>
    </html>
  )
}
