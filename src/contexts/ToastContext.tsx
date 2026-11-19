import React, { createContext, useCallback, useContext, useState } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info';

interface ToastItem {
  id: string;
  type: ToastType;
  message: string;
}

interface ToastContextValue {
  showToast: (type: ToastType, message: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const showToast = useCallback(
    (type: ToastType, message: string) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      setToasts((prev) => [...prev.slice(-3), { id, type, message }]);
      window.setTimeout(() => {
        removeToast(id);
      }, 4000);
    },
    [removeToast]
  );

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div
        aria-live="polite"
        className="fixed bottom-5 left-5 z-50 flex flex-col gap-2.5 max-w-sm w-[calc(100vw-2.5rem)] pointer-events-none"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            role="status"
            className="pointer-events-auto flex items-center justify-between gap-3 rounded-xl border border-[#E5E8EF] bg-white px-4 py-3.5 shadow-lg shadow-[#1A3668]/8 transition-all duration-200"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              {toast.type === 'success' && (
                <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" aria-hidden="true" />
              )}
              {toast.type === 'error' && (
                <AlertCircle className="h-5 w-5 shrink-0 text-red-600" aria-hidden="true" />
              )}
              {toast.type === 'info' && (
                <Info className="h-5 w-5 shrink-0 text-[#1A3668]" aria-hidden="true" />
              )}
              <span className="text-sm font-medium text-slate-800 leading-snug">{toast.message}</span>
            </div>
            <button
              type="button"
              onClick={() => removeToast(toast.id)}
              aria-label="إغلاق الإشعار"
              className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors shrink-0"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return ctx;
}
