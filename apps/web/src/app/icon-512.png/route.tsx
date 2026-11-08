import { ImageResponse } from 'next/og';
import { logoTile } from '@/lib/seo/og';

export const dynamic = 'force-static';

export function GET() {
  return new ImageResponse(logoTile(512, 104), { width: 512, height: 512 });
}
