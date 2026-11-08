import { OG_CONTENT_TYPE, OG_DEFAULT_ALT, OG_SIZE } from '@/lib/seo/constants';
import { renderOg } from '@/lib/seo/og';

export const alt = OG_DEFAULT_ALT;
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export default function Image() {
  return renderOg({
    title: 'Every spend. Zero typing.',
    subtitle: 'A private expense tracker that reads your bank SMS, on your phone. No bank login, no account.',
  });
}
