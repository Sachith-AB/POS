import { useEffect, useState } from 'react';
import { FiUser } from 'react-icons/fi';
import { Button } from '../../../components/Button';
import { Input } from '../../../components/Input';
import type { ReceiptSnapshot } from '../../../features/pos/posSlice';

interface PosSuccessModalProps {
  isOpen: boolean;
  lastCompleted: ReceiptSnapshot | null;
  onClose: () => void;
  onPrintReceipt: () => void;
  onUndoSale: () => void;
  undoingSale: boolean;
  onNavigate: (path: string) => void;
  defaultDownPaymentPercent?: number;
  defaultInterestMethod?: 'PERCENTAGE' | 'FIXED_AMOUNT';
  defaultInterestValue?: number;
}

export function PosSuccessModal({
  isOpen,
  lastCompleted,
  onClose,
  onPrintReceipt,
  onUndoSale,
  undoingSale,
  onNavigate,
  defaultDownPaymentPercent = 35,
  defaultInterestMethod = 'PERCENTAGE',
  defaultInterestValue = 12,
}: PosSuccessModalProps) {
  const [showInstallmentPreview, setShowInstallmentPreview] = useState(false);
  const [instDownPayment, setInstDownPayment] = useState<number>(0);
  const [instPeriodMonths, setInstPeriodMonths] = useState<number>(6);
  const [instInterestMethod, setInstInterestMethod] = useState<'PERCENTAGE' | 'FIXED_AMOUNT'>(defaultInterestMethod);
  const [instInterestValue, setInstInterestValue] = useState<number>(defaultInterestValue);

  useEffect(() => {
    if (lastCompleted) {
      const down = Math.round(((lastCompleted.total * defaultDownPaymentPercent) / 100) * 100) / 100;
      setInstDownPayment(down);
      setInstPeriodMonths(6);
      setInstInterestMethod(defaultInterestMethod);
      setInstInterestValue(defaultInterestValue);
    }
  }, [lastCompleted, defaultDownPaymentPercent, defaultInterestMethod, defaultInterestValue]);

  if (!isOpen || !lastCompleted) return null;

  const principal = Math.max(0, lastCompleted.total - instDownPayment);
  const interestAmount =
    instInterestMethod === 'PERCENTAGE'
      ? Math.round(((principal * instInterestValue) / 100) * 100) / 100
      : instInterestValue;
  const totalPayable = principal + interestAmount;
  const monthly = Math.round((totalPayable / instPeriodMonths) * 100) / 100;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-lg rounded-2xl border border-border bg-surface p-6 shadow-2xl">
        <div className="text-center mb-4">
          <h2 className="text-lg font-bold text-ink">Sale Completed Successfully!</h2>
          <p className="text-xs text-muted font-medium">Receipt has been printed. Total: Rs {lastCompleted.total.toFixed(2)}</p>

          {lastCompleted.customerName || lastCompleted.customerPhone ? (
            <div className="mt-2 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 text-xs font-semibold border border-emerald-500/20">
              <FiUser className="h-3.5 w-3.5" />
              <span>Customer: {lastCompleted.customerName || 'Registered Customer'}</span>
              {lastCompleted.customerPhone ? (
                <span className="font-mono text-ink">({lastCompleted.customerPhone})</span>
              ) : null}
            </div>
          ) : null}

          {lastCompleted.changeAmount && lastCompleted.changeAmount > 0 ? (
            <div className="mt-3 p-3.5 rounded-xl bg-emerald-500/15 border-2 border-emerald-500 text-center">
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

        {/* Installment Plan Breakdown Toggle */}
        <div className="rounded-xl border border-border bg-canvas p-4 mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-ink">Customer wants Installments?</span>
            <button
              type="button"
              onClick={() => setShowInstallmentPreview(!showInstallmentPreview)}
              className="text-xs font-semibold text-primary hover:underline cursor-pointer"
            >
              {showInstallmentPreview ? 'Hide Calculations' : 'Preview Installment Plan'}
            </button>
          </div>

          {showInstallmentPreview ? (
            <div className="mt-3 space-y-2 border-t border-border pt-3 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] text-muted block mb-0.5">Down Payment (Rs)</label>
                  <Input
                    type="number"
                    min={0}
                    value={instDownPayment}
                    onChange={(e) => setInstDownPayment(Number(e.target.value))}
                    className="py-1 text-xs"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-muted block mb-0.5">Period (Months)</label>
                  <select
                    value={instPeriodMonths}
                    onChange={(e) => setInstPeriodMonths(Number(e.target.value))}
                    className="w-full rounded-lg border border-border bg-surface px-2 py-1.5 text-xs text-ink"
                  >
                    <option value={3}>3 Months</option>
                    <option value={6}>6 Months</option>
                    <option value={12}>12 Months</option>
                  </select>
                </div>
              </div>

              {/* Calculated Breakdown Display */}
              <div className="rounded-lg bg-surface p-3 border border-border font-mono text-[11px] space-y-1 mt-2">
                <div className="flex justify-between text-muted">
                  <span>Product Price:</span>
                  <span>Rs {lastCompleted.total.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-muted">
                  <span>Down Payment ({((instDownPayment / lastCompleted.total) * 100).toFixed(0)}%):</span>
                  <span>Rs {instDownPayment.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-muted">
                  <span>Remaining Principal:</span>
                  <span>Rs {principal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-muted">
                  <span>Interest ({instInterestValue}%):</span>
                  <span>Rs {interestAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-bold text-ink border-t border-border pt-1">
                  <span>Total Payable:</span>
                  <span>Rs {totalPayable.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-extrabold text-primary text-xs pt-0.5">
                  <span>Monthly Installment:</span>
                  <span>Rs {monthly.toFixed(2)} / mo</span>
                </div>
              </div>

              <Button
                type="button"
                onClick={() => {
                  onClose();
                  onNavigate(
                    `/installments?createSaleId=${lastCompleted.id}&downPayment=${instDownPayment}&months=${instPeriodMonths}&interest=${instInterestValue}`
                  );
                }}
                className="w-full py-2 text-xs font-bold mt-2"
              >
                Confirm &amp; Create Agreement
              </Button>
            </div>
          ) : null}
        </div>

        <div className="flex flex-col gap-2">
          <Button
            type="button"
            onClick={onPrintReceipt}
            variant="secondary"
            className="w-full py-2 text-xs font-bold"
          >
            Print Receipt Again
          </Button>
          <Button
            type="button"
            autoFocus
            onClick={onClose}
            className="w-full py-2 text-xs font-bold"
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
