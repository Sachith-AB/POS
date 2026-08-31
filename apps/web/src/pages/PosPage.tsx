import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiTrash2 } from 'react-icons/fi';
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
  itemScanned,
  lineQuantityChanged,
  lineRemoved,
  lineRestored,
  lastRemovedCleared,
  priceCheckToggled,
  saleCompleteRequested,
  lastCompletedCleared,
} from '../features/pos/posSlice';
import { quickButtonsRequested } from '../features/products/productsSlice';

export function PosPage() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
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
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  const searchRef = useRef<HTMLInputElement>(null);
  const amountRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    searchRef.current?.focus();
    dispatch(quickButtonsRequested());
  }, [dispatch]);

  // Clean up completed sale snapshot on unmount
  useEffect(() => {
    return () => {
      dispatch(lastCompletedCleared());
    };
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
      setShowSuccessModal(true);
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
              <Button
                key={i}
                onClick={() => dispatch(activeBillSwitched(i))}
                variant={i === activeIndex ? 'primary' : 'secondary'}
                className="py-1 px-2.5"
              >
                Bill {i + 1}
                {b.items.length ? ` (${b.items.length})` : ''}
              </Button>
            ))}
            <Button
              onClick={() => dispatch(priceCheckToggled())}
              variant={priceCheckMode ? 'primary' : 'secondary'}
              className="py-1 px-2.5"
            >
              {priceCheckMode ? 'Price Check: ON' : 'Price Check'}
            </Button>
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
                  <Button
                    onClick={() => dispatch(lineRemoved({ productId: item.productId }))}
                    variant="ghost"
                    className="p-1 h-8 w-8 text-rose-600 hover:text-rose-700 hover:bg-rose-50 border border-transparent hover:border-rose-200"
                    title="Remove item"
                  >
                    <FiTrash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))
            )}
          </div>

          {quickButtons.length > 0 ? (
            <div className="grid grid-cols-5 gap-1.5">
              {quickButtons.map((p) => (
                <Button
                  key={p.id}
                  onClick={() => addProduct(p)}
                  variant="secondary"
                  className="px-1 py-2 text-center text-xs"
                >
                  {p.name}
                </Button>
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
            placeholder={'00.0'}
            disabled
            value={total.toFixed(2)}
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

          <Button
            onClick={handleComplete}
            loading={completing}
            className="mt-3 w-full"
          >
            Complete &amp; Print (F12)
          </Button>

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

      {showSuccessModal && lastCompleted ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-xl border border-border bg-surface p-6 text-center shadow-lg">
            <span className="text-4xl text-success block mb-2">🎉</span>
            <h2 className="text-base font-bold text-ink">Sale Completed!</h2>
            <p className="text-xs text-muted mt-1 font-medium">Receipt has been sent to the printer.</p>
            <div className="my-4 rounded-lg bg-canvas p-3 text-xs border border-border">
              <p className="text-muted font-medium">Total Amount</p>
              <p className="text-lg font-mono font-bold text-ink">Rs {lastCompleted.total.toFixed(2)}</p>
            </div>
            <div className="flex flex-col gap-2">
              <Button
                type="button"
                onClick={() => {
                  setShowSuccessModal(false);
                  navigate(`/installments?createSaleId=${lastCompleted.id}`);
                }}
                className="w-full py-2 text-xs font-bold"
              >
                Convert to Installment Plan
              </Button>
              <Button
                type="button"
                onClick={() => {
                  window.print();
                }}
                variant="secondary"
                className="w-full py-2 text-xs font-bold"
              >
                Print Receipt Again
              </Button>
              <Button
                type="button"
                onClick={() => {
                  setShowSuccessModal(false);
                  dispatch(lastCompletedCleared());
                }}
                variant="secondary"
                className="w-full py-2 text-xs font-bold text-muted hover:text-ink"
              >
                Dismiss / New Sale
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
