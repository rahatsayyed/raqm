import React from 'react';
import { Iconify } from 'react-native-iconify';

// All app icons render via react-native-iconify: Material Symbols for
// navigation/action icons (DESIGN.md §8), Lucide for the Timeline category
// tiles. Every icon name used here must also be listed in babel.config.js —
// the babel plugin bundles exactly that list at build time (offline at runtime).

interface Props {
  color: string;
  size?: number;
}

// ── Navigation ──────────────────────────────────────────────────────────────

export function HomeIcon({ color, size = 24 }: Props) {
  return <Iconify icon="material-symbols:home-outline-rounded" size={size} color={color} />;
}

export function WalletIcon({ color, size = 24 }: Props) {
  return <Iconify icon="material-symbols:account-balance-wallet-outline-rounded" size={size} color={color} />;
}

export function LightbulbIcon({ color, size = 24 }: Props) {
  return <Iconify icon="material-symbols:lightbulb-outline-rounded" size={size} color={color} />;
}

export function MoreIcon({ color, size = 24 }: Props) {
  return <Iconify icon="material-symbols:more-horiz" size={size} color={color} />;
}

export function TransactionsIcon({ color, size = 24 }: Props) {
  return <Iconify icon="material-symbols:swap-vert-rounded" size={size} color={color} />;
}

export function AnalyticsIcon({ color, size = 24 }: Props) {
  return <Iconify icon="material-symbols:bar-chart-rounded" size={size} color={color} />;
}

// ── Actions / rows ──────────────────────────────────────────────────────────

export function SearchIcon({ color, size = 24 }: Props) {
  return <Iconify icon="material-symbols:search-rounded" size={size} color={color} />;
}

export function BankIcon({ color, size = 24 }: Props) {
  return <Iconify icon="material-symbols:account-balance-outline-rounded" size={size} color={color} />;
}

export function RepeatIcon({ color, size = 24 }: Props) {
  return <Iconify icon="material-symbols:autorenew-rounded" size={size} color={color} />;
}

export function BanknoteIcon({ color, size = 24 }: Props) {
  return <Iconify icon="material-symbols:payments-outline-rounded" size={size} color={color} />;
}

export function RefreshIcon({ color, size = 24 }: Props) {
  return <Iconify icon="material-symbols:refresh-rounded" size={size} color={color} />;
}

export function ExportIcon({ color, size = 24 }: Props) {
  return <Iconify icon="material-symbols:upload-rounded" size={size} color={color} />;
}

export function TrashIcon({ color, size = 24 }: Props) {
  return <Iconify icon="material-symbols:delete-outline-rounded" size={size} color={color} />;
}

export function GearIcon({ color, size = 24 }: Props) {
  return <Iconify icon="material-symbols:settings-outline-rounded" size={size} color={color} />;
}

export function PinIcon({ color, size = 24 }: Props) {
  return <Iconify icon="material-symbols:location-on-outline-rounded" size={size} color={color} />;
}

export function InfoIcon({ color, size = 24 }: Props) {
  return <Iconify icon="material-symbols:info-outline-rounded" size={size} color={color} />;
}

export function ChevronRightIcon({ color, size = 24 }: Props) {
  return <Iconify icon="material-symbols:chevron-right-rounded" size={size} color={color} />;
}

// ── Category tiles (Timeline) ───────────────────────────────────────────────

export function UtensilsIcon({ color, size = 24 }: Props) {
  return <Iconify icon="mdi:silverware-variant" size={size} color={color} />;
}

export function ShoppingBasketIcon({ color, size = 24 }: Props) {
  return <Iconify icon="lucide:shopping-basket" size={size} color={color} />;
}

export function GroceryIcon({ color, size = 24 }: Props) {
  return <Iconify icon="lucide:shopping-bag" size={size} color={color} />;
}

export function CarIcon({ color, size = 24 }: Props) {
  return <Iconify icon="lucide:car" size={size} color={color} />;
}

export function PlaneIcon({ color, size = 24 }: Props) {
  return <Iconify icon="lucide:plane" size={size} color={color} />;
}

export function ReceiptIcon({ color, size = 24 }: Props) {
  return <Iconify icon="lucide:receipt" size={size} color={color} />;
}

export function HeartPulseIcon({ color, size = 24 }: Props) {
  return <Iconify icon="lucide:heart-pulse" size={size} color={color} />;
}

export function FilmIcon({ color, size = 24 }: Props) {
  return <Iconify icon="lucide:film" size={size} color={color} />;
}

export function GraduationCapIcon({ color, size = 24 }: Props) {
  return <Iconify icon="lucide:graduation-cap" size={size} color={color} />;
}

export function ScissorsIcon({ color, size = 24 }: Props) {
  return <Iconify icon="lucide:scissors" size={size} color={color} />;
}

export function WalletCardsIcon({ color, size = 24 }: Props) {
  return <Iconify icon="lucide:wallet-cards" size={size} color={color} />;
}

