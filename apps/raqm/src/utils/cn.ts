import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// Default utility for conditional NativeWind classNames across the app —
// clsx resolves conditional/falsy class entries, twMerge then dedupes
// conflicting Tailwind classes (last one wins) so callers can safely
// override a base className with a conditional one.
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
