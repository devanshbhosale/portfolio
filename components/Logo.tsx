import React from 'react'

interface LogoProps {
  variant?: 'full' | 'mark' | 'wordmark'
  theme?: 'dark' | 'light'
  className?: string
  markSize?: number
  height?: number
}

export default function Logo({
  variant = 'full',
  theme = 'dark',
  className = '',
  markSize = 36,
  height = 36,
}: LogoProps) {
  const isLight = theme === 'light'
  // Instance-unique gradient ids: Navbar and Footer can both render the same
  // theme, and duplicate SVG ids are invalid HTML and fragile if the variants
  // ever diverge. useId is hydration-stable; strip its separator chars so the
  // fragment reference stays a plain token.
  const uid = React.useId().replace(/[^a-zA-Z0-9]/g, '')
  const gid = (name: string) => `${name}-${uid}-${theme}`

  // Standalone Mark
  const renderMark = (s: number) => (
    <svg
      width={s}
      height={s}
      viewBox="0 0 44 44"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="shrink-0 transition-transform duration-200 group-hover:scale-105"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={gid('jk-bg')} x1="0" y1="0" x2="44" y2="44" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor={isLight ? '#EFF6FF' : '#0E2442'} />
          <stop offset="100%" stopColor={isLight ? '#DBEAFE' : '#071324'} />
        </linearGradient>
        <linearGradient id={gid('jk-orange')} x1="22" y1="10" x2="38" y2="24" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor={isLight ? '#FB923C' : '#FF9B26'} />
          <stop offset="100%" stopColor={isLight ? '#EA580C' : '#FF5100'} />
        </linearGradient>
        <linearGradient id={gid('jk-blue')} x1="22" y1="24" x2="38" y2="38" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor={isLight ? '#2563EB' : '#3B82F6'} />
          <stop offset="100%" stopColor={isLight ? '#1D4ED8' : '#1D4ED8'} />
        </linearGradient>
      </defs>

      {/* Squircle Background */}
      <rect
        width="44"
        height="44"
        rx="12"
        fill={`url(#${gid('jk-bg')})`}
        stroke={isLight ? '#BFDBFE' : '#1F3E68'}
        strokeWidth="1.2"
      />

      {/* J-Pillar */}
      <path
        d="M13 11H18.5V26.5C18.5 30.6421 15.1421 34 11 34C8.79086 34 7 32.2091 7 30C7 27.7909 8.79086 26 11 26C12.1046 26 13 26.8954 13 28V11Z"
        fill={isLight ? '#0F2A4A' : '#FFFFFF'}
      />

      {/* K-Upper Launch Arrow */}
      <polygon
        points="21.5,19 33.5,11 36.5,15.5 25.5,22.5"
        fill={`url(#${gid('jk-orange')})`}
      />

      {/* K-Lower Strut */}
      <polygon
        points="22,25 26,23.5 36,33.5 32,36.5"
        fill={`url(#${gid('jk-blue')})`}
      />

      {/* Central Nexus Spark */}
      <circle
        cx="20.5"
        cy="22"
        r="2.2"
        fill={isLight ? '#EA580C' : '#FFA424'}
      />
    </svg>
  )

  if (variant === 'mark') {
    return (
      <div className={`inline-flex items-center ${className}`} aria-label="Jobkarbe">
        {renderMark(markSize)}
      </div>
    )
  }

  return (
    <div className={`inline-flex items-center gap-2.5 group select-none ${className}`} aria-label="Jobkarbe">
      {variant !== 'wordmark' && renderMark(markSize)}
      <span
        className={`font-display font-extrabold tracking-tight flex items-baseline ${
          isLight ? 'text-navy-900' : 'text-white'
        }`}
        style={{ fontSize: `${Math.round(height * 0.65)}px`, lineHeight: 1 }}
      >
        <span>Job</span>
        <span className="text-primary-500 font-black">karbe</span>
        <span className="text-accent-500 ml-0.5 inline-block text-[0.8em] font-black leading-none">.</span>
      </span>
    </div>
  )
}
