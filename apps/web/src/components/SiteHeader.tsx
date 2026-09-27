import { StaggeredMenu } from './StaggeredMenu';

const NAV_ITEMS = [
  { label: 'Home', ariaLabel: 'Go to top of page', link: '#hero' },
  { label: 'How it works', ariaLabel: 'Go to how it works section', link: '#how-it-works' },
  { label: 'Why Raqm', ariaLabel: 'Go to why Raqm section', link: '#why-raqm' },
  { label: 'Everything free', ariaLabel: 'Go to everything you need section', link: '#everything-free' },
  { label: 'Features', ariaLabel: 'Go to features section', link: '#features' },
  { label: 'Get early access', ariaLabel: 'Go to waitlist section', link: '#waitlist' },
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
