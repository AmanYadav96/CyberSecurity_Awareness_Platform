import { createContext, useContext, useState, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';

/**
 * Global center-screen notification system that REPLACES react-hot-toast.
 * Shows short auto-dismissing messages in the CENTER of the screen,
 * not in the corner. Usage:
 *   const notify = useNotify();
 *   notify.success('Done!');
 *   notify.error('Something failed');
 *   notify.info('Just so you know');
 */

const NotifyContext = createContext(null);

export function NotifyProvider({ children }) {
  const [notifications, setNotifications] = useState([]);
  const idRef = useRef(0);

  const show = useCallback((type, message, duration = 3200) => {
    const id = ++idRef.current;
    setNotifications(prev => [...prev, { id, type, message }]);
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, duration);
  }, []);

  const dismiss = useCallback((id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  const notify = {
    success: (msg, dur) => show('success', msg, dur),
    error:   (msg, dur) => show('error',   msg, dur),
    info:    (msg, dur) => show('info',    msg, dur),
    warning: (msg, dur) => show('warning', msg, dur),
  };

  const iconMap = {
    success: '✓',
    error:   '✕',
    warning: '⚠',
    info:    'ℹ',
  };

  const colorMap = {
    success: {
      border: 'rgba(57, 255, 20, 0.35)',
      bg:     'rgba(57, 255, 20, 0.08)',
      icon:   '#39ff14',
      iconBg: 'rgba(57, 255, 20, 0.15)',
      text:   '#39ff14',
    },
    error: {
      border: 'rgba(255, 51, 102, 0.4)',
      bg:     'rgba(255, 51, 102, 0.08)',
      icon:   '#ff3366',
      iconBg: 'rgba(255, 51, 102, 0.18)',
      text:   '#ff3366',
    },
    warning: {
      border: 'rgba(251, 191, 36, 0.4)',
      bg:     'rgba(251, 191, 36, 0.07)',
      icon:   '#fbbf24',
      iconBg: 'rgba(251, 191, 36, 0.15)',
      text:   '#fbbf24',
    },
    info: {
      border: 'rgba(0, 212, 255, 0.35)',
      bg:     'rgba(0, 212, 255, 0.07)',
      icon:   '#00d4ff',
      iconBg: 'rgba(0, 212, 255, 0.15)',
      text:   '#00d4ff',
    },
  };

  return (
    <NotifyContext.Provider value={notify}>
      {children}
      {notifications.length > 0 && createPortal(
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 99998,
            pointerEvents: 'none',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.75rem',
            padding: '1rem',
          }}
        >
          {notifications.map(n => {
            const c = colorMap[n.type] || colorMap.info;
            return (
              <div
                key={n.id}
                onClick={() => dismiss(n.id)}
                style={{
                  pointerEvents: 'auto',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.875rem',
                  padding: '1rem 1.375rem',
                  borderRadius: '14px',
                  border: `1.5px solid ${c.border}`,
                  background: `rgba(17, 24, 39, 0.96)`,
                  backdropFilter: 'blur(20px)',
                  WebkitBackdropFilter: 'blur(20px)',
                  boxShadow: `0 8px 40px rgba(0,0,0,0.4), 0 0 0 1px ${c.border}`,
                  maxWidth: '28rem',
                  width: '100%',
                  cursor: 'pointer',
                  animation: 'notifyIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
                }}
                role="alert"
                title="Click to dismiss"
              >
                {/* Icon */}
                <span style={{
                  flexShrink: 0,
                  width: '2.25rem',
                  height: '2.25rem',
                  borderRadius: '50%',
                  background: c.iconBg,
                  border: `1.5px solid ${c.border}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1rem',
                  fontWeight: 700,
                  color: c.icon,
                }}>
                  {iconMap[n.type]}
                </span>

                {/* Message */}
                <span style={{
                  flex: 1,
                  fontSize: '0.9rem',
                  fontWeight: 500,
                  color: '#e2e8f0',
                  lineHeight: 1.5,
                }}>
                  {n.message}
                </span>

                {/* Dismiss X */}
                <span style={{
                  flexShrink: 0,
                  fontSize: '1rem',
                  color: 'rgba(148, 163, 184, 0.6)',
                  lineHeight: 1,
                }}>
                  ×
                </span>
              </div>
            );
          })}
        </div>,
        document.body
      )}
    </NotifyContext.Provider>
  );
}

export function useNotify() {
  const ctx = useContext(NotifyContext);
  if (!ctx) throw new Error('useNotify must be used inside <NotifyProvider>');
  return ctx;
}
