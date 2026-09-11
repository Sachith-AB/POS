import React from 'react';
import type { InstallmentPlan } from '../../../features/installments/installmentsSlice';
import { Button } from '../../../components/Button';
import { Input } from '../../../components/Input';
import { STATUS_COLORS, parseSchedule } from './types';

interface InstallmentDetailDrawerProps {
  selectedPlan: InstallmentPlan | null;
  onClose: () => void;
  onPrintSticker: (plan: InstallmentPlan) => void;
  payAmount: string;
  onPayAmountChange: (val: string) => void;
  payMethod: 'CASH' | 'BANK_TRANSFER';
  onPayMethodChange: (method: 'CASH' | 'BANK_TRANSFER') => void;
  onRecordPayment: (e: React.FormEvent) => void;
  savingPayment: boolean;
}

export function InstallmentDetailDrawer({
  selectedPlan,
  onClose,
  onPrintSticker,
  payAmount,
  onPayAmountChange,
  payMethod,
  onPayMethodChange,
  onRecordPayment,
  savingPayment,
}: InstallmentDetailDrawerProps) {
  if (!selectedPlan) {
    return (
      <div className="flex flex-col min-h-0 bg-surface p-5 overflow-y-auto">
        <div className="flex h-full flex-col items-center justify-center text-center p-4">
          <h3 className="text-sm font-semibold text-ink">No Plan Selected</h3>
          <p className="text-xs text-muted max-w-[220px] mt-1">
            Scan an agreement barcode or select from the list to view agreement sticker, guarantor info, and schedule.
          </p>
        </div>
      </div>
    );
  }

  const schedule = parseSchedule(selectedPlan.scheduleJson);

  return (
    <div className="flex flex-col min-h-0 bg-surface p-5 overflow-y-auto">
      <div className="space-y-4">
        {/* Header details & Barcode Sticker preview */}
        <div className="border-b border-border pb-3">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-sm font-bold text-ink">Agreement Record</h2>
              <span className="text-[10px] text-muted">Plan ID: {selectedPlan.id}</span>
            </div>
            <span
              className={`rounded-full border px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wide ${
                STATUS_COLORS[selectedPlan.status] || ''
              }`}
            >
              {selectedPlan.status}
            </span>
          </div>

          {/* Physical Agreement Barcode Sticker Banner */}
          <div className="mt-3 rounded-xl border border-border bg-canvas p-3 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-semibold text-muted block">Physical Agreement Barcode</span>
              <span className="text-sm font-mono font-extrabold text-ink tracking-wider block">
                {selectedPlan.agreementBarcode || `AGR-${selectedPlan.id.slice(-8).toUpperCase()}`}
              </span>
              <span className="text-[10px] text-muted">Attach sticker to pre-printed physical agreement</span>
            </div>
            <Button
              onClick={() => onPrintSticker(selectedPlan)}
              variant="secondary"
              className="text-xs py-1 px-2.5 font-bold"
            >
              Print Sticker
            </Button>
          </div>
        </div>

        {/* Customer and Guarantor Details */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl border border-border bg-canvas p-3">
            <span className="text-[9px] font-bold uppercase text-muted block mb-1">Customer</span>
            <span className="text-xs font-semibold text-ink block">
              {selectedPlan.sale?.customer?.name || 'Walk-in'}
            </span>
            <span className="text-xs text-muted font-mono block">
              {selectedPlan.sale?.customer?.phone}
            </span>
          </div>

          <div className="rounded-xl border border-border bg-canvas p-3">
            <span className="text-[9px] font-bold uppercase text-muted block mb-1">Guarantor</span>
            {selectedPlan.guarantorName ? (
              <>
                <span className="text-xs font-semibold text-ink block">
                  {selectedPlan.guarantorName}
                </span>
                <span className="text-[10px] text-muted block">NIC: {selectedPlan.guarantorNic}</span>
                <span className="text-[10px] text-muted block">Phone: {selectedPlan.guarantorPhone}</span>
                {selectedPlan.guarantorConsentGiven ? (
                  <span className="text-[9px] text-emerald-600 font-semibold block mt-0.5">Consent Verified</span>
                ) : null}
              </>
            ) : (
              <span className="text-xs text-muted italic block">No Guarantor Recorded</span>
            )}
          </div>
        </div>

        {/* Financial Breakdown */}
        <div className="rounded-xl bg-canvas border border-border p-3 space-y-1 text-xs">
          <div className="flex justify-between text-muted">
            <span>Total Payable Credit:</span>
            <span className="font-mono font-medium">
              Rs {Number(selectedPlan.totalPayable || selectedPlan.remainingBalance).toFixed(2)}
            </span>
          </div>
          {selectedPlan.interestAmount ? (
            <div className="flex justify-between text-muted">
              <span>Interest ({selectedPlan.interestValue || 0}%):</span>
              <span className="font-mono">Rs {Number(selectedPlan.interestAmount).toFixed(2)}</span>
            </div>
          ) : null}
          {selectedPlan.lateFeeAmount && Number(selectedPlan.lateFeeAmount) > 0 ? (
            <div className="flex justify-between text-rose-500 font-bold">
              <span>Late Fee Applied:</span>
              <span className="font-mono">+ Rs {Number(selectedPlan.lateFeeAmount).toFixed(2)}</span>
            </div>
          ) : null}
          <div className="border-t border-border pt-1.5 flex justify-between items-baseline font-bold text-ink">
            <span>Remaining Balance:</span>
            <span className="text-base font-mono font-extrabold text-primary">
              Rs {Number(selectedPlan.remainingBalance).toFixed(2)}
            </span>
          </div>
        </div>

        {/* Installment Payment Schedule */}
        <div className="space-y-1.5">
          <h3 className="text-xs font-bold text-ink uppercase tracking-wider">Installment Schedule</h3>
          <div className="rounded-xl border border-border overflow-hidden">
            <table className="w-full border-collapse text-left text-[11px] text-ink bg-canvas">
              <thead>
                <tr className="border-b border-border bg-surface font-bold text-muted uppercase text-[9px]">
                  <th className="px-3 py-2">#</th>
                  <th className="px-3 py-2">Due Date</th>
                  <th className="px-3 py-2">Amount</th>
                  <th className="px-3 py-2">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {schedule.map((inst, idx) => (
                  <tr key={idx} className={inst.paid ? 'bg-emerald-500/5' : ''}>
                    <td className="px-3 py-2 font-bold">{inst.installmentNumber}</td>
                    <td className="px-3 py-2 text-muted">
                      {new Date(inst.dueDate).toLocaleDateString()}
                    </td>
                    <td className="px-3 py-2 font-mono">Rs {inst.amount.toFixed(2)}</td>
                    <td className="px-3 py-2">
                      {inst.paid ? (
                        <span className="text-emerald-500 font-bold">Paid</span>
                      ) : inst.paidAmount && inst.paidAmount > 0 ? (
                        <span className="text-amber-500 font-bold">
                          Part (Rs {inst.paidAmount.toFixed(0)})
                        </span>
                      ) : (
                        <span className="text-muted italic">Pending</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Record Payment Form (Strictly Cash & Bank Transfer) */}
        {selectedPlan.status !== 'COMPLETE' ? (
          <form onSubmit={onRecordPayment} className="space-y-2 border-t border-border pt-3">
            <h3 className="text-xs font-bold text-ink uppercase tracking-wider">
              Record Payment (Cash / Bank Only)
            </h3>
            <div className="flex gap-2">
              <div className="flex-1">
                <Input
                  required
                  type="number"
                  min={0.01}
                  step="any"
                  placeholder="Amount to pay"
                  value={payAmount}
                  onChange={(e) => onPayAmountChange(e.target.value)}
                  className="w-full font-mono text-xs"
                />
              </div>
              <select
                value={payMethod}
                onChange={(e) => onPayMethodChange(e.target.value as 'CASH' | 'BANK_TRANSFER')}
                className="rounded-lg border border-border bg-surface px-2.5 text-xs text-ink focus:border-primary focus:outline-none"
              >
                <option value="CASH">Cash</option>
                <option value="BANK_TRANSFER">Bank Transfer</option>
              </select>
            </div>
            <Button
              type="submit"
              loading={savingPayment}
              className="w-full py-2 text-xs font-bold"
            >
              Record Payment
            </Button>
          </form>
        ) : null}

        {/* Close Button */}
        <div className="border-t border-border pt-3">
          <Button
            onClick={onClose}
            variant="secondary"
            className="w-full text-xs"
          >
            Close Plan Details
          </Button>
        </div>
      </div>
    </div>
  );
}
