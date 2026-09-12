import { useState } from 'react';
import { FiSmartphone } from 'react-icons/fi';
import { Button } from '../../../components/Button';
import { Input } from '../../../components/Input';
import type { CartLine } from '../../../features/pos/posTypes';
import type { MobilePhoneProduct, SerializedItemStock } from './types';

interface PosImeiModalProps {
  selectedMobile: MobilePhoneProduct | null;
  onClose: () => void;
  onSelectImei: (product: MobilePhoneProduct, item: SerializedItemStock) => void;
  billItems: CartLine[];
}

export function PosImeiModal({
  selectedMobile,
  onClose,
  onSelectImei,
  billItems,
}: PosImeiModalProps) {
  const [imeiFilterSearch, setImeiFilterSearch] = useState('');

  if (!selectedMobile) return null;

  const items = (selectedMobile.serializedItems || []).filter(
    (i) =>
      i.status === 'IN_STOCK' &&
      (!imeiFilterSearch || i.imei.toLowerCase().includes(imeiFilterSearch.toLowerCase()))
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-lg rounded-2xl border border-border bg-surface p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-2 mb-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 bg-blue-500/10 text-blue-600 rounded-lg">
                <FiSmartphone className="h-5 w-5" />
              </span>
              <h3 className="text-base font-bold text-ink">{selectedMobile.name}</h3>
            </div>
            <p className="text-xs text-muted mt-1">
              Price: <span className="font-mono font-bold text-ink">Rs {Number(selectedMobile.sellPrice).toFixed(2)}</span>
              {' '}&bull; Choose the exact physical IMEI being sold to the customer.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-muted hover:text-ink text-sm p-1 rounded-lg hover:bg-canvas cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* IMEI Search filter */}
        <div className="mb-3">
          <Input
            placeholder="Filter or scan IMEI digits..."
            value={imeiFilterSearch}
            onChange={(e) => setImeiFilterSearch(e.target.value)}
            autoFocus
            className="w-full text-xs py-1.5"
          />
        </div>

        {/* Available IMEIs List */}
        <div className="max-h-64 overflow-y-auto space-y-2 mb-4 pr-1">
          {items.length === 0 ? (
            <p className="p-4 text-center text-xs text-muted bg-canvas rounded-xl">
              No matching in-stock IMEIs found for this device.
            </p>
          ) : (
            items.map((item) => {
              const isAlreadyInBill = billItems.some((bItem) => bItem.serializedItemId === item.id);
              return (
                <div
                  key={item.id}
                  onClick={() => {
                    if (!isAlreadyInBill) {
                      onSelectImei(selectedMobile, item);
                    }
                  }}
                  className={`p-3 rounded-xl border transition-all flex items-center justify-between ${
                    isAlreadyInBill
                      ? 'border-border bg-canvas/40 opacity-60 cursor-not-allowed'
                      : 'border-border bg-canvas hover:border-blue-500 hover:bg-surface cursor-pointer'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-blue-500/10 text-blue-600 font-mono text-xs">
                      <FiSmartphone className="h-4 w-4" />
                    </div>
                    <div>
                      <span className="font-mono text-xs font-bold text-ink block tracking-wider">
                        IMEI: {item.imei}
                      </span>
                      <span className="text-[10px] text-muted">
                        Status: <span className="text-emerald-600 font-semibold">IN STOCK</span>
                      </span>
                    </div>
                  </div>

                  {isAlreadyInBill ? (
                    <span className="text-[11px] font-semibold text-muted bg-canvas px-2.5 py-1 rounded-lg border border-border">
                      In Current Bill
                    </span>
                  ) : (
                    <Button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectImei(selectedMobile, item);
                      }}
                      className="py-1 px-3 text-xs font-bold"
                    >
                      Select &amp; Add
                    </Button>
                  )}
                </div>
              );
            })
          )}
        </div>

        <div className="flex justify-end gap-2 border-t border-border pt-3">
          <Button variant="secondary" onClick={onClose} className="text-xs">
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}
