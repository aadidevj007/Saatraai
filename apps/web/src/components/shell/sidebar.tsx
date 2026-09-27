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
  { href: '/overview', label: 'Overview', icon: LayoutDashboard, match: (p) => p === '/overview' },
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
  onToggle,
  apiOnline,
}: {
  collapsed: boolean;
  onToggle: () => void;
  apiOnline: boolean | null;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, google, signOut } = useAuth();

  const displayName = google?.name ?? user?.display_name ?? user?.email ?? 'Account';

  return (
    <aside
      className={cn(
        'relative z-30 flex h-full flex-col border-r border-line bg-surface transition-[width] duration-200',
        collapsed ? 'w-[64px]' : 'w-[232px]',
      )}
      aria-label="Primary navigation"
    >
      {/* brand */}
      <div className="flex h-14 items-center justify-between border-b border-line px-4">
        <Link href="/overview" className="flex items-center gap-2.5 overflow-hidden" aria-label="SAATRAAI overview">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-primary/40 bg-primary/10">
            <Telescope className="h-3.5 w-3.5 text-primary" />
          </span>
          {!collapsed && (
            <span className="font-mono text-[13px] font-semibold tracking-[0.22em] text-ink">SAATRAAI</span>
          )}
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
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'group relative flex items-center gap-3 rounded-lg px-2.5 py-2 text-[13px] transition-colors',
                  'focus-visible:outline-2 focus-visible:outline-primary',
                  active
                    ? 'bg-primary/10 text-primary shadow-[inset_0_0_18px_rgba(34,211,238,0.06)]'
                    : 'text-ink-dim hover:bg-elevated hover:text-ink',
                )}
              >
                {active && (
                  <span
                    className="absolute left-0 top-1/2 h-5 w-[2.5px] -translate-y-1/2 rounded-full bg-primary shadow-[0_0_8px_rgba(34,211,238,0.8)]"
                    aria-hidden
                  />
                )}
                <Icon className="h-4 w-4 shrink-0" />
                {!collapsed && <span className="truncate">{item.label}</span>}
              </Link>
            );

            return (
              <li key={item.href}>
                {collapsed ? <Tooltip label={item.label}>{link}</Tooltip> : link}
              </li>
            );
          })}
        </ul>

        {/* system status */}
        <div className="mt-4 border-t border-line pt-3">
          <Link
            href="/status"
            className={cn(
              'flex items-center gap-3 rounded-lg px-2.5 py-2 text-[13px] transition-colors',
              pathname.startsWith('/status')
                ? 'bg-primary/10 text-primary'
                : 'text-ink-dim hover:bg-elevated hover:text-ink',
            )}
          >
            <ServerCog className="h-4 w-4 shrink-0" />
            {!collapsed && <span>System Status</span>}
          </Link>
        </div>
      </nav>

      {/* account */}
      <div className="border-t border-line p-2.5">
        <div className={cn('flex items-center gap-2.5 rounded-lg px-2 py-2', collapsed && 'justify-center px-0')}>
          <Avatar src={google?.picture} name={displayName} size={collapsed ? 24 : 28} />
          {!collapsed && (
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
        {!collapsed && (
          <button
            onClick={() => {
              signOut();
              router.replace('/sign-in');
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
