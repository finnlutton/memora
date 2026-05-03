"use client";

import { createContext, useCallback, useContext, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Info, X, AlertCircle } from "lucide-react";

export type ToastType = "success" | "error" | "info";

type ToastItem = {
  id: string;
  message: string;
  type: ToastType;
};

type ToastContextValue = {
  addToast: (message: string, type?: ToastType) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

let toastCounter = 0;
function nextToastId() {
  toastCounter += 1;
  return `toast-${toastCounter}`;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const removeToast = useCallback((id: string) => {
    setToasts((current) => current.filter((t) => t.id !== id));
    const timer = timers.current.get(id);
    if (timer !== undefined) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
  }, []);

  const addToast = useCallback(
    (message: string, type: ToastType = "info") => {
      const id = nextToastId();
      setToasts((current) => [...current, { id, message, type }]);
      const timer = setTimeout(() => removeToast(id), 4000);
      timers.current.set(id, timer);
    },
    [removeToast],
  );

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      <div
        aria-live="polite"
        aria-label="Notifications"
        style={{
          bottom:
            "calc(env(safe-area-inset-bottom, 0px) + var(--memora-bottom-banner, 0px) + 1.25rem)",
        }}
        className="pointer-events-none fixed right-4 z-[9999] flex flex-col items-end gap-2 md:right-7"
      >
        <AnimatePresence initial={false}>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: 12, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 6, scale: 0.97, transition: { duration: 0.14 } }}
              transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
              className="pointer-events-auto flex w-full max-w-[22rem] items-start gap-3 rounded-[8px] border border-[color:var(--border)] bg-[rgba(251,253,255,0.98)] px-4 py-3 shadow-[0_8px_28px_rgba(14,22,34,0.13)] backdrop-blur-sm"
            >
              <span className="mt-[1px] shrink-0">
                {toast.type === "success" && (
                  <Check className="h-4 w-4 text-[rgba(45,120,75,0.85)]" />
                )}
                {toast.type === "error" && (
                  <AlertCircle className="h-4 w-4 text-[color:var(--error-text)]" />
                )}
                {toast.type === "info" && (
                  <Info className="h-4 w-4 text-[color:var(--accent)]" />
                )}
              </span>
              <p className="flex-1 text-sm leading-5 text-[color:var(--ink)]">{toast.message}</p>
              <button
                type="button"
                onClick={() => removeToast(toast.id)}
                className="mt-[1px] shrink-0 text-[color:var(--ink-faint)] transition hover:text-[color:var(--ink)]"
                aria-label="Dismiss notification"
              >
                <X className="h-3.5 w-3.5" />
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
  if (!ctx) {
    // Graceful no-op when used outside provider
    return { addToast: () => {} };
  }
  return ctx;
}
