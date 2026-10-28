'use client';

/** Application shell: auth guard + sidebar + topbar + palette + shortcuts. */

import { useCallback, useEffect, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';

import { CommandPalette } from '@/components/shell/command-palette';
import { ShortcutsHelp } from '@/components/shell/shortcuts-help';
import { ShellProvider } from '@/components/shell/shell-context';
import { Sidebar } from '@/components/shell/sidebar';
import { TopBar } from '@/components/shell/topbar';
import { LoadingState } from '@/components/ui';
import { useAuth } from '@/lib/auth/auth-context';
import { probeApi } from '@/lib/api';

const SIDEBAR_KEY = 'saatraai.sidebar-collapsed';

export function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { status, needsProfile } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const mobileNavTrigger = useRef<HTMLButtonElement>(null);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [apiOnline, setApiOnline] = useState<boolean | null>(null);

  /* restore sidebar state */
  useEffect(() => {
    const t = window.setTimeout(() => setCollapsed(window.localStorage.getItem(SIDEBAR_KEY) === '1'), 0);
    return () => window.clearTimeout(t);
  }, []);

  const toggleSidebar = useCallback(() => {
    setCollapsed((prev) => {
      window.localStorage.setItem(SIDEBAR_KEY, prev ? '0' : '1');
      return !prev;
    });
  }, []);

  useEffect(() => {
    if (!mobileOpen) return;
    const sidebar = document.getElementById('app-sidebar');
    const focusable = () => Array.from(sidebar?.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
    ) ?? []).filter((element) => element.getClientRects().length > 0);
    focusable()[0]?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        setMobileOpen(false);
        mobileNavTrigger.current?.focus();
        return;
      }
      if (event.key !== 'Tab') return;
      const items = focusable();
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [mobileOpen]);

  /* guards */
  useEffect(() => {
    if (status === 'unauthenticated') router.replace('/auth/sign-in');
    else if (status === 'authenticated' && needsProfile) router.replace('/profile');
  }, [status, needsProfile, router]);

  /* API reachability */
  useEffect(() => {
    let alive = true;
    const check = () => probeApi().then((ok) => alive && setApiOnline(ok));
    check();
    const timer = window.setInterval(check, 30_000);
    return () => {
      alive = false;
      window.clearInterval(timer);
    };
  }, []);

  /* app-wide keyboard shortcuts */
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const typing =
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable);

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPaletteOpen((v) => !v);
        return;
      }
      if (typing || e.ctrlKey || e.metaKey || e.altKey) return;

      if (e.key === '?') {
        e.preventDefault();
        setShortcutsOpen(true);
        return;
      }

      const key = e.key.toLowerCase();
      const routes: Record<string, string> = {
        n: '/investigations/new',
        i: '/investigations',
        g: '/graph',
        r: '/reports',
        o: '/dashboard',
        d: '/datasets',
        p: '/projects',
        s: '/settings',
      };
      if (routes[key]) {
        e.preventDefault();
        router.push(routes[key]);
      }
      /* M and E are workspace-scoped: forward through a custom event. */
      if (key === 'm' || key === 'e') {
        window.dispatchEvent(new CustomEvent('saatraai:shortcut', { detail: { key } }));
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [router]);

  if (status === 'loading' || status === 'unauthenticated') {
    return (
      <div className="flex h-screen items-center justify-center bg-void">
        <div className="w-72">
          <LoadingState label={status === 'loading' ? 'Restoring session…' : 'Redirecting to sign-in…'} rows={2} />
        </div>
      </div>
    );
  }

  return (
    <ShellProvider>
      <div className="flex h-screen overflow-hidden bg-void">
        {mobileOpen && (
          <button
            type="button"
            className="fixed inset-0 z-40 bg-black/65 backdrop-blur-[2px] md:hidden"
            aria-label="Close navigation"
            onClick={() => setMobileOpen(false)}
          />
        )}
        <Sidebar collapsed={collapsed} mobileOpen={mobileOpen} onNavigate={() => setMobileOpen(false)} onToggle={toggleSidebar} apiOnline={apiOnline} />
        <div className="flex min-w-0 flex-1 flex-col">
          <TopBar apiOnline={apiOnline} mobileNavOpen={mobileOpen} mobileNavTrigger={mobileNavTrigger} onOpenPalette={() => setPaletteOpen(true)} onToggleSidebar={() => setMobileOpen((open) => !open)} />
          <main className="min-h-0 flex-1 overflow-y-auto">
            <motion.div
              key={pathname}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.24, ease: 'easeOut' }}
            >
              {children}
            </motion.div>
          </main>
        </div>
      </div>
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
      <ShortcutsHelp open={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />
    </ShellProvider>
  );
}
