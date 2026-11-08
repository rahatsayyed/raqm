import type { Alternative } from './types';
import { axio } from './axio';
import { pennywise } from './pennywise';
import { splitwise } from './splitwise';
import { moneyManager } from './money-manager';
import { wallet } from './wallet';
import { moneyView } from './money-view';

export const ALTERNATIVES: Alternative[] = [axio, pennywise, splitwise, moneyManager, wallet, moneyView];

export function getAlternative(slug: string): Alternative | undefined {
  return ALTERNATIVES.find((a) => a.slug === slug);
}
