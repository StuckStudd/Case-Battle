import {
  ArrowUpCircle,
  Backpack,
  Box,
  Dices,
  History,
  Library,
  ListChecks,
  Repeat2,
  Trophy,
  Settings,
  ShoppingBag,
  UserRound,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { TKey } from '../i18n';
import type { Page } from '../types/types';

export interface NavItem {
  page: Page;
  label: TKey;
  icon: LucideIcon;
}

export const NAV_ITEMS: NavItem[] = [
  { page: 'upgrade', label: 'nav.upgrade', icon: ArrowUpCircle },
  { page: 'cases', label: 'nav.cases', icon: Box },
  { page: 'contracts', label: 'nav.contracts', icon: Repeat2 },
  { page: 'games', label: 'nav.games', icon: Dices },
  { page: 'inventory', label: 'nav.inventory', icon: Backpack },
  { page: 'shop', label: 'nav.shop', icon: ShoppingBag },
  { page: 'quests', label: 'nav.quests', icon: ListChecks },
  { page: 'collections', label: 'nav.collections', icon: Library },
  { page: 'leaderboard', label: 'nav.leaderboard', icon: Trophy },
  { page: 'history', label: 'nav.history', icon: History },
  { page: 'profile', label: 'nav.profile', icon: UserRound },
  { page: 'settings', label: 'nav.settings', icon: Settings },
];

/** Pages pinned to the mobile bottom bar; the rest live in the menu sheet. */
export const MOBILE_PRIMARY: Page[] = ['upgrade', 'cases', 'games', 'inventory'];