export function ArrowLeftRightIcon({ color, size = 24 }: Props) {
  return <Iconify icon="lucide:arrow-left-right" size={size} color={color} />;
}

export function CreditCardIcon({ color, size = 24 }: Props) {
  return <Iconify icon="lucide:credit-card" size={size} color={color} />;
}

export function TrendingUpIcon({ color, size = 24 }: Props) {
  return <Iconify icon="lucide:trending-up" size={size} color={color} />;
}

export function TrendingDownIcon({ color, size = 24 }: Props) {
  return <Iconify icon="lucide:trending-down" size={size} color={color} />;
}

export function ArrowUpRightIcon({ color, size = 24 }: Props) {
  return <Iconify icon="lucide:arrow-up-right" size={size} color={color} />;
}

export function LandmarkIcon({ color, size = 24 }: Props) {
  return <Iconify icon="lucide:landmark" size={size} color={color} />;
}

export function PencilIcon({ color, size = 24 }: Props) {
  return <Iconify icon="lucide:pencil" size={size} color={color} />;
}

export function MessageSquareIcon({ color, size = 24 }: Props) {
  return <Iconify icon="lucide:message-square" size={size} color={color} />;
}

export function PhoneIcon({ color, size = 24 }: Props) {
  return <Iconify icon="lucide:phone" size={size} color={color} />;
}

export function GiftIcon({ color, size = 24 }: Props) {
  return <Iconify icon="lucide:gift" size={size} color={color} />;
}

export function BadgePercentIcon({ color, size = 24 }: Props) {
  return <Iconify icon="lucide:badge-percent" size={size} color={color} />;
}

export function CircleHelpIcon({ color, size = 24 }: Props) {
  return <Iconify icon="lucide:circle-question-mark" size={size} color={color} />;
}

export function LayersIcon({ color, size = 24 }: Props) {
  return <Iconify icon="lucide:layers" size={size} color={color} />;
}

export function HouseIcon({ color, size = 24 }: Props) {
  return <Iconify icon="lucide:house" size={size} color={color} />;
}

// ── Transaction Detail screen ───────────────────────────────────────────────

export function BackIcon({ color, size = 24 }: Props) {
  return <Iconify icon="material-symbols:arrow-back-rounded" size={size} color={color} />;
}

export function MoreVertIcon({ color, size = 24 }: Props) {
  return <Iconify icon="material-symbols:more-vert" size={size} color={color} />;
}

export function SplitIcon({ color, size = 24 }: Props) {
  return <Iconify icon="material-symbols:call-split-rounded" size={size} color={color} />;
}

export function LinkIcon({ color, size = 24 }: Props) {
  return <Iconify icon="material-symbols:link-rounded" size={size} color={color} />;
}

export function MergeIcon({ color, size = 24 }: Props) {
  return <Iconify icon="material-symbols:call-merge-rounded" size={size} color={color} />;
}

export function ChevronLeftIcon({ color, size = 24 }: Props) {
  return <Iconify icon="material-symbols:chevron-left-rounded" size={size} color={color} />;
}

export function CloseIcon({ color, size = 24 }: Props) {
  return <Iconify icon="material-symbols:close-rounded" size={size} color={color} />;
}

export function StorefrontIcon({ color, size = 24 }: Props) {
  return <Iconify icon="material-symbols:storefront-outline-rounded" size={size} color={color} />;
}

export function GroupWorkIcon({ color, size = 24 }: Props) {
  return <Iconify icon="material-symbols:group-work-outline" size={size} color={color} />;
}

export function AddIcon({ color, size = 24 }: Props) {
  return <Iconify icon="material-symbols:add-rounded" size={size} color={color} />;
}

// ── More screen (Automation / Preferences / Support) ────────────────────────

export function RuleIcon({ color, size = 24 }: Props) {
  return <Iconify icon="material-symbols:rule-rounded" size={size} color={color} />;
}

export function CalendarMonthIcon({ color, size = 24 }: Props) {
  return <Iconify icon="material-symbols:calendar-month-outline-rounded" size={size} color={color} />;
}

export function HelpIcon({ color, size = 24 }: Props) {
  return <Iconify icon="material-symbols:help-outline-rounded" size={size} color={color} />;
}

export function LockIcon({ color, size = 24 }: Props) {
  return <Iconify icon="material-symbols:lock-outline" size={size} color={color} />;
}

export function PaletteIcon({ color, size = 24 }: Props) {
  return <Iconify icon="material-symbols:palette-outline" size={size} color={color} />;
}

export function SupportAgentIcon({ color, size = 24 }: Props) {
  return <Iconify icon="material-symbols:support-agent-rounded" size={size} color={color} />;
}

export function ImportIcon({ color, size = 24 }: Props) {
  return <Iconify icon="material-symbols:download-rounded" size={size} color={color} />;
}

export function FlagIcon({ color, size = 24 }: Props) {
  return <Iconify icon="material-symbols:flag-outline-rounded" size={size} color={color} />;
}
