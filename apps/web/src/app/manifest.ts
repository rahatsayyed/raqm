import type { MetadataRoute } from 'next';
import { MOSS } from '@/lib/seo/constants';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Raqm',
    short_name: 'Raqm',
    description: 'A private expense tracker that reads your bank SMS on your phone.',
    start_url: '/',
    display: 'standalone',
    background_color: MOSS.canvas,
    theme_color: MOSS.canvas,
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
  };
}
