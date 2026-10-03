'use client';

/** Command palette (Ctrl+K). */

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import {
  FileText,
  GitBranch,
  LayoutDashboard,
  LogOut,
  Map,
  Plus,
  Radar,
  Search,
  Settings,
  Telescope,
  Waypoints,
} from 'lucide-react';

import { Kbd } from '@/components/ui';
import { useAuth } from '@/lib/auth/auth-context';
import { cn } from '@/lib/utils';

interface Command {
  id: string;
  label: string;
  hint?: string;
  icon: React.ComponentType<{ className?: string }>;
  run: () => void;
}

export function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const { signOut } = useAuth();
  const [query, setQuery] = useState('');
  const [index, setIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const commands = useMemo<Command[]>(
    () => [
      { id: 'new', label: 'New Investigation', hint: 'N', icon: Plus, run: () => router.push('/investigations/new') },
      { id: 'list', label: 'Search Investigations', hint: 'I', icon: Telescope, run: () => router.push('/investigations') },
      { id: 'dashboard', label: 'Open Dashboard', icon: LayoutDashboard, run: () => router.push('/dashboard') },
      { id: 'graph', label: 'Open Evidence Graph', hint: 'G', icon: Waypoints, run: () => router.push('/graph') },
      { id: 'reports', label: 'Open Reports', hint: 'R', icon: FileText, run: () => router.push('/reports') },
      { id: 'datasets', label: 'Open Datasets', icon: GitBranch, run: () => router.push('/datasets') },
      { id: 'models', label: 'Open Models', icon: Radar, run: () => router.push('/models') },
      { id: 'projects', label: 'Open Projects', icon: Telescope, run: () => router.push('/projects') },
      { id: 'map', label: 'Open latest investigation map', hint: 'M', icon: Map, run: () => router.push('/investigations') },
      { id: 'status', label: 'System Status', icon: Radar, run: () => router.push('/status') },
      { id: 'settings', label: 'Settings', icon: Settings, run: () => router.push('/settings') },
      {
        id: 'signout',
        label: 'Sign Out',
        icon: LogOut,
        run: () => {
          signOut();
          router.replace('/auth/sign-in');
        },
      },
    ],
    [router, signOut],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return commands;
    return commands.filter((c) => c.label.toLowerCase().includes(q));
  }, [commands, query]);

  useEffect(() => {
    if (!open) return;
    const t = window.setTimeout(() => {
      setQuery('');
      setIndex(0);
      inputRef.current?.focus();
    }, 30);
    return () => window.clearTimeout(t);
  }, [open]);

  useEffect(() => {
    const t = window.setTimeout(() => setIndex(0), 0);
    return () => window.clearTimeout(t);
  }, [query]);

  const execute = (command: Command | undefined) => {
    if (!command) return;
    onClose();
    command.run();
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setIndex((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      execute(filtered[index]);
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[85] flex items-start justify-center pt-[14vh] no-print" role="dialog" aria-modal="true" aria-label="Command palette">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-[2px]"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, y: -12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.16 }}
            className="relative w-full max-w-lg overflow-hidden rounded-xl border border-line-strong bg-surface shadow-[0_28px_80px_rgba(0,0,0,0.6)]"
          >
            <div className="flex items-center gap-2.5 border-b border-line px-4 py-3">
              <Search className="h-4 w-4 shrink-0 text-ink-faint" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder="Type a command…"
                className="w-full bg-transparent text-[13.5px] text-ink placeholder:text-ink-faint focus:outline-none"
                aria-label="Command"
              />
              <Kbd>Esc</Kbd>
            </div>
            <div ref={listRef} className="max-h-72 overflow-y-auto py-1.5" role="listbox">
              {filtered.length === 0 && (
                <p className="px-4 py-6 text-center text-[12.5px] text-ink-faint">No matching commands.</p>
              )}
              {filtered.map((command, i) => {
                const Icon = command.icon;
                const active = i === index;
                return (
                  <button
                    key={command.id}
                    role="option"
                    aria-selected={active}
                    onMouseEnter={() => setIndex(i)}
                    onClick={() => execute(command)}
                    className={cn(
                      'flex w-full items-center gap-3 px-4 py-2.5 text-left text-[13px] transition-colors',
                      active ? 'bg-primary/10 text-primary' : 'text-ink-dim',
                    )}
                  >
                    <Icon className="h-3.5 w-3.5 shrink-0" />
                    <span className="flex-1 truncate">{command.label}</span>
                    {command.hint && <Kbd>{command.hint}</Kbd>}
                  </button>
                );
              })}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
