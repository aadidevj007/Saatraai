'use client';

/** Shell context — pages publish their breadcrumb title and optional actions. */

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

interface ShellContextValue {
  title: string;
  subtitle?: string;
  setTitle: (title: string, subtitle?: string) => void;
}

const ShellContext = createContext<ShellContextValue | null>(null);

export function ShellProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<{ title: string; subtitle?: string }>({ title: 'Overview' });

  const value = useMemo<ShellContextValue>(
    () => ({
      title: state.title,
      subtitle: state.subtitle,
      setTitle: (title, subtitle) => setState({ title, subtitle }),
    }),
    [state.title, state.subtitle],
  );

  return <ShellContext.Provider value={value}>{children}</ShellContext.Provider>;
}

export function useShell(): ShellContextValue {
  const ctx = useContext(ShellContext);
  if (!ctx) throw new Error('useShell must be used inside <ShellProvider>');
  return ctx;
}

/** Convenience hook: set the breadcrumb title for the lifetime of a page. */
export function usePageTitle(title: string, subtitle?: string) {
  const { setTitle } = useShell();
  useEffect(() => {
    setTitle(title, subtitle);
  }, [title, subtitle, setTitle]);
}
