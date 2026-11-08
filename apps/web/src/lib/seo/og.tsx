import { ImageResponse } from 'next/og';
import { MOSS, OG_SIZE } from './constants';

export function logoTile(size: number, radius: number) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        background: MOSS.brand,
        color: MOSS.brandInk,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: size * 0.6,
        fontWeight: 700,
      }}
    >
      R
    </div>
  );
}

export function renderOg({ eyebrow, title, subtitle }: { eyebrow?: string; title: string; subtitle?: string }) {
  const titleSize = title.length > 70 ? 54 : title.length > 40 ? 64 : 76;
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: 72,
          background: MOSS.inverse,
          color: MOSS.inverseInk,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          {logoTile(72, 18)}
          <div style={{ display: 'flex', fontSize: 40, fontWeight: 700 }}>Raqm</div>
          {eyebrow ? (
            <div
              style={{
                display: 'flex',
                marginLeft: 12,
                padding: '8px 18px',
                borderRadius: 999,
                background: MOSS.brand,
                color: MOSS.brandInk,
                fontSize: 24,
              }}
            >
              {eyebrow}
            </div>
          ) : null}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div style={{ display: 'flex', fontSize: titleSize, fontWeight: 700, lineHeight: 1.1, letterSpacing: -1.5 }}>
            {title}
          </div>
          {subtitle ? (
            <div style={{ display: 'flex', fontSize: 30, lineHeight: 1.35, color: MOSS.brandSoft }}>{subtitle}</div>
          ) : null}
        </div>
        <div style={{ display: 'flex', fontSize: 28, color: MOSS.brandSoft }}>raqm.money</div>
      </div>
    ),
    { ...OG_SIZE },
  );
}
