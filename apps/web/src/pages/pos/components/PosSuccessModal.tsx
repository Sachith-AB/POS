import { FiUser, FiCheckCircle } from 'react-icons/fi';
import { Button } from '../../../components/Button';
import type { ReceiptSnapshot } from '../../../features/pos/posSlice';

interface PosSuccessModalProps {
  isOpen: boolean;
  lastCompleted: ReceiptSnapshot | null;
  onClose: () => void;
  onPrintReceipt: () => void;
  onUndoSale: () => void;
  undoingSale: boolean;
}

export function PosSuccessModal({
  isOpen,
  lastCompleted,
  onClose,
  onPrintReceipt,
  onUndoSale,
  undoingSale,
}: PosSuccessModalProps) {
  if (!isOpen || !lastCompleted) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-md rounded-2xl border border-border bg-surface p-6 shadow-2xl">
        <div className="text-center mb-5">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
            <FiCheckCircle className="h-6 w-6" />
          </div>
          <h2 className="text-lg font-bold text-ink">Sale Completed Successfully!</h2>
          <p className="text-xs text-muted font-medium mt-1">
            Receipt has been printed. Total: Rs {lastCompleted.total.toFixed(2)}
          </p>

          {lastCompleted.customerName || lastCompleted.customerPhone ? (
            <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 text-xs font-semibold border border-emerald-500/20">
              <FiUser className="h-3.5 w-3.5" />
              <span>Customer: {lastCompleted.customerName || 'Registered Customer'}</span>
              {lastCompleted.customerPhone ? (
                <span className="font-mono text-ink">({lastCompleted.customerPhone})</span>
              ) : null}
            </div>
          ) : null}

          {lastCompleted.changeAmount && lastCompleted.changeAmount > 0 ? (
            <div className="mt-4 p-3.5 rounded-xl bg-emerald-500/15 border-2 border-emerald-500 text-center">
              <div className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                Balance / Change to Return
              </div>
              <div className="text-3xl font-mono font-extrabold text-emerald-600 dark:text-emerald-400 my-1">
                Rs {lastCompleted.changeAmount.toFixed(2)}
              </div>
              <div className="text-xs text-muted">
                Customer Paid: <span className="font-mono font-semibold text-ink">Rs {(lastCompleted.tenderedAmount ?? (lastCompleted.total + lastCompleted.changeAmount)).toFixed(2)}</span>
                {' '}&bull; Bill Total: <span className="font-mono font-semibold text-ink">Rs {lastCompleted.total.toFixed(2)}</span>
              </div>
            </div>
          ) : null}
        </div>

        <div className="flex flex-col gap-2">
          <Button
            type="button"
            onClick={onPrintReceipt}
            variant="secondary"
            className="w-full py-2.5 text-xs font-bold"
          >
            Print Receipt Again
          </Button>
          <Button
            type="button"
            autoFocus
            onClick={onClose}
            className="w-full py-2.5 text-xs font-bold"
          >
            New Sale (Press Enter)
          </Button>
          <Button
            type="button"
            variant="ghost"
            loading={undoingSale}
            onClick={onUndoSale}
            className="w-full py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 cursor-pointer"
          >
            Undo Sale
          </Button>
        </div>
      </div>
    </div>
  );
}
