import { createContext, useContext, useState, useCallback } from "react";
import Toast from "../components/Toast";

const ToastContext = createContext(undefined);

export const ToastProvider = ({ children }) => {
  const [toast, setToast] = useState(null);

  const showToast = useCallback(({ type = "success", message, duration }) => {
    if (!message) return;
    setToast({ type, message, duration });
  }, []);

  const hideToast = useCallback(() => {
    setToast(null);
  }, []);

  return (
    <ToastContext.Provider value={{ toast, showToast, hideToast }}>
      {children}
      <Toast
        open={!!toast}
        type={toast?.type}
        message={toast?.message}
        duration={toast?.duration ?? 4500}
        onClose={hideToast}
      />
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return ctx;
};

