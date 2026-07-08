import { createPortal } from 'react-dom';
import { useEffect, useState } from 'react';

/**
 * Centered animated modal for warnings, success, and confirmations.
 * Renders into document.body via a React portal — guarantees it always
 * appears centered on the full viewport regardless of where it is used.
 */
export default function CenterModal({ open, title, message, type = 'info', actions, onClose }) {
  const [active, setActive] = useState(false);

  // Lock body scroll while open
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  // Enable click actions after a short delay to prevent click-through dismissal
  useEffect(() => {
    if (!open) {
      setActive(false);
      return;
    }
    const timer = setTimeout(() => setActive(true), 350);
    return () => clearTimeout(timer);
  }, [open]);

  // Close on Escape key
  useEffect(() => {
    if (!open || !active) return;
    const handleKey = (e) => { if (e.key === 'Escape') onClose?.(); };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open, active, onClose]);

  if (!open) return null;

  const iconMap = {
    success: '✓',
    error: '✕',
    warning: '⚠',
    info: 'ℹ',
  };

  const colorMap = {
    success: 'border-cyber-neon/40 text-cyber-neon',
    error: 'border-cyber-red/40 text-cyber-red',
    warning: 'border-cyber-gold/40 text-cyber-gold',
    info: 'border-cyber-blue/40 text-cyber-blue',
  };

  return createPortal(
    /* The overlay is intentionally inline-styled to avoid any CSS cascade
       from parent components overriding the fixed positioning. */
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.5rem',
        background: 'rgba(0, 0, 0, 0.70)',
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
        pointerEvents: active ? 'auto' : 'none',
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="center-modal-title"
    >
      <div
        className="glass-card center-modal animate-slide-up"
        onClick={e => e.stopPropagation()}
        role="document"
      >
        <div className={`center-modal-icon ${colorMap[type] || colorMap.info}`}>
          {iconMap[type] || iconMap.info}
        </div>
        <h2 id="center-modal-title" className="center-modal-title">{title}</h2>
        {message && <p className="center-modal-message">{message}</p>}
        <div className="center-modal-actions">
          {actions || (
            <button type="button" onClick={onClose} className="btn-primary text-sm !py-2.5 !px-8">
              OK
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
