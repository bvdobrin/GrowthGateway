import { LayoutDashboard, Library, Network, ScrollText, ShieldCheck, Sparkles, Upload, type LucideIcon } from 'lucide-react';
import type { Permission } from '@/types';

export interface NavItem {
  to: string;
  labelKey: string;
  icon: LucideIcon;
  permission?: Permission;
  section: 'work' | 'governance';
  /** Paths that also mark this item active. */
  match?: (pathname: string) => boolean;
}

export const NAV_ITEMS: NavItem[] = [
  { to: '/', labelKey: 'dashboard', icon: LayoutDashboard, section: 'work', match: (p) => p === '/' },
  {
    to: '/assets',
    labelKey: 'library',
    icon: Library,
    section: 'work',
    match: (p) => p.startsWith('/assets') && !p.startsWith('/assets/new'),
  },
  { to: '/assets/new', labelKey: 'addAsset', icon: Upload, permission: 'asset:upload', section: 'work' },
  { to: '/generate', labelKey: 'generate', icon: Sparkles, permission: 'asset:generate', section: 'work' },
  { to: '/approvals', labelKey: 'approvals', icon: ShieldCheck, permission: 'asset:approve', section: 'governance' },
  { to: '/audit', labelKey: 'audit', icon: ScrollText, permission: 'admin:audit', section: 'governance' },
  { to: '/admin/taxonomy', labelKey: 'taxonomy', icon: Network, permission: 'admin:taxonomy', section: 'governance' },
];
