'use client';

/** Persistent sidebar: expand/collapse, tooltips, active indicator, status + account. */

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Boxes,
  ChevronLeft,
  Database,
  FileText,
  LayoutDashboard,
  Plus,
  Radar,
  Settings,
  ServerCog,
  Telescope,
  Waypoints,
} from 'lucide-react';

import { Avatar } from '@/components/auth/google-sign-in';
import { BrandLockup, BrandSymbol } from '@/components/brand/brand';
import { StatusDot, Tooltip } from '@/components/ui';
import { useAuth } from '@/lib/auth/auth-context';
import { cn } from '@/lib/utils';

export interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  match?: (pathname: string) => boolean;
}

export const NAV_ITEMS: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, match: (p) => p === '/dashboard' },
  {
    href: '/investigations',
    label: 'Investigations',
    icon: Telescope,
    match: (p) => p.startsWith('/investigations') && !p.startsWith('/investigations/new'),
  },
  { href: '/investigations/new', label: 'New Investigation', icon: Plus, match: (p) => p.startsWith('/investigations/new') },
  { href: '/projects', label: 'Projects', icon: Boxes, match: (p) => p.startsWith('/projects') },
  { href: '/datasets', label: 'Datasets', icon: Database, match: (p) => p.startsWith('/datasets') },
  { href: '/graph', label: 'Evidence Graph', icon: Waypoints, match: (p) => p.startsWith('/graph') },
  { href: '/reports', label: 'Reports', icon: FileText, match: (p) => p.startsWith('/reports') },
  { href: '/models', label: 'Models', icon: Radar, match: (p) => p.startsWith('/models') },
  { href: '/settings', label: 'Settings', icon: Settings, match: (p) => p.startsWith('/settings') },
];

export function Sidebar({
  collapsed,
  mobileOpen,
  onNavigate,
  onToggle,
  apiOnline,
}: {
  collapsed: boolean;
  mobileOpen: boolean;
  onNavigate: () => void;
  onToggle: () => void;
  apiOnline: boolean | null;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, google, signOut } = useAuth();

  const displayName = google?.name ?? user?.display_name ?? user?.email ?? 'Account';
  const compact = collapsed && !mobileOpen;

  return (
    <aside
      id="app-sidebar"
      className={cn(
        'fixed inset-y-0 left-0 z-50 flex h-full w-64 flex-col border-r border-line bg-surface/95 shadow-2xl backdrop-blur-xl transition-[width,transform] duration-200 md:relative md:z-30 md:translate-x-0 md:shadow-none',
        mobileOpen ? 'translate-x-0' : '-translate-x-full',
        collapsed ? 'md:w-[64px]' : 'md:w-[232px]',
      )}
      aria-label="Primary navigation"
    >
      {/* brand */}
      <div className="flex h-14 items-center justify-between border-b border-line px-4">
        <Link href="/dashboard" className="flex items-center overflow-hidden" aria-label="SAATRAAI overview">
          {compact ? <BrandSymbol className="h-7 w-7" /> : <BrandLockup symbolClassName="h-7 w-7" wordmarkClassName="text-[12px]" />}
        </Link>
        <button
          onClick={onToggle}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className={cn(
            'hidden h-6 w-6 items-center justify-center rounded text-ink-faint transition-colors hover:bg-elevated hover:text-ink md:flex',
            collapsed && 'rotate-180',
          )}
        >
          <ChevronLeft className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* nav */}
      <nav className="flex-1 overflow-y-auto px-2.5 py-3" aria-label="Sections">
        <ul className="space-y-0.5">
          {NAV_ITEMS.map((item) => {
            const active = item.match ? item.match(pathname) : pathname === item.href;
            const Icon = item.icon;
            const link = (
              <Link
                key={item.href}
                href={item.href}
                onClick={onNavigate}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'group relative flex items-center gap-3 rounded-lg px-2.5 py-2 text-[13px] transition-colors',
                  'focus-visible:outline-2 focus-visible:outline-primary',
                  active
                    ? 'bg-primary/10 text-primary shadow-[inset_0_0_18px_rgba(181,31,45,0.045)]'
                    : 'text-ink-dim hover:bg-elevated hover:text-ink',
                )}
              >
                {active && (
                  <span
                    className="absolute left-0 top-1/2 h-5 w-[2.5px] -translate-y-1/2 rounded-full bg-primary shadow-[0_0_8px_rgba(181,31,45,0.3)]"
                    aria-hidden
                  />
                )}
                <Icon className="h-4 w-4 shrink-0" />
                {!compact && <span className="truncate">{item.label}</span>}
              </Link>
            );

            return (
              <li key={item.href}>
                {compact ? <Tooltip label={item.label}>{link}</Tooltip> : link}
              </li>
            );
          })}
        </ul>

        {/* system status */}
        <div className="mt-4 border-t border-line pt-3">
          <Link
            href="/status"
            onClick={onNavigate}
            className={cn(
              'flex items-center gap-3 rounded-lg px-2.5 py-2 text-[13px] transition-colors',
              pathname.startsWith('/status')
                ? 'bg-primary/10 text-primary'
                : 'text-ink-dim hover:bg-elevated hover:text-ink',
            )}
          >
            <ServerCog className="h-4 w-4 shrink-0" />
            {!compact && <span>System Status</span>}
          </Link>
        </div>
      </nav>

      {/* account */}
      <div className="border-t border-line p-2.5">
        <div className={cn('flex items-center gap-2.5 rounded-lg px-2 py-2', compact && 'justify-center px-0')}>
          <Avatar src={google?.picture} name={displayName} size={compact ? 24 : 28} />
          {!compact && (
            <div className="min-w-0 flex-1">
              <div className="truncate text-[12.5px] font-medium text-ink">{displayName}</div>
              <div className="flex items-center gap-1.5">
                <StatusDot state={apiOnline === null ? 'unknown' : apiOnline ? 'online' : 'offline'} />
                <span className="font-mono text-[9.5px] uppercase tracking-[0.14em] text-ink-faint">
                  API {apiOnline === null ? 'checking' : apiOnline ? 'online' : 'offline'}
                </span>
              </div>
            </div>
          )}
        </div>
        {!compact && (
          <button
            onClick={() => {
              signOut();
              router.replace('/auth/sign-in');
            }}
            className="mt-1 w-full rounded-lg px-2.5 py-1.5 text-left text-[12px] text-ink-faint transition-colors hover:bg-elevated hover:text-danger"
          >
            Sign out
          </button>
        )}
      </div>
    </aside>
  );
}
