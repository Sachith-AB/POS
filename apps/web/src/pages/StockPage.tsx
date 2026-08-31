import { useEffect, useRef, useState } from 'react';
import { useAppDispatch, useAppSelector } from '../app/hooks';
import { api } from '../lib/api';
import { Input } from '../components/Input';
import { Button } from '../components/Button';
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



function ReceiveStockPanel() {
  const dispatch = useAppDispatch();
  const { matchedProduct, notFoundBarcode, pendingLines, supplierName, invoiceRef, submitting, lastBatchCount } =
    useAppSelector((s) => s.stock);

  const [code, setCode] = useState('');
  const [qty, setQty] = useState('1');
  const [cost, setCost] = useState('');
  const [imeis, setImeis] = useState<string[]>([]);
  const [imeiInput, setImeiInput] = useState('');
  
  // Quick/Manual create states
  const [quickName, setQuickName] = useState('');
  const [quickCost, setQuickCost] = useState('');
  const [quickSell, setQuickSell] = useState('');
  const [quickQty, setQuickQty] = useState('1');
  const [quickCategory, setQuickCategory] = useState('');
  
  // Custom manual receive states
  const [receiveMode, setReceiveMode] = useState<'scan' | 'search' | 'create'>('scan');
  const [manualBarcode, setManualBarcode] = useState('');
  const [isSerializedProduct, setIsSerializedProduct] = useState(false);
  const [productSearch, setProductSearch] = useState('');
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);

  const scanRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (receiveMode === 'scan') {
      scanRef.current?.focus();
    }
  }, [receiveMode]);

  useEffect(() => {
    if (matchedProduct) {
      setCost(String(matchedProduct.costPrice));
      setQty('1');
      setImeis([]);
    }
  }, [matchedProduct]);

  // Search existing products manually
  useEffect(() => {
    const term = productSearch.trim();
    if (receiveMode === 'search' && term.length >= 2) {
      setSearchLoading(true);
      api
        .get<Product[]>(`/products?search=${encodeURIComponent(term)}`)
        .then((res) => {
          setSearchResults(res || []);
          setSearchLoading(false);
        })
        .catch((err) => {
          console.error(err);
          setSearchLoading(false);
        });
    } else {
      setSearchResults([]);
    }
  }, [receiveMode, productSearch]);

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
    setProductSearch('');
    setReceiveMode('scan');
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
    setProductSearch('');
    setReceiveMode('scan');
  }

  // Quick create from scan barcode not found
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
    setReceiveMode('scan');
  }

  // Fully manual create (from form)
  async function submitManualCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!quickName.trim()) return;

    try {
      const barcodeValue = manualBarcode.trim() || `MAN-${Date.now()}`;
      const product = await api.post<Product>('/products', {
        sku: `SKU-${barcodeValue}`,
        barcode: barcodeValue,
        name: quickName.trim(),
        costPrice: Number(quickCost) || 0,
        sellPrice: Number(quickSell) || 0,
        quantity: Number(quickQty) || 0,
        category: quickCategory.trim() || 'Uncategorized',
        isSerialized: isSerializedProduct,
        lowStockThreshold: 3,
      });

      // Add directly to receiving batch
      dispatch(
        lineAdded({
          productId: product.id,
          name: product.name,
          quantityDelta: product.quantity,
          costPriceAtTime: Number(product.costPrice),
          imeis: [],
        })
      );

      // Reset
      setQuickName('');
      setQuickCost('');
      setQuickSell('');
      setQuickQty('1');
      setQuickCategory('');
      setManualBarcode('');
      setIsSerializedProduct(false);
      setReceiveMode('scan');
    } catch (err: any) {
      alert(err.message || 'Failed to create product');
    }
  }

  const totalUnits = pendingLines.reduce((s, l) => s + l.quantityDelta, 0);

  return (
    <div className="grid grid-cols-2 gap-4">
      <div className="rounded-xl border border-border bg-surface p-4">
        {/* Tab Headers */}
        <div className="flex border-b border-border mb-3.5 gap-2">
          <button
            onClick={() => {
              setReceiveMode('scan');
              dispatch(barcodeEntered(''));
            }}
            className={`pb-2 text-xs font-bold border-b-2 px-1 ${
              receiveMode === 'scan' ? 'border-primary text-primary' : 'border-transparent text-muted hover:text-ink'
            }`}
          >
            Scan Barcode
          </button>
          <button
            onClick={() => {
              setReceiveMode('search');
              dispatch(barcodeEntered(''));
            }}
            className={`pb-2 text-xs font-bold border-b-2 px-1 ${
              receiveMode === 'search' ? 'border-primary text-primary' : 'border-transparent text-muted hover:text-ink'
            }`}
          >
            Search Existing Product
          </button>
          <button
            onClick={() => {
              setReceiveMode('create');
              dispatch(barcodeEntered(''));
            }}
            className={`pb-2 text-xs font-bold border-b-2 px-1 ${
              receiveMode === 'create' ? 'border-primary text-primary' : 'border-transparent text-muted hover:text-ink'
            }`}
          >
            Create Product Manually
          </button>
        </div>

        {receiveMode === 'scan' && (
          <>
            <h3 className="font-semibold text-xs text-muted uppercase block">Scan to Receive</h3>
            <Input
              ref={scanRef}
              placeholder="Scan barcode / IMEI"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') submitScan();
              }}
              autoComplete="off"
              className="mt-2 w-full text-xs"
            />
          </>
        )}

        {receiveMode === 'search' && (
          <>
            <h3 className="font-semibold text-xs text-muted uppercase block">Search Product</h3>
            <Input
              placeholder="Type to search name, SKU, or category..."
              value={productSearch}
              onChange={(e) => setProductSearch(e.target.value)}
              className="mt-2 w-full text-xs"
            />
            <ul className="mt-2 divide-y divide-border border border-border rounded-lg max-h-60 overflow-y-auto bg-canvas">
              {searchLoading && <li className="p-2 text-xs text-muted">Searching...</li>}
              {!searchLoading && searchResults.length === 0 && (
                <li className="p-2 text-xs text-muted">Type at least 2 characters to search.</li>
              )}
              {searchResults.map((p) => (
                <li key={p.id} className="p-2 text-xs flex justify-between items-center hover:bg-surface-hover">
                  <div>
                    <span className="font-semibold block">{p.name}</span>
                    <span className="text-[10px] text-muted">SKU: {p.sku} · Qty: {p.quantity}</span>
                  </div>
                  <Button
                    onClick={() => {
                      dispatch(productMatched(p));
                      setReceiveMode('scan');
                    }}
                    className="px-2.5 py-1 text-[10px]"
                  >
                    Select
                  </Button>
                </li>
              ))}
            </ul>
          </>
        )}

        {receiveMode === 'create' && (
          <>
            <h3 className="font-semibold text-xs text-muted uppercase block">Create Product Manually</h3>
            <form onSubmit={submitManualCreate} className="mt-2 space-y-3">
              <Input
                placeholder="Name *"
                required
                value={quickName}
                onChange={(e) => setQuickName(e.target.value)}
                className="w-full text-xs"
              />
              <Input
                placeholder="Barcode (Optional)"
                value={manualBarcode}
                onChange={(e) => setManualBarcode(e.target.value)}
                className="w-full text-xs"
              />
              <Input
                placeholder="Category"
                value={quickCategory}
                onChange={(e) => setQuickCategory(e.target.value)}
                className="w-full text-xs"
              />
              <div className="grid grid-cols-3 gap-2">
                <Input
                  placeholder="Cost Price"
                  type="number"
                  min={0}
                  step="any"
                  value={quickCost}
                  onChange={(e) => setQuickCost(e.target.value)}
                  className="w-full text-xs font-mono"
                />
                <Input
                  placeholder="Sell Price"
                  type="number"
                  min={0}
                  step="any"
                  value={quickSell}
                  onChange={(e) => setQuickSell(e.target.value)}
                  className="w-full text-xs font-mono"
                />
                <Input
                  placeholder="Qty Received"
                  type="number"
                  min={0}
                  value={quickQty}
                  onChange={(e) => setQuickQty(e.target.value)}
                  className="w-full text-xs font-mono"
                />
              </div>
              <label className="flex items-center gap-2 text-xs text-ink">
                <input
                  type="checkbox"
                  checked={isSerializedProduct}
                  onChange={(e) => setIsSerializedProduct(e.target.checked)}
                />
                Serialized Product (Phones, tablets, watches)
              </label>
              <Button type="submit" disabled={!quickName} className="w-1/4 mt-2 text-xs">
                Create &amp; Add to Batch
              </Button>
            </form>
          </>
        )}

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
            <Button onClick={confirmNonSerializedLine} className="mt-2 w-full">
              Add to batch (Enter)
            </Button>
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
            <Button onClick={finishSerializedProduct} disabled={imeis.length === 0} className="w-full">
              Done ({imeis.length} units)
            </Button>
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
            <Button onClick={submitQuickCreate} disabled={!quickName} className="w-full">
              Create &amp; add to batch
            </Button>
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
              <Button onClick={() => dispatch(lineRemoved(l.productId))} variant="secondary" className="py-1 px-2.5 text-[10px]">
                remove
              </Button>
            </li>
          ))}
        </ul>
        <Button
          onClick={() => dispatch(batchSubmitRequested())}
          disabled={pendingLines.length === 0}
          loading={submitting}
          className="w-1/4"
        >
          Finalize Batch
        </Button>
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
            <Button onClick={() => addToQueue(p)} variant="secondary" className="py-1 px-2.5 text-[10px]">
              add
            </Button>
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
      <Button onClick={printLabels} disabled={queue.length === 0} className="w-1/8">
        Generate &amp; Print
      </Button>

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
