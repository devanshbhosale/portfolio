import { ImageResponse } from 'next/og'

export const alt = 'Jobkar — Find Verified Jobs Near You'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'
// Prerendering trips a Windows-only fileURLToPath bug in @vercel/og (paths
// with spaces); dynamic rendering is CDN-cached and works everywhere.
export const dynamic = 'force-dynamic'

// Brand OG card (navy #0F2A4A + action blue #1D4ED8), rendered at request
// time — no binary assets. Echoes the hero particle field.
export default function OpengraphImage() {
  const dots = Array.from({ length: 24 }, (_, i) => ({
    left: 40 + ((i * 137) % 1120),
    top: 40 + ((i * 89) % 550),
    size: 4 + (i % 3) * 3,
  }))
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#0F2A4A',
          position: 'relative',
        }}
      >
        {dots.map((d, i) => (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: d.left,
              top: d.top,
              width: d.size,
              height: d.size,
              borderRadius: 9999,
              background: i % 4 === 0 ? '#1D4ED8' : 'rgba(90,115,145,0.35)',
            }}
          />
        ))}
        <div style={{ display: 'flex', fontSize: 120, fontWeight: 800, color: '#FFFFFF' }}>
          Job<span style={{ color: '#3B82F6' }}>kar</span>
        </div>
        <div style={{ width: 160, height: 8, borderRadius: 9999, background: '#1D4ED8', marginTop: 24 }} />
        <div style={{ display: 'flex', fontSize: 40, color: '#E3EAF2', marginTop: 28 }}>
          Find Verified Jobs Near You
        </div>
      </div>
    ),
    { ...size },
  )
}
