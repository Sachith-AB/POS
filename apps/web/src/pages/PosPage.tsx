import { useEffect, useRef, useState } from 'react';
import { useAppDispatch, useAppSelector } from '../app/hooks';
import { api, ApiError } from '../lib/api';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';
import { UndoToast } from '../components/UndoToast';
import { Receipt } from '../components/Receipt';
import { Input } from '../components/Input';
import type { Product } from '../features/products/productsSlice';
import {
  activeBillSwitched,
  customerPhoneChanged,
  discountChanged,
  itemScanned,
  lineQuantityChanged,
  lineRemoved,
  lineRestored,
  lastRemovedCleared,
  priceCheckToggled,
  saleCompleteRequested,
} from '../features/pos/posSlice';
import { quickButtonsRequested } from '../features/products/productsSlice';

export function PosPage() {
  const dispatch = useAppDispatch();
  const { bills, activeIndex, priceCheckMode, saving, completing, lastRemoved, error } = useAppSelector(
    (s) => s.pos
  );
  const quickButtons = useAppSelector((s) => s.products.quickButtons);
  const lastCompleted = useAppSelector((s) => s.pos.lastCompleted);
  const bill = bills[activeIndex];
  const printedRef = useRef<string | null>(null);

  const [term, setTerm] = useState('');
  const [notFound, setNotFound] = useState<string | null>(null);
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<'CASH' | 'CARD' | 'BANK_TRANSFER'>('CASH');

  const searchRef = useRef<HTMLInputElement>(null);
  const amountRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    searchRef.current?.focus();
    dispatch(quickButtonsRequested());
  }, [dispatch]);

  const subtotal = bill.items.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0);
  const total = Math.max(0, subtotal - bill.discount);

  function addProduct(product: Product) {
    if (priceCheckMode) {
      setNotFound(`${product.name}: ${Number(product.sellPrice).toFixed(2)}`);
      return;
    }
    dispatch(
      itemScanned({
        productId: product.id,
        name: product.name,
        barcode: product.barcode,
        unitPrice: Number(product.sellPrice),
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
    }
  }, [lastCompleted]);

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
      <div className="grid min-h-0 flex-1 grid-cols-[1fr_340px] gap-4 p-4">
        <div className="flex min-h-0 flex-col gap-3">
          <div className="flex gap-1.5">
            {bills.map((b, i) => (
              <button
                key={i}
                onClick={() => dispatch(activeBillSwitched(i))}
                className={`rounded-lg border px-2.5 py-1.5 text-sm ${
                  i === activeIndex
                    ? 'border-primary bg-primary text-on-primary'
                    : 'border-border bg-surface text-ink'
                }`}
              >
                Bill {i + 1}
                {b.items.length ? ` (${b.items.length})` : ''}
              </button>
            ))}
            <button
              onClick={() => dispatch(priceCheckToggled())}
              className={`rounded-lg border px-2.5 py-1.5 text-sm ${
                priceCheckMode
                  ? 'border-primary bg-primary text-on-primary'
                  : 'border-border bg-surface text-ink'
              }`}
            >
              {priceCheckMode ? 'Price Check: ON' : 'Price Check'}
            </button>
          </div>

          <Input
            ref={searchRef}
            placeholder="Scan barcode or search item… (F1)"
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleEnter();
            }}
            autoComplete="off"
            className="w-full"
          />
          {notFound ? <p className="text-muted">{notFound}</p> : null}

          <div className="flex-1 overflow-y-auto rounded-lg border border-border bg-surface">
            {bill.items.length === 0 ? (
              <p className="p-4 text-muted">No items yet - scan or search to add.</p>
            ) : (
              bill.items.map((item) => (
                <div
                  key={item.productId}
                  className="grid grid-cols-[1fr_70px_90px_90px_32px] items-center gap-2 border-b border-border px-3 py-2"
                >
                  <span>{item.name}</span>
                  <Input
                    type="number"
                    min={1}
                    value={item.quantity}
                    onChange={(e) =>
                      dispatch(lineQuantityChanged({ productId: item.productId, quantity: Number(e.target.value) }))
                    }
                  />
                  <span>{item.unitPrice.toFixed(2)}</span>
                  <span>{(item.quantity * item.unitPrice).toFixed(2)}</span>
                  <button
                    onClick={() => dispatch(lineRemoved({ productId: item.productId }))}
                    className="rounded-lg border border-border bg-surface text-ink"
                  >
                    ×
                  </button>
                </div>
              ))
            )}
          </div>

          {quickButtons.length > 0 ? (
            <div className="grid grid-cols-5 gap-1.5">
              {quickButtons.map((p) => (
                <button
                  key={p.id}
                  onClick={() => addProduct(p)}
                  className="rounded-lg border border-border bg-surface px-1 py-2.5 text-center text-xs text-ink"
                >
                  {p.name}
                </button>
              ))}
            </div>
          ) : null}
        </div>

        <div className="rounded-xl border border-border bg-surface p-4">
          <p className="text-muted">Customer phone</p>
          <Input
            value={bill.customerPhone}
            onChange={(e) => dispatch(customerPhoneChanged(e.target.value))}
            className="w-full"
          />
          {bill.customerName ? <p>{bill.customerName}</p> : null}

          <hr className="my-3 border-border" />
          <div className="grid grid-cols-2 items-center gap-2 py-1">
            <span>Subtotal</span>
            <span>{subtotal.toFixed(2)}</span>
          </div>
          <div className="grid grid-cols-2 items-center gap-2 py-1">
            <span>Discount</span>
            <Input
              type="number"
              min={0}
              placeholder="0"
              value={bill.discount === 0 ? '' : bill.discount}
              onChange={(e) => dispatch(discountChanged(e.target.value === '' ? 0 : Number(e.target.value)))}
            />
          </div>
          <div className="grid grid-cols-2 items-center gap-2 py-1 font-bold">
            <span>Total</span>
            <span>{total.toFixed(2)}</span>
          </div>

          <hr className="my-3 border-border" />
          <p className="text-muted">Amount (F2)</p>
          <Input
            ref={amountRef}
            type="number"
            placeholder={total.toFixed(2)}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleComplete();
            }}
            className="w-full"
          />
          <select
            value={method}
            onChange={(e) => setMethod(e.target.value as typeof method)}
            className="mt-2 w-full rounded-lg border border-border bg-surface px-2.5 py-2 text-ink"
          >
            <option value="CASH">Cash</option>
            <option value="CARD">Card</option>
            <option value="BANK_TRANSFER">Bank Transfer</option>
          </select>

          <button
            onClick={handleComplete}
            className="mt-3 w-full rounded-lg border border-primary bg-primary py-2 font-semibold text-on-primary hover:bg-primary-hover"
          >
            Complete &amp; Print (F12)
          </button>

          <p className="min-h-[1.25em] text-muted">
            {saving ? 'Saving…' : ''}
            {error ? error : ''}
          </p>
        </div>
      </div>

      {lastRemoved ? (
        <UndoToast
          message={`Removed ${lastRemoved.line.name}`}
          onUndo={() => dispatch(lineRestored())}
          onExpire={() => dispatch(lastRemovedCleared())}
        />
      ) : null}

      <Receipt />
    </>
  );
}
