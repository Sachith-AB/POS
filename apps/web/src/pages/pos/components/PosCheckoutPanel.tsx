import React from 'react';
import { FiDollarSign, FiPercent, FiRepeat } from 'react-icons/fi';
import { Button } from '../../../components/Button';
import { Input } from '../../../components/Input';
import type { WarrantyOption } from './types';

interface PosCheckoutPanelProps {
  customerPhone: string;
  customerName?: string | null;
  onCustomerPhoneChange: (phone: string) => void;
  hasMobileInBill: boolean;
  mobileRequiresCustomer: boolean;
  warrantyPeriodId: string | null;
  warranties: WarrantyOption[];
  onWarrantySelect: (id: string | null) => void;
  tradeInDeduction: number;
  onOpenTradeInModal: () => void;
  onRemoveTradeIn: () => void;
  subtotal: number;
  total: number;
  applyDiscount: boolean;
  onToggleDiscount: () => void;
  discountMode: 'amount' | 'percent';
  onToggleDiscountMode: () => void;
  discountPercent?: number;
  discount: number;
  discountInputRef: React.RefObject<HTMLInputElement>;
  onDiscountPercentChange: (val: number) => void;
  onDiscountChange: (val: number) => void;
  method: 'CASH' | 'CARD' | 'BANK_TRANSFER';
  onMethodChange: (m: 'CASH' | 'CARD' | 'BANK_TRANSFER') => void;
  amount: string;
  onAmountChange: (val: string) => void;
  amountRef: React.RefObject<HTMLInputElement>;
  quickCashOptions: number[];
  tenderedNum: number;
  changeAmount: number;
  onComplete: () => void;
  completing: boolean;
  saving: boolean;
  error?: string | null;
}

