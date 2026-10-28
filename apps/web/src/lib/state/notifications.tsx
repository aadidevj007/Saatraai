'use client';

/** In-app notifications: investigation finished, execution failed, report ready, provider status. */

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

export type NotificationKind =
  | 'investigation_completed'
  | 'execution_failed'
  | 'report_ready'
  | 'provider_unavailable'
  | 'model_unavailable'
  | 'session_expired'
  | 'info';

export interface AppNotification {
  id: string;
  kind: NotificationKind;
  title: string;
  description: string;
  createdAt: string;
  read: boolean;
  href?: string;
}

interface NotificationsContextValue {
  notifications: AppNotification[];
  unread: number;
  push: (input: { kind: NotificationKind; title: string; description: string; href?: string }) => void;
  markAllRead: () => void;
  clear: () => void;
}

const NotificationsContext = createContext<NotificationsContextValue | null>(null);
const STORAGE_KEY = 'saatraai.notifications';

let counter = 0;

function load(): AppNotification[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as AppNotification[]) : [];
  } catch {
    return [];
  }
}

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  useEffect(() => {
    const t = window.setTimeout(() => setNotifications(load()), 0);
    return () => window.clearTimeout(t);
  }, []);

  const persist = useCallback((next: AppNotification[]) => {
    setNotifications(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next.slice(0, 40)));
    } catch {
      /* storage may be unavailable; in-memory still works */
    }
  }, []);

  const push = useCallback<NotificationsContextValue['push']>(
    (input) => {
      const item: AppNotification = {
        id: `n-${Date.now()}-${++counter}`,
        kind: input.kind,
        title: input.title,
        description: input.description,
        href: input.href,
        createdAt: new Date().toISOString(),
        read: false,
      };
      persist([item, ...load()].slice(0, 40));
    },
    [persist],
  );

  const markAllRead = useCallback(() => {
    persist(load().map((n) => ({ ...n, read: true })));
  }, [persist]);

  const clear = useCallback(() => persist([]), [persist]);

  const unread = notifications.filter((n) => !n.read).length;
  const value = useMemo(
    () => ({ notifications, unread, push, markAllRead, clear }),
    [notifications, unread, push, markAllRead, clear],
  );

  return <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>;
}

export function useNotifications(): NotificationsContextValue {
  const ctx = useContext(NotificationsContext);
  if (!ctx) throw new Error('useNotifications must be used inside <NotificationsProvider>');
  return ctx;
}
