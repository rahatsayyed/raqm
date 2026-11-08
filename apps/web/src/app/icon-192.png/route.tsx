import { ImageResponse } from 'next/og';
import { logoTile } from '@/lib/seo/og';

export const dynamic = 'force-static';

export function GET() {
  return new ImageResponse(logoTile(192, 40), { width: 192, height: 192 });
}
