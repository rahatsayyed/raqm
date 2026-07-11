import React from 'react';
import { Iconify } from 'react-native-iconify';

// All app icons come from Material Symbols (via react-native-iconify) to match
// the design system (DESIGN.md §8). Icon names are literal strings and must
// also be listed in babel.config.js's react-native-iconify plugin `icons`
// array — the plugin bundles exactly that list at build time (offline at runtime).

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

export function UtensilsCrossedIcon({ color, size = 24 }: Props) {
  return <Iconify icon="material-symbols:restaurant-rounded" size={size} color={color} />;
}

export function ShoppingBasketIcon({ color, size = 24 }: Props) {
  return <Iconify icon="material-symbols:shopping-basket-outline" size={size} color={color} />;
}

export function GroceryIcon({ color, size = 24 }: Props) {
  return <Iconify icon="material-symbols:shopping-bag-outline" size={size} color={color} />;
}

export function CarIcon({ color, size = 24 }: Props) {
  return <Iconify icon="material-symbols:directions-car-outline-rounded" size={size} color={color} />;
}

export function PlaneIcon({ color, size = 24 }: Props) {
  return <Iconify icon="material-symbols:flight-rounded" size={size} color={color} />;
}

export function ReceiptIcon({ color, size = 24 }: Props) {
  return <Iconify icon="material-symbols:receipt-long-outline-rounded" size={size} color={color} />;
}

export function HeartPulseIcon({ color, size = 24 }: Props) {
  return <Iconify icon="material-symbols:ecg-heart-outline" size={size} color={color} />;
}

export function FilmIcon({ color, size = 24 }: Props) {
  return <Iconify icon="material-symbols:movie-outline-rounded" size={size} color={color} />;
}

export function GraduationCapIcon({ color, size = 24 }: Props) {
  return <Iconify icon="material-symbols:school-outline-rounded" size={size} color={color} />;
}

export function ScissorsIcon({ color, size = 24 }: Props) {
  return <Iconify icon="material-symbols:content-cut-rounded" size={size} color={color} />;
}

export function WalletCardsIcon({ color, size = 24 }: Props) {
  return <Iconify icon="material-symbols:wallet" size={size} color={color} />;
}

export function ArrowLeftRightIcon({ color, size = 24 }: Props) {
  return <Iconify icon="material-symbols:swap-horiz-rounded" size={size} color={color} />;
}

export function CreditCardIcon({ color, size = 24 }: Props) {
  return <Iconify icon="material-symbols:credit-card-outline" size={size} color={color} />;
}

export function TrendingUpIcon({ color, size = 24 }: Props) {
  return <Iconify icon="material-symbols:trending-up-rounded" size={size} color={color} />;
}

export function GiftIcon({ color, size = 24 }: Props) {
  return <Iconify icon="material-symbols:redeem-rounded" size={size} color={color} />;
}

export function BadgePercentIcon({ color, size = 24 }: Props) {
  return <Iconify icon="material-symbols:percent-rounded" size={size} color={color} />;
}

export function CircleHelpIcon({ color, size = 24 }: Props) {
  return <Iconify icon="material-symbols:help-outline-rounded" size={size} color={color} />;
}

export function LayersIcon({ color, size = 24 }: Props) {
  return <Iconify icon="material-symbols:layers-outline-rounded" size={size} color={color} />;
}
