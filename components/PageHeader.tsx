'use client'
import { motion } from 'framer-motion'

/** Shared animated page heading — keeps every content page on the site
 *  visually consistent (same fade-up the pricing and job pages use). */
export default function PageHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="text-center">
      <motion.h1
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-4xl font-bold text-gray-900"
      >
        {title}
      </motion.h1>
      {subtitle ? (
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mt-3 text-lg text-gray-600"
        >
          {subtitle}
        </motion.p>
      ) : null}
    </div>
  )
}
