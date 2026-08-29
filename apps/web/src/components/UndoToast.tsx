import { useEffect } from 'react';
import { UNDO_TOAST_MS } from '@pos/shared';

interface UndoToastProps {
  message: string;
  onUndo: () => void;
  onExpire: () => void;
}

/** Section 2: destructive actions get a 5s undo toast instead of a confirm dialog. */
export function UndoToast({ message, onUndo, onExpire }: UndoToastProps) {
  useEffect(() => {
    const timer = setTimeout(onExpire, UNDO_TOAST_MS);
    return () => clearTimeout(timer);
  }, [onExpire]);

  return (
    <div
      role="status"
      className="fixed bottom-5 left-1/2 z-50 flex -translate-x-1/2 items-center gap-3 rounded-xl bg-ink px-4 py-2.5 text-canvas"
    >
      <span>{message}</span>
      <button onClick={onUndo} className="font-bold text-primary-hover">
        Undo
      </button>
    </div>
  );
}
