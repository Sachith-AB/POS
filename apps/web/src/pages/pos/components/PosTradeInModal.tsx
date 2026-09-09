import { Button } from '../../../components/Button';
import type { TradeInItem } from './types';

interface PosTradeInModalProps {
  isOpen: boolean;
  onClose: () => void;
  tradeIns: TradeInItem[];
  onApplyTradeIn: (tradeInId: string, tradeInValue: number) => void;
}

export function PosTradeInModal({
  isOpen,
  onClose,
  tradeIns,
  onApplyTradeIn,
}: PosTradeInModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-md rounded-2xl border border-border bg-surface p-5 shadow-xl">
        <h3 className="text-base font-bold text-ink mb-1">Select Used Trade-In Device</h3>
        <p className="text-xs text-muted mb-3">Apply accepted device credit towards this sale.</p>
        {tradeIns.length === 0 ? (
          <p className="p-4 text-center text-xs text-muted bg-canvas rounded-xl">
            No pending trade-in devices found. You can accept used devices from the Stock / Trade-Ins page.
          </p>
        ) : (
          <div className="max-h-60 overflow-y-auto space-y-2 mb-4">
            {tradeIns.map((t) => (
              <div
                key={t.id}
                onClick={() => {
                  onApplyTradeIn(t.id, Number(t.tradeInValue));
                  onClose();
                }}
                className="p-3 rounded-xl border border-border bg-canvas hover:border-ink cursor-pointer transition-colors flex justify-between items-center"
              >
                <div>
                  <p className="text-xs font-bold text-ink">{t.deviceInfo}</p>
                  <p className="text-[11px] text-muted">
                    {t.imei ? `IMEI: ${t.imei} | ` : ''}Customer: {t.customerName || 'Walk-in'}
                  </p>
                </div>
                <span className="font-mono font-bold text-emerald-600 text-sm">
                  Rs {Number(t.tradeInValue).toFixed(2)}
                </span>
              </div>
            ))}
          </div>
        )}
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose} className="text-xs">
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}
