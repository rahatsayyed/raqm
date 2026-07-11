import type React from 'react';
import {
  UtensilsIcon, ShoppingBasketIcon, GroceryIcon, CarIcon, PlaneIcon, ReceiptIcon,
  HeartPulseIcon, FilmIcon, GraduationCapIcon, ScissorsIcon, HouseIcon, WalletCardsIcon,
  ArrowLeftRightIcon, CreditCardIcon, TrendingUpIcon, BadgePercentIcon, GiftIcon, CircleHelpIcon,
} from '../components/TabIcon';

export type CategoryIconComponent = React.ComponentType<{ color: string; size?: number }>;

export interface CategoryDef {
  /** Canonical display name. */
  name: string;
  /** Matches DB-seeded and user-created category names (e.g. "Health", "Rent & Housing"). */
  match: RegExp;
  Icon: CategoryIconComponent;
}

/**
 * Single source of truth for category → icon everywhere in the app.
 * Order matters: the first matching entry wins.
 */
export const CATEGORIES: CategoryDef[] = [
  { name: 'Food & Dining', match: /food|dining|restaurant|coffee/i, Icon: UtensilsIcon },
  { name: 'Groceries', match: /grocer/i, Icon: ShoppingBasketIcon },
  { name: 'Shopping', match: /shop/i, Icon: GroceryIcon },
  { name: 'Transport', match: /transport|fuel|cab/i, Icon: CarIcon },
  { name: 'Travel', match: /travel|flight/i, Icon: PlaneIcon },
  { name: 'Bills & Utilities', match: /bill|utilit/i, Icon: ReceiptIcon },
  { name: 'Healthcare', match: /health|medic/i, Icon: HeartPulseIcon },
  { name: 'Entertainment', match: /entertain|movie|stream/i, Icon: FilmIcon },
  { name: 'Education', match: /education|course/i, Icon: GraduationCapIcon },
  { name: 'Personal Care', match: /personal/i, Icon: ScissorsIcon },
  { name: 'Home', match: /rent|hous|home/i, Icon: HouseIcon },
  { name: 'Salary', match: /salary|income/i, Icon: WalletCardsIcon },
  { name: 'Transfers', match: /transfer/i, Icon: ArrowLeftRightIcon },
  { name: 'Credit Card', match: /credit card/i, Icon: CreditCardIcon },
  { name: 'Investments', match: /invest/i, Icon: TrendingUpIcon },
  { name: 'Cashback & Refunds', match: /cashback|refund/i, Icon: BadgePercentIcon },
  { name: 'Gifts', match: /gift/i, Icon: GiftIcon },
  { name: 'Other', match: /other/i, Icon: CircleHelpIcon },
];

export const FALLBACK_CATEGORY_ICON: CategoryIconComponent = CircleHelpIcon;

/** Icon for a category name, or null when no entry matches (caller decides the fallback). */
export function iconForCategoryName(name: string | null | undefined): CategoryIconComponent | null {
  if (!name) return null;
  return CATEGORIES.find((c) => c.match.test(name))?.Icon ?? null;
}
