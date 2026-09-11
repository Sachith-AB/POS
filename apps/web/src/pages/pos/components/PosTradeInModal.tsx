import { useState } from 'react';
import { Button } from '../../../components/Button';
import { Input } from '../../../components/Input';
import { api } from '../../../lib/api';
import { toast } from 'react-toastify';
import type { TradeInItem } from './types';
import { FiPlus, FiRefreshCw, FiList } from 'react-icons/fi';

interface PosTradeInModalProps {
  isOpen: boolean;
  onClose: () => void;
  tradeIns: TradeInItem[];
  onApplyTradeIn: (
    tradeInId: string,
    tradeInValue: number,
    tradeInDevice?: { id?: string; deviceInfo: string; imei?: string | null; condition?: string; tradeInValue: number } | null
  ) => void;
}

export function PosTradeInModal({
  isOpen,
  onClose,
  tradeIns,
  onApplyTradeIn,
}: PosTradeInModalProps) {
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [deviceInfo, setDeviceInfo] = useState('');
  const [imei, setImei] = useState('');
  const [condition, setCondition] = useState('GOOD');
  const [tradeInValue, setTradeInValue] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [saving, setSaving] = useState(false);

  if (!isOpen) return null;

  async function handleQuickIntake(e: React.FormEvent) {
    e.preventDefault();
    if (!deviceInfo.trim() || !tradeInValue) return;
    setSaving(true);
    try {
      const val = parseFloat(tradeInValue);
      const created = await api.post<any>('/trade-ins', {
        deviceInfo: deviceInfo.trim(),
        imei: imei.trim() || undefined,
        condition,
        tradeInValue: val,
        customerName: customerName.trim() || undefined,
        customerPhone: customerPhone.trim() || undefined,
      });
      toast.success('Trade-in recorded and applied to bill!');
      onApplyTradeIn(created.id, val, {
        id: created.id,
        deviceInfo: created.deviceInfo,
        imei: created.imei || null,
        condition: created.condition,
        tradeInValue: val,
      });
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'Failed to record trade-in device');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-md rounded-2xl border border-border bg-surface p-5 shadow-xl">
        <div className="flex items-center justify-between mb-3 pb-2 border-b border-border">
          <div>
            <h3 className="text-base font-bold text-ink flex items-center gap-1.5">
              <FiRefreshCw className="w-4 h-4 text-emerald-600" />
              <span>{isAddingNew ? 'Intake Customer Trade-In' : 'Select Trade-In Device'}</span>
            </h3>
            <p className="text-xs text-muted">
              {isAddingNew
                ? 'Record customer device details and apply credit to current bill'
                : 'Apply accepted customer device credit towards this sale'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setIsAddingNew(!isAddingNew)}
            className="text-xs font-bold px-2.5 py-1 rounded-lg bg-canvas hover:bg-surface border border-border text-ink flex items-center gap-1 transition-colors"
          >
            {isAddingNew ? (
              <>
                <FiList className="w-3 h-3" />
                <span>Choose Existing</span>
              </>
            ) : (
              <>
                <FiPlus className="w-3 h-3 text-emerald-600" />
                <span>+ Intake New</span>
              </>
            )}
          </button>
        </div>

        {isAddingNew ? (
          /* Quick Intake Form */
          <form onSubmit={handleQuickIntake} className="space-y-2.5 text-xs">
            <div>
              <label className="text-muted block mb-0.5 font-medium">Device Model &amp; Specs *</label>
              <Input
                required
                placeholder="e.g. iPhone 12 128GB Black"
                value={deviceInfo}
                onChange={(e) => setDeviceInfo(e.target.value)}
                className="w-full text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-muted block mb-0.5 font-medium">IMEI Number</label>
                <Input
                  placeholder="35..."
                  value={imei}
                  onChange={(e) => setImei(e.target.value)}
                  className="w-full font-mono text-xs"
                />
              </div>
              <div>
                <label className="text-muted block mb-0.5 font-medium">Condition</label>
                <select
                  value={condition}
                  onChange={(e) => setCondition(e.target.value)}
                  className="w-full p-2 text-xs bg-canvas border border-border rounded-lg text-ink"
                >
                  <option value="LIKE_NEW">Like New</option>
                  <option value="GOOD">Good / Normal</option>
                  <option value="FAIR">Fair / Scratches</option>
                  <option value="DEFECTIVE">Needs Repair</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-muted block mb-0.5 font-medium">Agreed Trade-In Value (Rs) *</label>
              <Input
                required
                type="number"
                min={1}
                step="any"
                placeholder="0.00"
                value={tradeInValue}
                onChange={(e) => setTradeInValue(e.target.value)}
                className="w-full font-mono font-bold text-emerald-600 text-sm"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-muted block mb-0.5 font-medium">Customer Name</label>
                <Input
                  placeholder="Customer name"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full text-xs"
                />
              </div>
              <div>
                <label className="text-muted block mb-0.5 font-medium">Customer Phone</label>
                <Input
                  placeholder="0771234567"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  className="w-full text-xs"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-border">
              <Button type="button" variant="secondary" onClick={onClose} className="text-xs">
                Cancel
              </Button>
              <Button type="submit" disabled={saving} className="text-xs font-bold">
                {saving ? 'Recording…' : 'Record & Apply Trade-In'}
              </Button>
            </div>
          </form>
        ) : (
          /* List Existing Pending Trade-Ins */
          <>
            {tradeIns.length === 0 ? (
              <div className="p-6 text-center text-xs text-muted bg-canvas rounded-xl space-y-2 mb-4">
                <p>No pending trade-in devices found.</p>
                <Button
                  type="button"
                  onClick={() => setIsAddingNew(true)}
                  variant="secondary"
                  className="text-xs font-bold"
                >
                  + Intake Customer Device Now
                </Button>
              </div>
            ) : (
              <div className="max-h-60 overflow-y-auto space-y-2 mb-4">
                {tradeIns.map((t) => (
                  <div
                    key={t.id}
                    onClick={() => {
                      onApplyTradeIn(t.id, Number(t.tradeInValue), {
                        id: t.id,
                        deviceInfo: t.deviceInfo,
                        imei: t.imei || null,
                        condition: t.condition,
                        tradeInValue: Number(t.tradeInValue),
                      });
                      onClose();
                    }}
                    className="p-3 rounded-xl border border-border bg-canvas hover:border-brand cursor-pointer transition-colors flex justify-between items-center"
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
          </>
        )}
      </div>
    </div>
  );
}
