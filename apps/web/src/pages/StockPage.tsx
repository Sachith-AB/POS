import { useEffect, useRef, useState } from 'react';
import { useAppDispatch, useAppSelector } from '../app/hooks';
import { api } from '../lib/api';
import { Input } from '../components/Input';
import type { Product } from '../features/products/productsSlice';
import {
  barcodeEntered,
  batchSubmitRequested,
  invoiceRefChanged,
  lineAdded,
  lineRemoved,
  quickCreateRequested,
  supplierNameChanged,
} from '../features/stock/stockSlice';

const primaryBtnClass =
  'rounded-lg border border-primary bg-primary px-3.5 py-2 font-semibold text-on-primary disabled:opacity-50';
const btnClass = 'rounded-lg border border-border bg-surface px-3.5 py-2 text-ink';

function ReceiveStockPanel() {
  const dispatch = useAppDispatch();
  const { matchedProduct, notFoundBarcode, pendingLines, supplierName, invoiceRef, submitting, lastBatchCount } =
    useAppSelector((s) => s.stock);

  const [code, setCode] = useState('');
  const [qty, setQty] = useState('1');
  const [cost, setCost] = useState('');
  const [imeis, setImeis] = useState<string[]>([]);
  const [imeiInput, setImeiInput] = useState('');
  const [quickName, setQuickName] = useState('');
  const [quickCost, setQuickCost] = useState('');
  const [quickSell, setQuickSell] = useState('');
  const [quickQty, setQuickQty] = useState('1');
  const [quickCategory, setQuickCategory] = useState('');

  const scanRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    scanRef.current?.focus();
  }, []);

  useEffect(() => {
    if (matchedProduct) {
      setCost(String(matchedProduct.costPrice));
      setQty('1');
      setImeis([]);
    }
  }, [matchedProduct]);

  function submitScan() {
    if (!code.trim()) return;
    dispatch(barcodeEntered(code.trim()));
  }

  function confirmNonSerializedLine() {
    if (!matchedProduct) return;
    dispatch(
      lineAdded({
        productId: matchedProduct.id,
        name: matchedProduct.name,
        quantityDelta: Number(qty) || 1,
        costPriceAtTime: cost ? Number(cost) : undefined,
        imeis: [],
      })
    );
    setCode('');
    scanRef.current?.focus();
  }

  function addImei() {
    if (!imeiInput.trim()) return;
    setImeis((prev) => [...prev, imeiInput.trim()]);
    setImeiInput('');
  }

  function finishSerializedProduct() {
    if (!matchedProduct || imeis.length === 0) return;
    dispatch(
      lineAdded({
        productId: matchedProduct.id,
        name: matchedProduct.name,
        quantityDelta: imeis.length,
        costPriceAtTime: cost ? Number(cost) : undefined,
        imeis,
      })
    );
    setImeis([]);
    setCode('');
    scanRef.current?.focus();
  }

  function submitQuickCreate() {
    dispatch(
      quickCreateRequested({
        barcode: notFoundBarcode ?? code.trim(),
        name: quickName,
        costPrice: Number(quickCost) || 0,
        sellPrice: Number(quickSell) || 0,
        quantity: Number(quickQty) || 1,
        category: quickCategory || 'Uncategorized',
      })
    );
    setQuickName('');
    setQuickCost('');
    setQuickSell('');
    setQuickQty('1');
    setQuickCategory('');
    setCode('');
    scanRef.current?.focus();
  }

  const totalUnits = pendingLines.reduce((s, l) => s + l.quantityDelta, 0);

  return (
    <div className="grid grid-cols-2 gap-4">
      <div className="rounded-xl border border-border bg-surface p-4">
        <h3 className="font-semibold">Scan to Receive</h3>
        <Input
          ref={scanRef}
          placeholder="Scan barcode / IMEI"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') submitScan();
          }}
          autoComplete="off"
          className="mt-2 w-full"
        />

        {matchedProduct && !matchedProduct.isSerialized ? (
          <div className="mt-3">
            <p>
              <strong>{matchedProduct.name}</strong> — current stock: {matchedProduct.quantity}
            </p>
            <label className="mt-2 block text-muted">Quantity received</label>
            <Input
              type="number"
              min={1}
              value={qty}
              autoFocus
              onChange={(e) => setQty(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') confirmNonSerializedLine();
              }}
              className="w-full"
            />
            <label className="mt-2 block text-muted">Cost price (this delivery)</label>
            <Input type="number" value={cost} onChange={(e) => setCost(e.target.value)} className="w-full" />
            <button onClick={confirmNonSerializedLine} className={`${primaryBtnClass} mt-2`}>
              Add to batch (Enter)
            </button>
          </div>
        ) : null}

        {matchedProduct && matchedProduct.isSerialized ? (
          <div className="mt-3">
            <p>
              <strong>{matchedProduct.name}</strong> — serialized item, scan each IMEI
            </p>
            <Input
              placeholder="Scan IMEI"
              value={imeiInput}
              autoFocus
              onChange={(e) => setImeiInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') addImei();
              }}
              className="w-full"
            />
            <ul className="my-2 list-disc pl-5">
              {imeis.map((i) => (
                <li key={i}>{i}</li>
              ))}
            </ul>
            <button onClick={finishSerializedProduct} disabled={imeis.length === 0} className={primaryBtnClass}>
              Done ({imeis.length} units)
            </button>
          </div>
        ) : null}

        {notFoundBarcode ? (
          <div className="mt-3 flex flex-col gap-2">
            <p className="text-muted">No product for "{notFoundBarcode}" — create it:</p>
            <Input placeholder="Name" value={quickName} onChange={(e) => setQuickName(e.target.value)} className="w-full" />
            <Input
              placeholder="Category"
              value={quickCategory}
              onChange={(e) => setQuickCategory(e.target.value)}
              className="w-full"
            />
            <Input
              placeholder="Cost price"
              type="number"
              value={quickCost}
              onChange={(e) => setQuickCost(e.target.value)}
              className="w-full"
            />
            <Input
              placeholder="Sell price"
              type="number"
              value={quickSell}
              onChange={(e) => setQuickSell(e.target.value)}
              className="w-full"
            />
            <Input
              placeholder="Initial quantity"
              type="number"
              value={quickQty}
              onChange={(e) => setQuickQty(e.target.value)}
              className="w-full"
            />
            <button onClick={submitQuickCreate} disabled={!quickName} className={primaryBtnClass}>
              Create &amp; add to batch
            </button>
          </div>
        ) : null}
      </div>

      <div className="rounded-xl border border-border bg-surface p-4">
        <h3 className="font-semibold">
          Batch ({pendingLines.length} lines, {totalUnits} units)
        </h3>
        <Input
          placeholder="Supplier name (optional)"
          value={supplierName}
          onChange={(e) => dispatch(supplierNameChanged(e.target.value))}
          className="mt-2 w-full"
        />
        <Input
          placeholder="Invoice ref (optional)"
          value={invoiceRef}
          onChange={(e) => dispatch(invoiceRefChanged(e.target.value))}
          className="mt-2 w-full"
        />
        <ul className="my-2 flex flex-col gap-1">
          {pendingLines.map((l) => (
            <li key={l.productId} className="flex items-center justify-between">
              <span>
                {l.name}: +{l.quantityDelta} {l.imeis.length ? `(IMEIs: ${l.imeis.join(', ')})` : ''}
              </span>
              <button onClick={() => dispatch(lineRemoved(l.productId))} className={btnClass}>
                remove
              </button>
            </li>
          ))}
        </ul>
        <button
          onClick={() => dispatch(batchSubmitRequested())}
          disabled={pendingLines.length === 0 || submitting}
          className={primaryBtnClass}
        >
          {submitting ? 'Saving…' : 'Finalize Batch'}
        </button>
        {lastBatchCount !== null ? (
          <p className="mt-2 text-muted">Last batch received: {lastBatchCount} line(s).</p>
        ) : null}
      </div>
    </div>
  );
}

