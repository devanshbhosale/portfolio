import type { Metadata } from 'next'

// The /jobs page itself is 'use client' and can't export metadata.
export const metadata: Metadata = {
  title: 'Browse Jobs',
  description: 'Filter verified jobs by location, category and pay — free to browse, apply directly.',
}

export default function JobsLayout({ children }: { children: React.ReactNode }) {
  return children
}
