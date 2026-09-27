'use client';

/** Toast system — no browser alert() anywhere in this app. */

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangle, CheckCircle2, Info, X, XCircle } from 'lucide-react';

export type ToastVariant = 'success' | 'error' | 'warning' | 'info';

export interface ToastItem {
  id: string;
  variant: ToastVariant;
  title: string;
  description?: string;
  durationMs: number;
}

interface ToastContextValue {
  toast: (input: { title: string; description?: string; variant?: ToastVariant; durationMs?: number }) => void;
  dismiss: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const ICONS: Record<ToastVariant, ReactNode> = {
  success: <CheckCircle2 className="w-4 h-4 text-success" />,
  error: <XCircle className="w-4 h-4 text-danger" />,
  warning: <AlertTriangle className="w-4 h-4 text-warning" />,
  info: <Info className="w-4 h-4 text-primary" />,
};

const BORDER: Record<ToastVariant, string> = {
  success: 'border-l-success',
  error: 'border-l-danger',
  warning: 'border-l-warning',
  info: 'border-l-primary',
};

let counter = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: string) => {
    setItems((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback<ToastContextValue['toast']>(
    ({ title, description, variant = 'info', durationMs = 5000 }) => {
      const id = `toast-${++counter}`;
      setItems((prev) => [...prev.slice(-4), { id, variant, title, description, durationMs }]);
      window.setTimeout(() => dismiss(id), durationMs);
    },
    [dismiss],
  );

  const value = useMemo(() => ({ toast, dismiss }), [toast, dismiss]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        className="fixed bottom-5 right-5 z-[90] flex flex-col gap-2 w-[340px] max-w-[calc(100vw-40px)] no-print"
        role="status"
        aria-live="polite"
      >
        <AnimatePresence>
          {items.map((item) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, x: 24, scale: 0.97 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 24, scale: 0.97 }}
              transition={{ duration: 0.18 }}
              className={`flex items-start gap-3 rounded-lg border border-line border-l-2 ${BORDER[item.variant]} bg-elevated px-3.5 py-3 shadow-[0_12px_32px_rgba(0,0,0,0.45)]`}
            >
              <span className="mt-0.5 shrink-0">{ICONS[item.variant]}</span>
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-medium text-ink leading-snug">{item.title}</p>
                {item.description && (
                  <p className="text-[12px] text-ink-dim leading-snug mt-0.5 break-words">{item.description}</p>
                )}
              </div>
              <button
                onClick={() => dismiss(item.id)}
                className="text-ink-faint hover:text-ink transition-colors shrink-0"
                aria-label="Dismiss notification"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>');
  return ctx;
}
