'use client';

/** Top bar: breadcrumb, system status, notifications, Google avatar menu. */

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Fragment, useState } from 'react';
import { Bell, CheckCheck, ChevronRight, KeyRound, LogOut, Settings } from 'lucide-react';

import { Avatar } from '@/components/auth/google-sign-in';
import { Dropdown, Kbd, StatusDot } from '@/components/ui';
import { useAuth } from '@/lib/auth/auth-context';
import { useNotifications } from '@/lib/state/notifications';
import { cn, timeAgo } from '@/lib/utils';
import { useShell } from './shell-context';

const ROUTE_LABELS: Record<string, string> = {
  overview: 'Overview',
  investigations: 'Investigations',
  new: 'New Investigation',
  projects: 'Projects',
  datasets: 'Datasets',
  graph: 'Evidence Graph',
  reports: 'Reports',
  models: 'Models',
  settings: 'Settings',
  status: 'System Status',
  profile: 'Profile',
};

export function TopBar({ apiOnline, onOpenPalette }: { apiOnline: boolean | null; onOpenPalette: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const { title } = useShell();
  const { user, google, signOut } = useAuth();
  const { notifications, unread, markAllRead } = useNotifications();
  const [bellOpen, setBellOpen] = useState(false);

  const segments = pathname.split('/').filter(Boolean);
  const displayName = google?.name ?? user?.display_name ?? user?.email ?? 'Account';
  const isInvestigation = segments[0] === 'investigations' && segments.length > 1 && segments[1] !== 'new';

  return (
    <header className="relative z-30 flex h-14 shrink-0 items-center justify-between gap-4 border-b border-line bg-surface px-4">
      {/* breadcrumb */}
      <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-1.5 text-[12.5px]">
        <Link href="/overview" className="text-ink-faint transition-colors hover:text-ink">
          SAATRAAI
        </Link>
        {segments.length === 0 && <ChevronRight className="h-3 w-3 text-ink-faint" />}
        {segments.map((segment, i) => {
          const href = `/${segments.slice(0, i + 1).join('/')}`;
          const label = ROUTE_LABELS[segment] ?? segment;
          const isLast = i === segments.length - 1;
          return (
            <Fragment key={href}>
              <ChevronRight className="h-3 w-3 shrink-0 text-ink-faint" />
              {isLast ? (
                <span className="truncate font-medium text-ink" aria-current="page">
                  {isInvestigation && title !== 'Investigations' ? title : label}
                </span>
              ) : (
                <Link href={href} className="truncate text-ink-dim transition-colors hover:text-ink">
                  {label}
                </Link>
              )}
            </Fragment>
          );
        })}
      </nav>

      {/* right cluster */}
      <div className="flex shrink-0 items-center gap-2.5">
        <button
          onClick={onOpenPalette}
          className="hidden items-center gap-2 rounded-lg border border-line bg-elevated px-2.5 py-1.5 text-[11.5px] text-ink-faint transition-colors hover:border-line-strong hover:text-ink-dim md:flex"
          aria-label="Open command palette"
        >
          Search or jump to…
          <Kbd>Ctrl K</Kbd>
        </button>

        <span className="hidden items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-faint sm:flex">
          <StatusDot state={apiOnline === null ? 'unknown' : apiOnline ? 'online' : 'offline'} />
          {apiOnline === null ? 'API checking' : apiOnline ? 'API online' : 'API offline'}
        </span>

        {/* notifications */}
        <div className="relative">
          <button
            onClick={() => setBellOpen((v) => !v)}
            aria-label={`Notifications (${unread} unread)`}
            className="relative flex h-8 w-8 items-center justify-center rounded-lg text-ink-dim transition-colors hover:bg-elevated hover:text-ink"
          >
            <Bell className="h-4 w-4" />
            {unread > 0 && (
              <span className="absolute right-1 top-1 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-primary px-1 font-mono text-[9px] font-semibold text-[#04222b]">
                {unread}
              </span>
            )}
          </button>
          {bellOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setBellOpen(false)} aria-hidden />
              <div className="absolute right-0 z-50 mt-1.5 w-80 overflow-hidden rounded-lg border border-line-strong bg-elevated shadow-[0_16px_48px_rgba(0,0,0,0.5)]">
                <div className="flex items-center justify-between border-b border-line px-3 py-2.5">
                  <span className="text-[12px] font-medium text-ink">Notifications</span>
                  <button
                    onClick={markAllRead}
                    className="flex items-center gap-1 text-[11px] text-ink-faint transition-colors hover:text-primary"
                  >
                    <CheckCheck className="h-3 w-3" /> Mark all read
                  </button>
                </div>
                <div className="max-h-80 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <p className="px-3 py-6 text-center text-[12px] text-ink-faint">
                      No notifications yet. Execution results and provider outages appear here.
                    </p>
                  ) : (
                    notifications.map((n) => (
                      <div
                        key={n.id}
                        className={cn(
                          'border-b border-line px-3 py-2.5 last:border-b-0',
                          !n.read && 'bg-primary/5',
                        )}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span className="text-[12.5px] font-medium text-ink">{n.title}</span>
                          <span className="shrink-0 font-mono text-[9.5px] text-ink-faint">{timeAgo(n.createdAt)}</span>
                        </div>
                        <p className="mt-0.5 text-[11.5px] leading-snug text-ink-dim">{n.description}</p>
                        {n.href && (
                          <Link
                            href={n.href}
                            onClick={() => setBellOpen(false)}
                            className="mt-1 inline-block text-[11.5px] text-primary hover:underline"
                          >
                            Open →
                          </Link>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {/* avatar menu */}
        <Dropdown
          ariaLabel="Account menu"
          trigger={
            <span className="flex items-center gap-2 rounded-lg px-1.5 py-1 transition-colors hover:bg-elevated">
              <Avatar src={google?.picture} name={displayName} size={26} />
              <span className="hidden max-w-36 truncate text-[12.5px] text-ink-dim sm:block">{displayName}</span>
            </span>
          }
          items={[
            { id: 'profile', label: 'Profile', icon: <KeyRound className="h-3.5 w-3.5" />, onSelect: () => router.push('/profile') },
            { id: 'settings', label: 'Settings', icon: <Settings className="h-3.5 w-3.5" />, onSelect: () => router.push('/settings') },
            {
              id: 'signout',
              label: 'Sign out',
              icon: <LogOut className="h-3.5 w-3.5" />,
              danger: true,
              onSelect: () => {
                signOut();
                router.replace('/sign-in');
              },
            },
          ]}
        />
      </div>
    </header>
  );
}
