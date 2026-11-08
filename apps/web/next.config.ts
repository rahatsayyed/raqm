import type { NextConfig } from 'next';

const securityHeaders = [
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Content-Security-Policy', value: "frame-ancestors 'none'" },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
];

// One day plus revalidate: asset filenames are not content-hashed, so no immutable.
const staticCache = { key: 'Cache-Control', value: 'public, max-age=86400, stale-while-revalidate=604800' };

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [
      { source: '/:path*', headers: securityHeaders },
      { source: '/images/:path*', headers: [staticCache] },
      { source: '/(icon-192.png|icon-512.png|favicon.ico|icon.svg)', headers: [staticCache] },
    ];
  },
};

export default nextConfig;
