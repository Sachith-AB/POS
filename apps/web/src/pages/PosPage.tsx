import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiTrash2, FiShield, FiRepeat, FiPercent, FiDollarSign } from 'react-icons/fi';
import { useAppDispatch, useAppSelector } from '../app/hooks';
import { api, ApiError } from '../lib/api';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';
import { UndoToast } from '../components/UndoToast';
import { Receipt } from '../components/Receipt';
import { Input } from '../components/Input';
import { Button } from '../components/Button';
import type { Product } from '../features/products/productsSlice';
import {
  activeBillSwitched,
  customerPhoneChanged,
  discountChanged,
  discountPercentChanged,
  itemScanned,
  linePriceChanged,
  linePriceTypeChanged,
  lineQuantityChanged,
  lineRemoved,
  lineRestored,
  lastRemovedCleared,
  priceCheckToggled,
  saleCompleteRequested,
  lastCompletedCleared,
  warrantySelected,
  tradeInApplied,
} from '../features/pos/posSlice';
import { quickButtonsRequested } from '../features/products/productsSlice';

interface WarrantyOption {
  id: string;
  label: string;
  durationDays: number;
  isDefault: boolean;
}

interface TradeInItem {
  id: string;
  deviceInfo: string;
  imei: string | null;
  tradeInValue: number | string;
  customerName: string | null;
}

