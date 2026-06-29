import { useCallback, useMemo, useState, type ReactNode } from 'react';
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';
import { ToastContext, type ToastItem, type ToastOptions, type ToastVariant } from './toastContext';

interface ToastProviderProps {
  children: ReactNode;
}

const variantStyles: Record<ToastVariant, string> = {
  success: 'border-green-100 bg-green-50 text-green-800',
  error: 'border-red-100 bg-red-50 text-red-800',
  info: 'border-indigo-100 bg-indigo-50 text-indigo-800',
};

const iconStyles: Record<ToastVariant, string> = {
  success: 'text-green-600',
  error: 'text-red-600',
  info: 'text-indigo-600',
};

const icons = {
  success: CheckCircle2,
  error: AlertCircle,
  info: Info,
};

function createToastId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random()}`;
}

export function ToastProvider({ children }: ToastProviderProps) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismissToast = useCallback((id: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const showToast = useCallback((options: ToastOptions) => {
    const id = createToastId();
    const toast: ToastItem = {
      id,
      message: options.message,
      title: options.title,
      variant: options.variant ?? 'info',
      durationMs: options.durationMs,
    };

    setToasts((current) => [toast, ...current].slice(0, 4));
    window.setTimeout(() => dismissToast(id), options.durationMs ?? 4500);
  }, [dismissToast]);

  const value = useMemo(() => ({ showToast, dismissToast }), [showToast, dismissToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed right-4 top-4 z-[200] flex w-[calc(100vw-2rem)] max-w-sm flex-col gap-3" aria-live="polite" aria-atomic="true">
        {toasts.map((toast) => {
          const Icon = icons[toast.variant];

          return (
            <div
              key={toast.id}
              className={`flex items-start gap-3 rounded-2xl border px-4 py-3 shadow-xl shadow-slate-200/60 backdrop-blur animate-in slide-in-from-top-2 fade-in duration-200 ${variantStyles[toast.variant]}`}
              role={toast.variant === 'error' ? 'alert' : 'status'}
            >
              <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${iconStyles[toast.variant]}`} />
              <div className="min-w-0 flex-1">
                {toast.title && <p className="text-sm font-black leading-5">{toast.title}</p>}
                <p className="text-sm font-bold leading-5">{toast.message}</p>
              </div>
              <button
                type="button"
                aria-label="通知を閉じる"
                className="rounded-lg p-1 opacity-60 transition hover:bg-white/70 hover:opacity-100"
                onClick={() => dismissToast(toast.id)}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}
