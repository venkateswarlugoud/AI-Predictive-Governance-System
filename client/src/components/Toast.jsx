import { useEffect } from "react";
import "./Toast.css";

/**
 * In-app toast notification (not browser/Chrome notification).
 * Fixed position, auto-dismiss, success/error styling.
 */
const Toast = ({ open, type = "success", message, onClose, duration = 4500 }) => {
  useEffect(() => {
    if (!open || !onClose || !duration) return;
    const t = setTimeout(onClose, duration);
    return () => clearTimeout(t);
  }, [open, onClose, duration]);

  if (!open || !message) return null;

  const isSuccess = type === "success";

  return (
    <div
      className="toast"
      role="alert"
      aria-live="polite"
      data-type={type}
    >
      <div className="toast__icon">
        {isSuccess ? (
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <path fillRule="evenodd" clipRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" fill="currentColor" />
          </svg>
        ) : (
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <path fillRule="evenodd" clipRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" fill="currentColor" />
          </svg>
        )}
      </div>
      <p className="toast__message">{message}</p>
      <button
        type="button"
        className="toast__close"
        onClick={onClose}
        aria-label="Dismiss notification"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </button>
      <div className="toast__progress" style={{ animationDuration: `${duration}ms` }} />
    </div>
  );
};

export default Toast;