export function PosPage() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { bills, activeIndex, priceCheckMode, saving, completing, lastRemoved, error } = useAppSelector(
    (s) => s.pos
  );
  const quickButtons = useAppSelector((s) => s.products.quickButtons);
  const settings = useAppSelector((s) => s.settings.data);
  const lastCompleted = useAppSelector((s) => s.pos.lastCompleted);
  const bill = bills[activeIndex];
  const printedRef = useRef<string | null>(null);

  const [term, setTerm] = useState('');
  const [notFound, setNotFound] = useState<string | null>(null);
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<'CASH' | 'CARD' | 'BANK_TRANSFER'>('CASH');
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [discountMode, setDiscountMode] = useState<'amount' | 'percent'>('percent');

  // Warranties & Trade-in state
  const [warranties, setWarranties] = useState<WarrantyOption[]>([]);
  const [tradeIns, setTradeIns] = useState<TradeInItem[]>([]);
  const [showTradeInModal, setShowTradeInModal] = useState(false);

  // Installment preview state in completion modal (Dev Critical #4)
  const [showInstallmentPreview, setShowInstallmentPreview] = useState(false);
  const [instDownPayment, setInstDownPayment] = useState<number>(0);
  const [instPeriodMonths, setInstPeriodMonths] = useState<number>(6);
  const [instInterestMethod, setInstInterestMethod] = useState<'PERCENTAGE' | 'FIXED_AMOUNT'>('PERCENTAGE');
  const [instInterestValue, setInstInterestValue] = useState<number>(12);

  const searchRef = useRef<HTMLInputElement>(null);
  const amountRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    searchRef.current?.focus();
    dispatch(quickButtonsRequested());

    // Load available warranty periods
    api.get<WarrantyOption[]>('/warranties?sales=true')
      .then((data) => setWarranties(data || []))
      .catch(() => {});

    // Load pending trade-in devices
    api.get<TradeInItem[]>('/trade-ins?status=PENDING')
      .then((data) => setTradeIns(data || []))
      .catch(() => {});
  }, [dispatch]);

  // Set default discount percent when bill is empty and settings are loaded (Q2)
  useEffect(() => {
    if (bill.items.length > 0 && bill.discount === 0 && bill.discountPercent === 0 && settings?.defaultDiscountPercent) {
      const defaultPct = Number(settings.defaultDiscountPercent);
      if (defaultPct > 0) {
        dispatch(discountPercentChanged(defaultPct));
      }
    }
  }, [bill.items.length, settings?.defaultDiscountPercent, dispatch]);

  // Clean up completed sale snapshot on unmount
  useEffect(() => {
    return () => {
      dispatch(lastCompletedCleared());
    };
  }, [dispatch]);

  // Enter key shortcut to start a new sale when success modal is open
  useEffect(() => {
    if (!showSuccessModal) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Enter') {
        e.preventDefault();
        setShowSuccessModal(false);
        dispatch(lastCompletedCleared());
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showSuccessModal, dispatch]);

  // Clear price check notification message when price check mode is turned off
  useEffect(() => {
    if (!priceCheckMode) {
      setNotFound(null);
    }
  }, [priceCheckMode]);

  const subtotal = bill.items.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0);
  const tradeInDeduction = bill.tradeInValue || 0;
  const total = Math.max(0, subtotal - bill.discount - tradeInDeduction);

  function addProduct(product: Product) {
    if (priceCheckMode) {
      setNotFound(`${product.name}: Rs ${Number(product.sellPrice).toFixed(2)}`);
      return;
    }
    dispatch(
      itemScanned({
        productId: product.id,
        name: product.name,
        barcode: product.barcode,
        unitPrice: Number(product.sellPrice),
        retailPrice: Number(product.sellPrice),
        wholesalePrice: product.wholesalePrice ? Number(product.wholesalePrice) : null,
        businessPrice: product.businessPrice ? Number(product.businessPrice) : null,
        priceType: 'RETAIL',
      })
    );
  }

  async function handleEnter() {
    const query = term.trim();
    if (!query) return;
    setNotFound(null);
    try {
      const product = await api.get<Product>(`/products/barcode/${encodeURIComponent(query)}`);
      addProduct(product);
      setTerm('');
      return;
    } catch (err) {
      if (!(err instanceof ApiError) || err.status !== 404) throw err;
    }
    const results = await api.get<Product[]>(`/products?search=${encodeURIComponent(query)}`);
    if (results.length > 0) {
      addProduct(results[0]);
      setTerm('');
    } else {
      setNotFound(`No product found for "${query}"`);
    }
  }

  function handleComplete() {
    const parsed = amount ? Number(amount) : total;
    dispatch(saleCompleteRequested({ amount: parsed, method }));
  }

  useEffect(() => {
    if (lastCompleted && printedRef.current !== lastCompleted.completedAt) {
      printedRef.current = lastCompleted.completedAt;
      setAmount('');
      window.print();
      setShowSuccessModal(true);

      // Pre-calculate installment defaults for the modal preview (Dev Critical #4 & Q13)
      const defaultDownPct = settings?.defaultDownPaymentPercent ? Number(settings.defaultDownPaymentPercent) : 35;
      const down = Math.round(((lastCompleted.total * defaultDownPct) / 100) * 100) / 100;
      setInstDownPayment(down);
      setInstPeriodMonths(6);
      setInstInterestMethod(settings?.defaultInterestMethod || 'PERCENTAGE');
      setInstInterestValue(Number(settings?.defaultInterestValue || 12));
    }
  }, [lastCompleted, settings]);

  useKeyboardShortcuts({
    F1: () => searchRef.current?.focus(),
    F2: () => amountRef.current?.focus(),
    F12: () => handleComplete(),
    Escape: () => {
      setTerm('');
      setNotFound(null);
      searchRef.current?.focus();
    },
  });

  return (
    <>
      <div className="grid min-h-0 flex-1 grid-cols-[1fr_380px] gap-4 p-4">
        <div className="flex min-h-0 flex-col gap-3">
          {/* Bill Slots Bar */}
          <div className="flex items-center justify-between">
            <div className="flex gap-1.5">
              {bills.map((b, i) => (
                <Button
                  key={i}
                  onClick={() => dispatch(activeBillSwitched(i))}
                  variant={i === activeIndex ? 'primary' : 'secondary'}
                  className="py-1 px-2.5 text-xs font-semibold"
                >
                  Bill {i + 1}
                  {b.items.length ? ` (${b.items.length})` : ''}
                </Button>
              ))}
              <Button
                onClick={() => {
                  dispatch(priceCheckToggled());
                  setNotFound(null);
                }}
                variant={priceCheckMode ? 'primary' : 'secondary'}
                className="py-1 px-2.5 text-xs"
              >
                {priceCheckMode ? 'Price Check: ON' : 'Price Check'}
              </Button>
            </div>

            {/* 3 Days Warranty Notification Badge (Q4) */}
            <div className="flex items-center gap-1.5 text-xs bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2.5 py-1 rounded-full font-medium border border-emerald-500/20">
              <FiShield className="h-3.5 w-3.5" />
              <span>3 Days Return/Support Active</span>
            </div>
          </div>

          {/* Search Bar */}
          <Input
            ref={searchRef}
            placeholder="Scan barcode or search item… (F1)"
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleEnter();
            }}
            autoComplete="off"
            className="w-full text-base py-2.5"
          />
          {notFound ? <p className="text-amber-500 text-sm font-medium">{notFound}</p> : null}

          {/* Cart Table with Price Types, Editable Price, and Per-Item Warranty */}
          <div className="flex-1 overflow-y-auto rounded-xl border border-border bg-surface shadow-xs">
            {bill.items.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 text-muted">
                <p className="font-medium">No items yet</p>
                <p className="text-xs text-muted/70 mt-1">Scan barcode or select quick buttons below</p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                <div className="grid grid-cols-[1.5fr_100px_80px_110px_110px_36px] items-center gap-2 bg-canvas px-3 py-2 text-xs font-semibold text-muted uppercase">
                  <span>Product &amp; Warranty</span>
                  <span>Price Type</span>
                  <span>Qty</span>
                  <span>Unit Price (Rs)</span>
                  <span>Line Total (Rs)</span>
                  <span></span>
                </div>
                {bill.items.map((item) => (
                  <div
                    key={item.productId}
                    className="grid grid-cols-[1.5fr_100px_80px_110px_110px_36px] items-center gap-2 px-3 py-2.5 hover:bg-canvas/50 transition-colors"
                  >
                    <div>
                      <span className="font-semibold text-ink text-sm block leading-tight">{item.name}</span>
                      {/* Configurable Warranty time per product (User Request) */}
                      <div className="flex items-center gap-1.5 mt-1">
                        <FiShield className="h-3 w-3 text-emerald-500" />
                        <select
                          className="text-xs bg-canvas border border-border rounded px-1.5 py-0.5 text-muted focus:outline-none focus:border-ink cursor-pointer"
                          value={item.priceType || 'RETAIL'}
                          onChange={(e) =>
                            dispatch(
                              linePriceTypeChanged({
                                productId: item.productId,
                                priceType: e.target.value as any,
                              })
                            )
                          }
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

                    {/* Price Types Selector (Q1: Retail, Wholesale, Business) */}
                    <select
                      value={item.priceType || 'RETAIL'}
                      onChange={(e) =>
                        dispatch(
                          linePriceTypeChanged({
                            productId: item.productId,
                            priceType: e.target.value as any,
                          })
                        )
                      }
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

                    {/* Quantity */}
                    <Input
                      type="number"
                      min={1}
                      value={item.quantity}
                      onChange={(e) =>
                        dispatch(lineQuantityChanged({ productId: item.productId, quantity: Number(e.target.value) }))
                      }
                      className="text-center font-semibold text-sm py-1"
                    />

                    {/* Editable Unit Price (Q3: Bill price adjustments) */}
                    <Input
                      type="number"
                      min={0}
                      step="any"
                      value={item.unitPrice}
                      onChange={(e) =>
                        dispatch(linePriceChanged({ productId: item.productId, unitPrice: Number(e.target.value) }))
                      }
                      className="text-right font-mono font-medium text-sm py-1"
                    />

                    {/* Line Total */}
                    <span className="text-right font-mono font-semibold text-ink text-sm">
                      {(item.quantity * item.unitPrice).toFixed(2)}
                    </span>

                    {/* Remove Action */}
                    <Button
                      onClick={() => dispatch(lineRemoved({ productId: item.productId }))}
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

          {/* Quick Buttons */}
          {quickButtons.length > 0 ? (
            <div className="grid grid-cols-5 gap-1.5">
              {quickButtons.map((p) => (
                <Button
                  key={p.id}
                  onClick={() => addProduct(p)}
                  variant="secondary"
                  className="px-2 py-2.5 text-center text-xs font-medium rounded-xl truncate"
                >
                  {p.name}
                </Button>
              ))}
            </div>
          ) : null}
        </div>

        {/* Right Checkout Panel */}
        <div className="flex flex-col rounded-2xl border border-border bg-surface p-5 shadow-xs">
          <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-1">Customer Details</p>
          <Input
            placeholder="Customer Phone (07XXXXXXXX)"
            value={bill.customerPhone}
            onChange={(e) => dispatch(customerPhoneChanged(e.target.value))}
            className="w-full text-sm"
          />
          {bill.customerName ? (
            <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400 mt-1">{bill.customerName}</p>
          ) : null}

          <hr className="my-3 border-border" />

          {/* Overall Warranty Period Selector (Q5) */}
          <div className="mb-2">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-semibold text-muted">Bill Warranty</span>
              <span className="text-[10px] text-muted">Includes 3-day support</span>
            </div>
            <select
              value={bill.warrantyPeriodId || ''}
              onChange={(e) => dispatch(warrantySelected(e.target.value || null))}
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

          {/* Trade-In Adjustment Section (Q18) */}
          <div className="mb-2 rounded-xl bg-canvas p-2.5 border border-border">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted flex items-center gap-1">
                <FiRepeat className="h-3 w-3" /> Trade-In Device
              </span>
              {tradeInDeduction > 0 ? (
                <button
                  type="button"
                  onClick={() => dispatch(tradeInApplied({ tradeInId: null, tradeInValue: 0 }))}
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
                onClick={() => setShowTradeInModal(true)}
                className="mt-1 w-full text-xs py-1 px-2 border border-dashed border-border rounded text-muted hover:text-ink hover:border-ink cursor-pointer"
              >
                + Apply Used Device Trade-In
              </button>
            )}
          </div>

          {/* Price Calculations */}
          <div className="space-y-2 py-2 text-sm">
            <div className="flex justify-between text-muted">
              <span>Subtotal</span>
              <span className="font-mono font-medium">Rs {subtotal.toFixed(2)}</span>
            </div>

            {/* Discount with % and Flat toggle (Q2: default 10% configurable) */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1">
                <span className="text-muted text-xs">Discount</span>
                <button
                  type="button"
                  onClick={() => setDiscountMode(discountMode === 'percent' ? 'amount' : 'percent')}
                  className="p-1 rounded bg-canvas border border-border text-[10px] font-semibold text-muted hover:text-ink cursor-pointer"
                  title="Toggle % or Flat Rs"
                >
                  {discountMode === 'percent' ? <FiPercent className="h-2.5 w-2.5" /> : <FiDollarSign className="h-2.5 w-2.5" />}
                </button>
              </div>
              <div className="w-28">
                {discountMode === 'percent' ? (
                  <div className="relative flex items-center">
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      placeholder="10"
                      value={bill.discountPercent || ''}
                      onChange={(e) => dispatch(discountPercentChanged(Number(e.target.value) || 0))}
                      className="text-right pr-6 py-1 text-xs font-mono font-medium"
                    />
                    <span className="absolute right-2 text-xs text-muted pointer-events-none">%</span>
                  </div>
                ) : (
                  <Input
                    type="number"
                    min={0}
                    placeholder="0.00"
                    value={bill.discount === 0 ? '' : bill.discount}
                    onChange={(e) => dispatch(discountChanged(Number(e.target.value) || 0))}
                    className="text-right py-1 text-xs font-mono font-medium"
                  />
                )}
              </div>
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

          {/* Payment Method Selector (Q6: Cash, Card, Bank Transfer) */}
          <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-1">Payment Method</p>
          <div className="grid grid-cols-3 gap-1.5 mb-3">
            {(['CASH', 'CARD', 'BANK_TRANSFER'] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMethod(m)}
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

          <Button
            onClick={handleComplete}
            loading={completing}
            className="w-full py-3 text-sm font-bold shadow-md rounded-xl"
          >
            Complete &amp; Print (F12)
          </Button>

          <p className="min-h-[1.25em] text-xs text-muted text-center mt-2">
            {saving ? 'Saving changes…' : ''}
            {error ? <span className="text-rose-500 font-medium">{error}</span> : ''}
          </p>
        </div>
      </div>

      {/* Trade-In Selection Modal (Q18) */}
      {showTradeInModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
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
                      dispatch(tradeInApplied({ tradeInId: t.id, tradeInValue: Number(t.tradeInValue) }));
                      setShowTradeInModal(false);
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
              <Button variant="secondary" onClick={() => setShowTradeInModal(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {lastRemoved ? (
        <UndoToast
          message={`Removed ${lastRemoved.line.name}`}
          onUndo={() => dispatch(lineRestored())}
          onExpire={() => dispatch(lastRemovedCleared())}
        />
      ) : null}

      <Receipt />

      {/* Post-Sale Completion Modal with Inline Installment Breakdown (Dev Critical #4 & Q7, Q13) */}
      {showSuccessModal && lastCompleted ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-lg rounded-2xl border border-border bg-surface p-6 shadow-2xl">
            <div className="text-center mb-4">
              <h2 className="text-lg font-bold text-ink">Sale Completed Successfully!</h2>
              <p className="text-xs text-muted font-medium">Receipt has been printed. Total: Rs {lastCompleted.total.toFixed(2)}</p>
            </div>

            {/* Installment Plan Breakdown Toggle (Dev Critical #4) */}
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
                  {(() => {
                    const principal = Math.max(0, lastCompleted.total - instDownPayment);
                    const interestAmount =
                      instInterestMethod === 'PERCENTAGE'
                        ? Math.round(((principal * instInterestValue) / 100) * 100) / 100
                        : instInterestValue;
                    const totalPayable = principal + interestAmount;
                    const monthly = Math.round((totalPayable / instPeriodMonths) * 100) / 100;

                    return (
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
                    );
                  })()}

                  <Button
                    type="button"
                    onClick={() => {
                      setShowSuccessModal(false);
                      navigate(
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
                onClick={() => window.print()}
                variant="secondary"
                className="w-full py-2 text-xs font-bold"
              >
                Print Receipt Again
              </Button>
              <Button
                type="button"
                autoFocus
                onClick={() => {
                  setShowSuccessModal(false);
                  dispatch(lastCompletedCleared());
                }}
                className="w-full py-2 text-xs font-bold"
              >
                New Sale (Press Enter)
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

