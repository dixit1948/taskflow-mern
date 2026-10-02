import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { X } from "lucide-react";

const ToastContext = createContext(null);
let counter = 0;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const dismiss = useCallback(id => setToasts(list => list.filter(t => t.id !== id)), []);

  const push = useCallback(
    (message, options = {}) => {
      const id = ++counter;
      setToasts(list => [...list.slice(-2), { id, message, ...options }]);
      setTimeout(() => dismiss(id), options.duration ?? (options.action ? 6000 : 3500));
    },
    [dismiss]
  );

  const value = useMemo(() => push, [push]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="toasts" role="status" aria-live="polite">
        {toasts.map(t => (
          <div key={t.id} className={`toast ${t.tone === "error" ? "toast-error" : ""}`}>
            <span>{t.message}</span>
            {t.action && (
              <button
                className="toast-action"
                onClick={() => {
                  t.action.onClick();
                  dismiss(t.id);
                }}
              >
                {t.action.label}
              </button>
            )}
            <button className="icon-btn toast-close" aria-label="Dismiss" onClick={() => dismiss(t.id)}>
              <X size={16} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
