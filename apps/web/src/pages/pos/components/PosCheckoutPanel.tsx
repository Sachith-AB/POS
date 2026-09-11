import React from 'react';
import { FiCalendar, FiDollarSign, FiPercent, FiRepeat, FiAlertCircle, FiUserPlus, FiCheckCircle } from 'react-icons/fi';
import { Button } from '../../../components/Button';
import { Input } from '../../../components/Input';
import type { WarrantyOption } from './types';

interface PosCheckoutPanelProps {
  customerPhone: string;
  customerName?: string | null;
  customerSearching?: boolean;
  customerSearched?: boolean;
  onCustomerPhoneChange: (phone: string) => void;
  onOpenRegisterCustomer?: () => void;
  hasMobileInBill: boolean;
  mobileRequiresCustomer: boolean;
  warrantyPeriodId: string | null;
  warranties: WarrantyOption[];
  onWarrantySelect: (id: string | null) => void;
  tradeInDeduction: number;
  tradeInDevice?: {
    deviceInfo: string;
    imei?: string | null;
    condition?: string;
    tradeInValue: number;
  } | null;
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
  posError?: string | null;
  onStartInstallment?: () => void;
  startingInstallment?: boolean;
}

export function PosCheckoutPanel({
  customerPhone,
  customerName,
  customerSearching = false,
  customerSearched = false,
  onCustomerPhoneChange,
  onOpenRegisterCustomer,
  hasMobileInBill,
  mobileRequiresCustomer,
  warrantyPeriodId,
  warranties,
  onWarrantySelect,
  tradeInDeduction,
  tradeInDevice,
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
  posError,
  onStartInstallment,
  startingInstallment,
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

      <div className="relative">
        <Input
          placeholder="Customer Phone (07XXXXXXXX)"
          value={customerPhone}
          onChange={(e) => onCustomerPhoneChange(e.target.value)}
          className={`w-full text-sm font-mono ${
            mobileRequiresCustomer ? 'border-rose-400 focus:border-rose-500' : ''
          }`}
        />
        {customerSearching ? (
          <span className="absolute right-3 top-2.5 text-[11px] text-muted animate-pulse flex items-center gap-1">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-primary animate-ping" />
            Searching...
          </span>
        ) : null}
      </div>

      {hasMobileInBill && mobileRequiresCustomer ? (
        <p className="text-[11px] text-rose-500 mt-1 font-medium">
          * Customer details are required to sell mobile phones
        </p>
      ) : null}

      {/* Customer Matched */}
      {customerName ? (
        <div className="mt-1.5 flex items-center justify-between text-xs font-semibold text-emerald-600 dark:text-emerald-400">
          <span className="flex items-center gap-1.5 truncate">
            <FiCheckCircle className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{customerName}</span>
          </span>
          <span className="text-[10px] font-normal text-muted bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20 shrink-0">
            Registered
          </span>
        </div>
      ) : null}

      {/* Customer Not Registered Prompt */}
      {!customerName && customerSearched && !customerSearching && customerPhone.trim().length >= 7 ? (
        <div className="mt-2 rounded-xl border border-amber-500/30 bg-amber-500/10 dark:bg-amber-500/5 p-2.5 text-xs animate-in fade-in duration-200">
          <div className="flex items-center gap-1.5 font-semibold text-amber-700 dark:text-amber-400">
            <FiAlertCircle className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
            <span>Customer not registered</span>
          </div>
          <p className="text-[11px] text-muted mt-1 leading-snug">
            No record found for <span className="font-mono font-medium text-ink">{customerPhone}</span>.
          </p>
          {onOpenRegisterCustomer ? (
            <button
              type="button"
              onClick={onOpenRegisterCustomer}
              className="mt-2 w-full py-1.5 px-3 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs flex items-center justify-center gap-1.5 shadow-xs transition-colors cursor-pointer"
            >
              <FiUserPlus className="h-3.5 w-3.5" />
              Register Customer
            </button>
          ) : null}
        </div>
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
          <div>
            {tradeInDevice?.deviceInfo ? (
              <p className="text-xs font-semibold text-ink truncate mt-1">
                {tradeInDevice.deviceInfo}
                {tradeInDevice.imei ? (
                  <span className="text-[10px] text-muted font-normal ml-1">
                    (IMEI: {tradeInDevice.imei})
                  </span>
                ) : null}
              </p>
            ) : null}
            <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 mt-0.5">
              - Rs {tradeInDeduction.toFixed(2)} credited
            </p>
          </div>
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
          <label htmlFor="tendered-amount-input" className="text-xs font-semibold text-muted uppercase tracking-wider flex items-center gap-1">
            <span>Amount Paid (F2)</span>
            <span className="text-rose-500 font-bold" title="Required">*</span>
          </label>
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
            placeholder="0.00 (Required)"
            required
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

        {posError && (
          <p className="text-[11px] text-rose-500 mt-1 font-medium">{posError}</p>
        )}

        {/* Quick Cash Suggestions */}
        {(total > 0 || quickCashOptions.length > 0) && (
          <div className="flex items-center gap-1.5 pt-0.5 flex-wrap">
            <span className="text-[10px] text-muted font-medium uppercase">Quick:</span>
            {total > 0 && (
              <button
                type="button"
                onClick={() => onAmountChange(total.toFixed(2))}
                className="px-2 py-0.5 text-xs font-mono font-medium rounded-lg border border-border bg-canvas hover:bg-surface hover:border-ink transition-colors cursor-pointer"
              >
                {total.toFixed(2)}
              </button>
            )}
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
      </div>

      <div className="space-y-2">
        <Button
          onClick={onComplete}
          loading={completing}
          disabled={mobileRequiresCustomer || startingInstallment}
          className={`w-full py-3 text-sm font-bold shadow-md rounded-xl transition-all ${
            mobileRequiresCustomer ? 'opacity-60 cursor-not-allowed bg-muted hover:bg-muted text-canvas' : ''
          }`}
          title={mobileRequiresCustomer ? 'Customer details are mandatory for mobile phone sales' : undefined}
        >
          {mobileRequiresCustomer ? 'Customer Required for Mobile Sale' : 'Complete & Print (F12)'}
        </Button>

        {onStartInstallment && (
          <Button
            type="button"
            variant="secondary"
            onClick={onStartInstallment}
            loading={startingInstallment}
            disabled={total <= 0 || completing}
            className="w-full py-2.5 text-xs font-bold rounded-xl border border-border bg-surface hover:bg-canvas text-ink transition-all flex items-center justify-center gap-1.5"
            title="Buy the selected products with an installment plan"
          >
            <FiCalendar className="h-3.5 w-3.5 text-primary" />
            <span>Buy with Installment Plan</span>
          </Button>
        )}
      </div>

      <p className="min-h-[1.25em] text-xs text-muted text-center mt-2">
        {saving ? 'Saving changes…' : ''}
        {error ? <span className="text-rose-500 font-medium">{error}</span> : ''}
      </p>
    </div>
  );
}
