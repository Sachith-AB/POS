import React from 'react';
import { FiSearch, FiSmartphone } from 'react-icons/fi';
import { Button } from '../../../components/Button';
import { Input } from '../../../components/Input';
import type { MobilePhoneProduct } from './types';
import { toast } from 'react-toastify';

interface PosMobileCatalogProps {
  activeIndex: number;
  mobilePhones: MobilePhoneProduct[];
  mobileLoading: boolean;
  mobileSearch: string;
  onSearchChange: (val: string) => void;
  onSearchKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  onSelectMobile: (phone: MobilePhoneProduct) => void;
  onCloseMobileTab: () => void;
}

export function PosMobileCatalog({
  activeIndex,
  mobilePhones,
  mobileLoading,
  mobileSearch,
  onSearchChange,
  onSearchKeyDown,
  onSelectMobile,
  onCloseMobileTab,
}: PosMobileCatalogProps) {
  return (
    <div className="rounded-2xl border border-blue-500/30 bg-blue-500/5 p-3.5 flex flex-col gap-2.5">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-blue-600 text-white rounded-xl shadow-xs">
            <FiSmartphone className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-xs font-bold text-ink flex items-center gap-2">
              Mobile Phone Sales &amp; IMEI Catalog
              <span className="text-[10px] px-2 py-0.5 rounded-full text-blue-900 dark:text-blue-500 font-semibold">
                Customer &amp; IMEI Mandatory
              </span>
            </h2>
            <p className="text-[11px] text-muted">
              Select mobile phone and choose the exact IMEI to add to Bill {activeIndex + 1}.
            </p>
          </div>
        </div>
        <Button
          variant="secondary"
          onClick={onCloseMobileTab}
          className="text-xs py-1 px-2.5"
        >
          ← All POS Items
        </Button>
      </div>

      <div className="relative">
        <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-muted h-3.5 w-3.5 pointer-events-none" />
        <Input
          placeholder="Filter mobile models, brand, or scan IMEI barcode..."
          value={mobileSearch}
          onChange={(e) => onSearchChange(e.target.value)}
          onKeyDown={onSearchKeyDown}
          className="pl-8 pr-3 py-1.5 text-xs w-full bg-surface"
        />
      </div>

      {mobileLoading ? (
        <div className="py-6 text-center text-xs text-muted">Loading mobile inventory…</div>
      ) : mobilePhones.length === 0 ? (
        <div className="py-6 text-center text-xs text-muted bg-surface/60 rounded-xl border border-border">
          No serialized mobile phones found. Make sure products are registered with "Track Serial / IMEI".
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-52 overflow-y-auto pr-1">
          {mobilePhones.map((phone) => {
            const inStockCount = phone.serializedItems?.length || 0;
            return (
              <div
                key={phone.id}
                className="p-2.5 rounded-xl border border-border bg-surface hover:border-blue-500/40 hover:shadow-xs transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-1 mb-1">
                    <span className="font-bold text-ink text-xs line-clamp-1">{phone.name}</span>
                    {phone.categoryRel ? (
                      <span className="shrink-0 text-[9px] px-1.5 py-0.5 rounded bg-canvas border border-border text-muted">
                        {phone.categoryRel.emoji ? `${phone.categoryRel.emoji} ` : ''}
                        {phone.categoryRel.name}
                      </span>
                    ) : null}
                  </div>
                  <div className="flex items-baseline justify-between mt-1">
                    <span className="font-mono font-bold text-ink text-xs">
                      Rs {Number(phone.sellPrice).toFixed(2)}
                    </span>
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                        inStockCount > 0
                          ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20'
                          : 'bg-rose-500/10 text-rose-600 border border-rose-500/20'
                      }`}
                    >
                      {inStockCount > 0 ? `${inStockCount} in stock` : 'Out of stock'}
                    </span>
                  </div>
                </div>

                <div className="mt-2.5">
                  <Button
                    onClick={() => {
                      if (inStockCount === 0) {
                        toast.error(`No in-stock IMEIs for ${phone.name}`);
                        return;
                      }
                      onSelectMobile(phone);
                    }}
                    disabled={inStockCount === 0}
                    variant={inStockCount > 0 ? 'primary' : 'secondary'}
                    className="w-full py-1 text-xs font-semibold"
                  >
                    <FiSmartphone className="mr-1 h-3 w-3" />
                    Select IMEI ({inStockCount})
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
