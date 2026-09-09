import { FiAlertTriangle } from 'react-icons/fi';
import { Button } from './Button';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmModal({
  isOpen,
  title,
  message,
  confirmLabel = 'Delete',
  cancelLabel = 'Cancel',
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-in fade-in duration-150">
      <div
        className="w-full max-w-md rounded-2xl border border-border bg-surface p-6 shadow-2xl animate-in zoom-in-95 duration-150"
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-start gap-3.5 mb-4">
          <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 flex-shrink-0">
            <FiAlertTriangle className="h-6 w-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-ink">{title}</h3>
            <p className="text-xs text-muted mt-1 leading-relaxed">{message}</p>
          </div>
        </div>

        <div className="flex justify-end gap-2.5 pt-3 border-t border-border">
          <Button
            type="button"
            variant="secondary"
            disabled={loading}
            onClick={onCancel}
            className="py-2 px-4 text-xs font-semibold"
          >
            {cancelLabel}
          </Button>
          <Button
            type="button"
            variant="danger"
            loading={loading}
            onClick={onConfirm}
            className="py-2 px-4 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white"
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
