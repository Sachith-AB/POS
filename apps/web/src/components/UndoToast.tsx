import { useEffect, useState } from 'react';

interface UndoToastProps {
  message: string;
  onUndo: () => void;
  onExpire: () => void;
}

/** 5-Second Undo Toast popup used across all pages for actions that support undo. */
export function UndoToast({ message, onUndo, onExpire }: UndoToastProps) {
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          onExpire();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [onExpire]);

  return (
    <div
      role="status"
      className="fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-2xl border border-border bg-ink text-surface px-4 py-3 shadow-2xl animate-in slide-in-from-bottom-5 duration-200"
    >
      <div className="flex items-center gap-2 text-xs font-semibold">
        <span className="text-amber-400 font-bold">Undo:</span>
        <span>{message}</span>
      </div>
      <div className="flex items-center gap-2 border-l border-surface/20 pl-3">
        <button
          type="button"
          onClick={onUndo}
          className="rounded-lg bg-primary px-3 py-1 text-xs font-bold text-white hover:bg-primary/90 transition-colors cursor-pointer shadow-xs"
        >
          Undo ({countdown}s)
        </button>
        <button
          type="button"
          onClick={onExpire}
          className="text-surface/60 hover:text-surface text-sm font-bold px-1 cursor-pointer"
          title="Dismiss"
        >
          ×
        </button>
      </div>
    </div>
  );
}

