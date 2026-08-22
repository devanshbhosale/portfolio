'use client'
import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ChevronDown } from 'lucide-react'

export interface FaqItem {
  question: string
  answer: string
}

/** One-open-at-a-time accordion using the same height animation as the
 *  navbar's mobile menu. */
export default function FaqAccordion({ items }: { items: FaqItem[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(0)

  return (
    <div className="mt-10 space-y-3">
      {items.map((item, i) => {
        const isOpen = openIndex === i
        return (
          <div
            key={item.question}
            className="bg-white rounded-xl border border-gray-200 shadow-card overflow-hidden"
          >
            <button
              className="w-full flex items-center justify-between gap-4 px-5 sm:px-6 py-4 text-left"
              onClick={() => setOpenIndex(isOpen ? null : i)}
              aria-expanded={isOpen}
            >
              <span className="font-semibold text-gray-900">{item.question}</span>
              <ChevronDown
                size={20}
                aria-hidden
                className={`shrink-0 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
              />
            </button>
            <AnimatePresence initial={false}>
              {isOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <p className="px-5 sm:px-6 pb-5 text-gray-600 leading-relaxed">{item.answer}</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )
      })}
    </div>
  )
}
