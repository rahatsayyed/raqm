export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://raqm.money';
export const SITE_NAME = 'Raqm';
export const AUTHOR = {
  name: 'Rahat Sayyed',
  role: 'Founder, Raqm',
  bio: 'Builds Raqm, an on-device expense tracker for India. Writes about money, privacy and the small details of reading bank SMS.',
};

export function absoluteUrl(path: string) {
  return `${SITE_URL}${path}`;
}