export function PosCheckoutPanel({
  customerPhone,
  customerName,
  onCustomerPhoneChange,
  hasMobileInBill,
  mobileRequiresCustomer,
  warrantyPeriodId,
  warranties,
  onWarrantySelect,
  tradeInDeduction,
  onOpenTradeInModal,
  onRemoveTradeIn,
  subtotal,
  total,
  applyDiscount,
  onToggleDiscount,
  discountMode,
  onToggleDiscountMode,
  discountPercent,
  discount,
  discountInputRef,
  onDiscountPercentChange,
  onDiscountChange,
  method,
  onMethodChange,
  amount,
  onAmountChange,
  amountRef,
  quickCashOptions,
  tenderedNum,
  changeAmount,
  onComplete,
  completing,
  saving,
  error,
}: PosCheckoutPanelProps) {
  return (
    <div className="flex flex-col rounded-2xl border border-border bg-surface p-5 shadow-xs">
      {/* Customer Details */}
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-1.5">
          <p className="text-xs font-semibold text-muted uppercase tracking-wider">Customer Details</p>
        </div>
        {customerPhone ? (
          <button
            type="button"
            onClick={() => onCustomerPhoneChange('')}
            className="text-[11px] text-muted hover:text-rose-500 cursor-pointer transition-colors"
          >
            Clear
          </button>
        ) : null}
      </div>
      <Input
        placeholder="Customer Phone (07XXXXXXXX)"
        value={customerPhone}
        onChange={(e) => onCustomerPhoneChange(e.target.value)}
        className={`w-full text-sm ${
          mobileRequiresCustomer ? 'border-rose-400 focus:border-rose-500' : ''
        }`}
      />
      {hasMobileInBill && mobileRequiresCustomer ? (
        <p className="text-[11px] text-rose-500 mt-1 font-medium">
          * Customer details are required to sell mobile phones
        </p>
      ) : null}
      {customerName ? (
        <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400 mt-1">{customerName}</p>
      ) : null}

      <hr className="my-3 border-border" />

      {/* Overall Warranty Period Selector */}
      <div className="mb-2">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-semibold text-muted">Bill Warranty</span>
          <span className="text-[10px] text-muted">Includes 3-day support</span>
        </div>
        <select
          value={warrantyPeriodId || ''}
          onChange={(e) => onWarrantySelect(e.target.value || null)}
          className="w-full rounded-lg border border-border bg-canvas px-2.5 py-1.5 text-xs text-ink"
        >
          <option value="">Default (First 3 Days Warranty Support)</option>
          {warranties.map((w) => (
            <option key={w.id} value={w.id}>
              {w.label} ({w.durationDays} days)
            </option>
          ))}
        </select>
      </div>

      {/* Trade-In Adjustment Section */}
      <div className="mb-2 rounded-xl bg-canvas p-2.5 border border-border">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-muted flex items-center gap-1">
            <FiRepeat className="h-3 w-3" /> Trade-In Device
          </span>
          {tradeInDeduction > 0 ? (
            <button
              type="button"
              onClick={onRemoveTradeIn}
              className="text-[11px] text-rose-500 hover:underline cursor-pointer"
            >
              Remove
            </button>
          ) : null}
        </div>
        {tradeInDeduction > 0 ? (
          <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 mt-1">
            - Rs {tradeInDeduction.toFixed(2)} credited
          </p>
        ) : (
          <button
            type="button"
            onClick={onOpenTradeInModal}
            className="mt-1 w-full text-xs py-1 px-2 border border-dashed border-border rounded text-muted hover:text-ink hover:border-ink cursor-pointer"
          >
            Apply Used Device Trade-In
          </button>
        )}
      </div>

      {/* Price Calculations */}
      <div className="space-y-2 py-2 text-sm">
        <div className="flex justify-between text-muted">
          <span>Subtotal</span>
          <span className="font-mono font-medium">Rs {subtotal.toFixed(2)}</span>
        </div>

        {/* Discount with small checkbox and hotkey (Shift+D) */}
        <div className="flex items-center justify-between gap-2 min-h-[28px]">
          <label className="flex items-center gap-1.5 cursor-pointer text-xs select-none">
            <input
              type="checkbox"
              checked={applyDiscount}
              onChange={onToggleDiscount}
              className="rounded border-border text-primary cursor-pointer h-3.5 w-3.5"
            />
            <span className={applyDiscount ? 'font-semibold text-ink' : 'text-muted'}>
              Discount
            </span>
            <kbd
              className="text-[9px] font-mono px-1 py-0.5 rounded bg-canvas border border-border text-muted leading-none"
              title="Press Shift + D to toggle discount"
            >
              Shift+D
            </kbd>
            {applyDiscount ? (
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  onToggleDiscountMode();
                }}
                className="ml-1 p-1 rounded bg-canvas border border-border text-[10px] font-semibold text-muted hover:text-ink cursor-pointer"
                title="Toggle % or Flat Rs"
              >
                {discountMode === 'percent' ? <FiPercent className="h-2.5 w-2.5" /> : <FiDollarSign className="h-2.5 w-2.5" />}
              </button>
            ) : null}
          </label>

          {applyDiscount ? (
            <div className="w-28 shrink-0">
              {discountMode === 'percent' ? (
                <div className="relative flex items-center w-full">
                  <Input
                    ref={discountInputRef}
                    type="number"
                    min={0}
                    max={100}
                    placeholder="10"
                    value={discountPercent || ''}
                    onChange={(e) => onDiscountPercentChange(Number(e.target.value) || 0)}
                    className="w-full text-right pr-6 py-1 text-xs font-mono font-medium"
                  />
                  <span className="absolute right-2 text-xs text-muted pointer-events-none">%</span>
                </div>
              ) : (
                <div className="relative flex items-center w-full">
                  <Input
                    ref={discountInputRef}
                    type="number"
                    min={0}
                    placeholder="0.00"
                    value={discount === 0 ? '' : discount}
                    onChange={(e) => onDiscountChange(Number(e.target.value) || 0)}
                    className="w-full text-right px-2 py-1 text-xs font-mono font-medium"
                  />
                </div>
              )}
            </div>
          ) : null}
        </div>

        {tradeInDeduction > 0 ? (
          <div className="flex justify-between text-emerald-600 dark:text-emerald-400 font-medium">
            <span>Trade-In Value</span>
            <span className="font-mono">- Rs {tradeInDeduction.toFixed(2)}</span>
          </div>
        ) : null}

        <div className="border-t border-border pt-2 flex justify-between items-baseline">
          <span className="font-bold text-ink text-base">Net Total</span>
          <span className="font-mono font-extrabold text-ink text-xl">Rs {total.toFixed(2)}</span>
        </div>
      </div>

      <hr className="my-3 border-border" />

      {/* Payment Method Selector */}
      <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-1">Payment Method</p>
      <div className="grid grid-cols-3 gap-1.5 mb-3">
        {(['CASH', 'CARD', 'BANK_TRANSFER'] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => onMethodChange(m)}
            className={`py-2 px-1 text-xs font-semibold rounded-xl border transition-all cursor-pointer ${
              method === m
                ? 'bg-ink text-canvas border-ink shadow-xs'
                : 'bg-canvas text-muted border-border hover:text-ink'
            }`}
          >
            {m === 'BANK_TRANSFER' ? 'Bank' : m}
          </button>
        ))}
      </div>

      {/* Amount Paid / Cash Tendered & Balance Feedback */}
      <div className="mb-3 space-y-2">
        <div className="flex items-center justify-between">
          <label htmlFor="tendered-amount-input" className="text-xs font-semibold text-muted uppercase tracking-wider">
            Amount Paid (F2)
          </label>
          {total > 0 && (
            <button
              type="button"
              onClick={() => onAmountChange(total.toString())}
              className="text-[11px] font-semibold text-primary hover:underline cursor-pointer"
            >
              Exact (Rs {total.toFixed(0)})
            </button>
          )}
        </div>

        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-muted pointer-events-none">
            Rs
          </span>
          <Input
            id="tendered-amount-input"
            ref={amountRef}
            type="number"
            min={0}
            step="any"
            value={amount}
            placeholder={total > 0 ? total.toFixed(2) : '0.00'}
            onChange={(e) => onAmountChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                onComplete();
              }
            }}
            className="pl-9 pr-3 py-2 text-sm font-mono font-semibold"
          />
        </div>

        {/* Quick Cash Suggestions */}
        {quickCashOptions.length > 0 && (
          <div className="flex items-center gap-1.5 pt-0.5 flex-wrap">
            <span className="text-[10px] text-muted font-medium uppercase">Quick:</span>
            {quickCashOptions.map((cashVal) => (
              <button
                key={cashVal}
                type="button"
                onClick={() => onAmountChange(cashVal.toString())}
                className="px-2 py-0.5 text-xs font-mono font-medium rounded-lg border border-border bg-canvas hover:bg-surface hover:border-ink transition-colors cursor-pointer"
              >
                Rs {cashVal.toLocaleString()}
              </button>
            ))}
          </div>
        )}

        {/* Live Auto-Calculated Balance / Change Feedback */}
        {amount !== '' && !isNaN(tenderedNum) && (
          <div className="pt-1">
            {tenderedNum > total ? (
              <div className="p-2.5 rounded-xl bg-emerald-500/10 border-2 border-emerald-500 text-emerald-950 dark:text-emerald-200 flex justify-between items-center shadow-xs">
                <div>
                  <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-700 dark:text-emerald-400 block">
                    Balance to Return
                  </span>
                  <span className="text-[11px] text-emerald-800/80 dark:text-emerald-300">
                    Paid Rs {tenderedNum.toLocaleString()} - Total Rs {total.toLocaleString()}
                  </span>
                </div>
                <span className="font-mono text-xl font-extrabold text-emerald-600 dark:text-emerald-400">
                  Rs {changeAmount.toFixed(2)}
                </span>
              </div>
            ) : tenderedNum === total ? (
              <div className="p-2 rounded-xl bg-blue-500/10 border border-blue-400 text-blue-900 dark:text-blue-300 flex justify-between items-center text-xs">
                <span>Exact Payment Received</span>
                <span className="font-mono font-semibold text-blue-600 dark:text-blue-400">Rs 0.00 Balance</span>
              </div>
            ) : tenderedNum > 0 ? (
              <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-400 text-amber-900 dark:text-amber-300 flex justify-between items-center text-xs">
                <span>Underpaid / Balance Due</span>
                <span className="font-mono font-bold text-amber-600 dark:text-amber-400">
                  Rs {(total - tenderedNum).toFixed(2)}
                </span>
              </div>
            ) : null}
          </div>
        )}
      </div>

      <Button
        onClick={onComplete}
        loading={completing}
        disabled={mobileRequiresCustomer}
        className={`w-full py-3 text-sm font-bold shadow-md rounded-xl transition-all ${
          mobileRequiresCustomer ? 'opacity-60 cursor-not-allowed bg-muted hover:bg-muted text-canvas' : ''
        }`}
        title={mobileRequiresCustomer ? 'Customer details are mandatory for mobile phone sales' : undefined}
      >
        {mobileRequiresCustomer ? 'Customer Required for Mobile Sale' : 'Complete & Print (F12)'}
      </Button>

      <p className="min-h-[1.25em] text-xs text-muted text-center mt-2">
        {saving ? 'Saving changes…' : ''}
        {error ? <span className="text-rose-500 font-medium">{error}</span> : ''}
      </p>
    </div>
  );
}
