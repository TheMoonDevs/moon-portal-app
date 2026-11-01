import { ImageResponse } from 'next/og';

/*
 * The share kit's image for an opening: "We're hiring" with the role, its
 * facts and the company. Square for Instagram and WhatsApp, wide for
 * LinkedIn.
 */

export const SHARE_IMAGE_SIZES = {
  square: { width: 1080, height: 1080 },
  wide: { width: 1200, height: 627 },
} as const;

export type ShareImageFormat = keyof typeof SHARE_IMAGE_SIZES;

export function renderShareImage(
  opening: {
    title: string;
    slug: string;
    employmentType?: string | null;
    location?: string | null;
    department?: string | null;
  },
  company: string,
  format: ShareImageFormat,
) {
  const size = SHARE_IMAGE_SIZES[format];
  const facts = [opening.employmentType, opening.location, opening.department]
    .filter(Boolean)
    .join('  ·  ');
  const wide = format === 'wide';
  const title =
    opening.title.length > 60
      ? `${opening.title.slice(0, 57)}…`
      : opening.title;

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: wide ? '64px 72px' : '96px 88px',
          background:
            'linear-gradient(135deg, #0b0b12 0%, #1a1530 55%, #2b1d4f 100%)',
          color: '#ffffff',
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div
            style={{
              display: 'flex',
              padding: '10px 22px',
              borderRadius: 999,
              background: 'rgba(167, 139, 250, 0.18)',
              border: '2px solid rgba(167, 139, 250, 0.5)',
              color: '#ddd6fe',
              fontSize: wide ? 26 : 32,
              letterSpacing: 2,
            }}
          >
            WE’RE HIRING
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div
            style={{
              display: 'flex',
              fontSize: wide ? 72 : title.length > 30 ? 84 : 104,
              fontWeight: 700,
              lineHeight: 1.05,
            }}
          >
            {title}
          </div>
          {facts && (
            <div
              style={{
                display: 'flex',
                fontSize: wide ? 30 : 38,
                color: '#c4b5fd',
              }}
            >
              {facts}
            </div>
          )}
        </div>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-end',
            fontSize: wide ? 30 : 36,
          }}
        >
          <div style={{ display: 'flex', fontWeight: 700 }}>{company}</div>
          <div style={{ display: 'flex', color: '#a1a1aa' }}>
            Apply through the link
          </div>
        </div>
      </div>
    ),
    {
      ...size,
      headers: {
        'Content-Disposition': `inline; filename="${opening.slug}-${format}.png"`,
      },
    },
  );
}
