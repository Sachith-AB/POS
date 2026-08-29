import { useEffect, type ReactNode } from 'react';

interface OverlayProps {
  onClose: () => void;
  children: ReactNode;
}

/** Reusable modal shell — a backdrop plus a centered panel. Content is passed as children. */
export function Overlay({ onClose, children }: OverlayProps) {
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-xl border border-border bg-surface p-6"
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}
