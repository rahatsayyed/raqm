import { StaggeredMenu } from './StaggeredMenu';

const NAV_ITEMS = [
  { label: 'Home', ariaLabel: 'Go to top of page', link: '#hero', previewImage: '/images/nav-preview-home.webp' },
  {
    label: 'How it works',
    ariaLabel: 'Go to how it works section',
    link: '#how-it-works',
    previewImage: '/images/nav-preview-how-it-works.webp',
  },
  {
    label: 'Why Raqm',
    ariaLabel: 'Go to why Raqm section',
    link: '#why-raqm',
    previewImage: '/images/nav-preview-why-raqm.webp',
  },
  {
    label: 'Everything free',
    ariaLabel: 'Go to everything you need section',
    link: '#everything-free',
    previewImage: '/images/nav-preview-everything-free.webp',
  },
  {
    label: 'Features',
    ariaLabel: 'Go to features section',
    link: '#features',
    previewImage: '/images/nav-preview-features.webp',
  },
  {
    label: 'Get early access',
    ariaLabel: 'Go to waitlist section',
    link: '#waitlist',
    previewImage: '/images/nav-preview-waitlist.webp',
  },
];

export function SiteHeader() {
  return (
    <StaggeredMenu
      position="right"
      items={NAV_ITEMS}
      displaySocials={false}
      displayItemNumbering
      colors={['#DCE9E3', '#2E5D4E']}
      accentColor="#2E5D4E"
      menuButtonColor="#14140F"
      openMenuButtonColor="#14140F"
      changeMenuColorOnOpen={false}
      isFixed
      closeOnClickAway
    />
  );
}
