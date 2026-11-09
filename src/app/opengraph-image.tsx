import { ImageResponse } from 'next/og'
import { COMPANY, PRODUCT } from '@/lib/company'

/**
 * The card WhatsApp, LinkedIn and X show when somebody shares the link.
 *
 * Without this a shared link is a grey box, which is the single cheapest thing
 * to fix before posting anywhere. Rendered from the same company facts as the
 * footer, so the credit can never disagree with the site.
 */
export const runtime = 'nodejs'
export const alt = `${PRODUCT.name} — school management, by ${COMPANY.name}`
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '72px 80px',
          background: 'linear-gradient(145deg, #0e1130 0%, #1a1e45 46%, #2a2470 100%)',
          color: '#ffffff',
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div
            style={{
              display: 'flex',
              width: 44,
              height: 44,
              borderRadius: 12,
              background: 'linear-gradient(135deg, #8fd0ff, #d2c6ff)',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#141428',
              fontSize: 22,
              fontWeight: 700,
            }}
          >
            A
          </div>
          <div style={{ display: 'flex', fontSize: 22, letterSpacing: 4, opacity: 0.75 }}>
            {PRODUCT.name.toUpperCase()}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div
            style={{
              display: 'flex',
              fontSize: 68,
              fontWeight: 700,
              lineHeight: 1.08,
              letterSpacing: -2,
              maxWidth: 900,
            }}
          >
            One register for the whole school
          </div>
          <div style={{ display: 'flex', fontSize: 27, lineHeight: 1.45, opacity: 0.78, maxWidth: 880 }}>
            Learners, fees, attendance, results and the documents a school signs — with
            role-scoped access and reports that print.
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-end',
            borderTop: '1px solid rgba(255,255,255,0.18)',
            paddingTop: 26,
            fontSize: 20,
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div style={{ display: 'flex', fontWeight: 600 }}>Built by {COMPANY.name}</div>
            <div style={{ display: 'flex', opacity: 0.6, fontSize: 17 }}>
              {COMPANY.city}, {COMPANY.country} · Serving clients globally
            </div>
          </div>
          <div style={{ display: 'flex', opacity: 0.85, fontSize: 20 }}>{COMPANY.phone}</div>
        </div>
      </div>
    ),
    size
  )
}
