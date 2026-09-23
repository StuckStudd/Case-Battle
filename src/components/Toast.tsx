import { AlertTriangle, CheckCircle2, Info, Trophy, X, XCircle } from 'lucide-react';
import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { createId } from '../utils/random';
import { useT } from '../i18n';
import { cx } from '../utils/ui';

export type ToastType = 'success' | 'error' | 'info' | 'warning' | 'win' | 'loss';

export interface ToastOptions {
  type?: ToastType;
  title: string;
  message?: string;
  action?: { label: string; onClick: () => void };
  durationMs?: number;
}

interface ToastItem extends Required<Pick<ToastOptions, 'type' | 'title'>> {
  id: string;
  message?: string;
  action?: ToastOptions['action'];
}

type ToastFn = (options: ToastOptions) => void;

const ToastContext = createContext<ToastFn | null>(null);

const STYLES: Record<ToastType, { icon: typeof Info; className: string }> = {
  success: { icon: CheckCircle2, className: 'text-emerald-400 border-emerald-500/30' },
  win: { icon: Trophy, className: 'text-emerald-300 border-emerald-400/40' },
  error: { icon: XCircle, className: 'text-rose-400 border-rose-500/30' },
  loss: { icon: XCircle, className: 'text-rose-400 border-rose-500/30' },
  warning: { icon: AlertTriangle, className: 'text-amber-300 border-amber-400/30' },
  info: { icon: Info, className: 'text-sky-300 border-sky-400/30' },
};

const MAX_TOASTS = 4;

export function ToastProvider({ children }: { children: ReactNode }) {
  const translate = useT();
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const timers = useRef(new Map<string, number>());

  const dismiss = useCallback((id: string) => {
    setToasts((list) => list.filter((t) => t.id !== id));
    const timer = timers.current.get(id);
    if (timer) window.clearTimeout(timer);
    timers.current.delete(id);
  }, []);

  const toast = useCallback<ToastFn>(
    ({ type = 'info', title, message, action, durationMs = 3600 }) => {
      const id = createId('tst');
      setToasts((list) => [...list, { id, type, title, message, action }].slice(-MAX_TOASTS));
      timers.current.set(id, window.setTimeout(() => dismiss(id), durationMs));
    },
    [dismiss],
  );

  const value = useMemo(() => toast, [toast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed left-3 right-3 top-3 z-[90] flex flex-col items-stretch gap-2 sm:left-auto sm:right-4 sm:top-20 sm:w-96"
      >
        {toasts.map((t) => {
          const { icon: Icon, className } = STYLES[t.type];
          return (
            <div
              key={t.id}
              role="status"
              className={cx(
                'glass anim-toast pointer-events-auto flex min-w-0 items-start gap-3 rounded-2xl border px-4 py-3 shadow-2xl shadow-black/50',
                className,
              )}
            >
              <Icon size={20} className="mt-0.5 shrink-0" />
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold text-white">{t.title}</div>
                {t.message && <div className="mt-0.5 text-xs text-slate-400">{t.message}</div>}
                {t.action && (
                  <button
                    type="button"
                    onClick={() => {
                      t.action?.onClick();
                      dismiss(t.id);
                    }}
                    className="mt-2 text-xs font-semibold text-amber-300 hover:text-amber-300"
                  >
                    {t.action.label} →
                  </button>
                )}
              </div>
              <button
                type="button"
                aria-label={translate('common.close')}
                onClick={() => dismiss(t.id)}
                className="text-slate-500 transition hover:text-white"
              >
                <X size={16} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastFn {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>');
  return ctx;
}