function LabelPrinterPanel() {
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<Product[]>([]);
  const [queue, setQueue] = useState<{ productId: string; name: string; quantity: number }[]>([]);
  const [labels, setLabels] = useState<{ productId: string; name: string; quantity: number; imageDataUrl: string }[]>([]);

  async function runSearch() {
    if (!search.trim()) return setResults([]);
    setResults(await api.get<Product[]>(`/products?search=${encodeURIComponent(search)}`));
  }

  function addToQueue(product: Product) {
    setQueue((q) =>
      q.some((i) => i.productId === product.id) ? q : [...q, { productId: product.id, name: product.name, quantity: 1 }]
    );
  }

  async function printLabels() {
    const generated = await api.post<typeof labels>('/labels', {
      items: queue.map((q) => ({ productId: q.productId, quantity: q.quantity })),
      format: 'CODE128',
    });
    setLabels(generated);
    setTimeout(() => window.print(), 100);
  }

  return (
    <div className="mt-4 rounded-xl border border-border bg-surface p-4">
      <h3 className="font-semibold">Print Labels</h3>
      <Input
        placeholder="Search product to label"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') runSearch();
        }}
        className="mt-2 w-full"
      />
      <ul className="my-2 flex flex-col gap-1">
        {results.map((p) => (
          <li key={p.id} className="flex items-center justify-between">
            <span>
              {p.name} ({p.sku})
            </span>
            <button onClick={() => addToQueue(p)} className={btnClass}>
              add
            </button>
          </li>
        ))}
      </ul>
      <ul className="my-2 flex flex-col gap-1">
        {queue.map((q) => (
          <li key={q.productId} className="flex items-center gap-2">
            {q.name} — qty:{' '}
            <Input
              type="number"
              min={1}
              value={q.quantity}
              onChange={(e) =>
                setQueue((prev) =>
                  prev.map((item) => (item.productId === q.productId ? { ...item, quantity: Number(e.target.value) } : item))
                )
              }
              className="w-16"
            />
          </li>
        ))}
      </ul>
      <button onClick={printLabels} disabled={queue.length === 0} className={primaryBtnClass}>
        Generate &amp; Print
      </button>

      <div className="label-sheet flex flex-wrap gap-[4mm]">
        {labels.flatMap((label) =>
          Array.from({ length: label.quantity }, (_, i) => (
            <img key={`${label.productId}-${i}`} src={label.imageDataUrl} alt={label.name} className="w-[38mm]" />
          ))
        )}
      </div>
    </div>
  );
}

export function StockPage() {
  return (
    <div className="p-4">
      <h2 className="mb-3 text-xl font-bold">Stock</h2>
      <ReceiveStockPanel />
      <LabelPrinterPanel />
    </div>
  );
}
