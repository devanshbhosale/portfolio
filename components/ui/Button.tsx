'use client'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import Link from 'next/link'

interface ButtonProps {
  children: React.ReactNode
  variant?: 'primary' | 'accent' | 'outline' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  className?: string
  href?: string
  onClick?: () => void
  type?: 'button' | 'submit'
  disabled?: boolean
  fullWidth?: boolean
}

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  className,
  href,
  onClick,
  type = 'button',
  disabled,
  fullWidth
}: ButtonProps) {
  const base = 'inline-flex items-center justify-center rounded-lg font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed'
  const variants = {
    primary: 'bg-primary-600 text-white hover:bg-primary-700 focus:ring-primary-500 shadow-sm',
    accent: 'bg-accent-500 text-white hover:bg-accent-600 focus:ring-accent-500 shadow-sm',
    outline: 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 focus:ring-primary-500',
    ghost: 'text-gray-600 hover:bg-gray-100 focus:ring-gray-500',
  }
  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base',
  }

  const classes = cn(
    base,
    variants[variant],
    sizes[size],
    fullWidth && 'w-full',
    className
  )

  const motionProps = {
    whileHover: { scale: disabled ? 1 : 1.02 },
    whileTap: { scale: disabled ? 1 : 0.98 },
    transition: { type: 'spring', stiffness: 400, damping: 17 } as const
  }

  if (href) {
    return (
      <Link href={href} className={classes}>
        <motion.span {...motionProps} className="inline-flex items-center">
          {children}
        </motion.span>
      </Link>
    )
  }

  return (
    <motion.button
      {...motionProps}
      type={type}
      className={classes}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </motion.button>
  )
}
