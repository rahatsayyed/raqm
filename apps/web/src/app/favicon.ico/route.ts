import { ImageResponse } from 'next/og';
import { logoTile } from '@/lib/seo/og';

export const dynamic = 'force-static';

// ICO container holding one 48x48 PNG image.
export async function GET() {
  const png = new Uint8Array(await new ImageResponse(logoTile(48, 10), { width: 48, height: 48 }).arrayBuffer());
  const head = new DataView(new ArrayBuffer(22));
  head.setUint16(2, 1, true);
  head.setUint16(4, 1, true);
  head.setUint8(6, 48);
  head.setUint8(7, 48);
  head.setUint16(10, 1, true);
  head.setUint16(12, 32, true);
  head.setUint32(14, png.length, true);
  head.setUint32(18, 22, true);
  const body = new Uint8Array(22 + png.length);
  body.set(new Uint8Array(head.buffer), 0);
  body.set(png, 22);
  return new Response(body, { headers: { 'Content-Type': 'image/x-icon' } });
}
