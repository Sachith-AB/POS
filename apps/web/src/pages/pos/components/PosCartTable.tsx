import React from 'react';
import { FiShield, FiSmartphone, FiTrash2 } from 'react-icons/fi';
import { Button } from '../../../components/Button';
import { Input } from '../../../components/Input';
import type { CartLine } from '../../../features/pos/posTypes';
import type { WarrantyOption } from './types';

interface PosCartTableProps {
  items: CartLine[];
  warranties: WarrantyOption[];
  activeIndex: number;
  qtyInputRefs: React.MutableRefObject<Record<string, HTMLInputElement | null>>;
  searchRef: React.RefObject<HTMLInputElement>;
  onPriceTypeChange: (productId: string, priceType: 'RETAIL' | 'WHOLESALE' | 'BUSINESS') => void;
  onQuantityChange: (productId: string, quantity: number) => void;
  onPriceChange: (productId: string, unitPrice: number) => void;
  onRemoveLine: (productId: string, serializedItemId?: string | null) => void;
}

export function PosCartTable({
  items,
  warranties,
  activeIndex,
  qtyInputRefs,
  searchRef,
  onPriceTypeChange,
  onQuantityChange,
  onPriceChange,
  onRemoveLine,
}: PosCartTableProps) {
  return (
    <div className="flex-1 overflow-y-auto rounded-xl border border-border bg-surface shadow-xs">
      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-48 text-muted">
          <p className="font-medium">No items yet in Bill {activeIndex + 1}</p>
          <p className="text-xs text-muted/70 mt-1">Scan barcode, scan IMEI, or select mobile phones</p>
        </div>
      ) : (
        <div className="divide-y divide-border">
          <div className="grid grid-cols-[1.5fr_100px_80px_110px_110px_36px] items-center gap-2 bg-canvas px-3 py-2 text-xs font-semibold text-muted uppercase">
            <span>Product &amp; Warranty</span>
            <span>Price Type</span>
            <span>Qty (F1)</span>
            <span>Unit Price (Rs)</span>
            <span>Line Total (Rs)</span>
            <span></span>
          </div>
          {items.map((item, idx) => (
            <div
              key={item.productId + (item.serializedItemId || idx)}
              className="grid grid-cols-[1.5fr_100px_80px_110px_110px_36px] items-center gap-2 px-3 py-2.5 hover:bg-canvas/50 transition-colors"
            >
              <div>
                <span className="font-semibold text-ink text-sm block leading-tight">{item.name}</span>
                {item.isSerialized || item.imei ? (
                  <div className="flex items-center gap-1.5 mt-1">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-500/15 border border-blue-500/30 text-blue-700 dark:text-blue-300 font-mono text-[11px] font-bold">
                      <FiSmartphone className="h-3 w-3" />
                      IMEI: {item.imei || 'NOT SELECTED'}
                    </span>
                  </div>
                ) : null}
                {/* Configurable Warranty time per product */}
                <div className="flex items-center gap-1.5 mt-1">
                  <FiShield className="h-3 w-3 text-emerald-500" />
                  <select
                    className="text-xs bg-canvas border border-border rounded px-1.5 py-0.5 text-muted focus:outline-none focus:border-ink cursor-pointer"
                    value={item.priceType || 'RETAIL'}
                    onChange={(e) => onPriceTypeChange(item.productId, e.target.value as any)}
                  >
                    <option value="RETAIL">3-Day Rule Default</option>
                    {warranties.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Price Types Selector */}
              <select
                value={item.priceType || 'RETAIL'}
                onChange={(e) => onPriceTypeChange(item.productId, e.target.value as any)}
                className="text-xs font-medium rounded-lg border border-border bg-canvas px-2 py-1 text-ink focus:outline-none focus:ring-1 focus:ring-ink"
              >
                <option value="RETAIL">Retail</option>
                <option value="WHOLESALE" disabled={item.wholesalePrice == null}>
                  Wholesale {item.wholesalePrice ? `(${item.wholesalePrice})` : '(N/A)'}
                </option>
                <option value="BUSINESS" disabled={item.businessPrice == null}>
                  Business {item.businessPrice ? `(${item.businessPrice})` : '(N/A)'}
                </option>
              </select>

              {/* Quantity: Locked to 1 for Serialized Mobile Phones */}
              {item.isSerialized ? (
                <div
                  className="text-center font-mono font-bold text-xs py-1.5 px-2 bg-canvas/80 border border-border rounded-lg text-muted select-none cursor-not-allowed"
                  title="Serialized mobile phone quantity is locked to 1 per unique IMEI"
                >
                  1
                </div>
              ) : (
                <Input
                  ref={(el) => {
                    qtyInputRefs.current[item.productId] = el;
                  }}
                  type="number"
                  min={1}
                  value={item.quantity === 0 ? '' : item.quantity}
                  onFocus={(e) => e.currentTarget.select()}
                  onClick={(e) => e.currentTarget.select()}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === 'F1') {
                      e.preventDefault();
                      searchRef.current?.focus();
                      searchRef.current?.select();
                    }
                  }}
                  onBlur={() => {
                    if (!item.quantity || item.quantity < 1) {
                      onQuantityChange(item.productId, 1);
                    }
                  }}
                  onChange={(e) => {
                    const val = e.target.value.trim();
                    if (val === '') {
                      onQuantityChange(item.productId, 0);
                    } else {
                      const parsed = parseInt(val, 10);
                      if (!isNaN(parsed)) {
                        onQuantityChange(item.productId, Math.max(0, parsed));
                      }
                    }
                  }}
                  className="text-center font-semibold text-sm py-1"
                />
              )}

              {/* Editable Unit Price */}
              <Input
                type="number"
                min={0}
                step="any"
                value={item.unitPrice}
                onChange={(e) => onPriceChange(item.productId, Number(e.target.value))}
                className="text-right font-mono font-medium text-sm py-1"
              />

              {/* Line Total */}
              <span className="text-right font-mono font-semibold text-ink text-sm">
                {(item.quantity * item.unitPrice).toFixed(2)}
              </span>

              {/* Remove Action */}
              <Button
                onClick={() => onRemoveLine(item.productId, item.serializedItemId)}
                variant="ghost"
                className="p-1 h-8 w-8 text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg"
                title="Remove item"
              >
                <FiTrash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
