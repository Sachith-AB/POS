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

interface CategoryItem {
  id: string;
  name: string;
}

interface WarrantyOption {
  id: string;
  label: string;
  durationDays: number;
}

interface SupplierItem {
  id: string;
  name: string;
  phone: string | null;
  contactPerson: string | null;
  totalPayable: number | string;
  paidAmount: number | string;
  outstandingBalance: number | string;
  transactions?: any[];
}

interface TradeInItem {
  id: string;
  deviceInfo: string;
  imei: string | null;
  condition: string;
  tradeInValue: number | string;
  status: string;
  customerName: string | null;
  customerPhone: string | null;
  createdAt: string;
}

// Sub-component 1: Receive Stock Panel
function ReceiveStockPanel() {
  const dispatch = useAppDispatch();
  const { matchedProduct, notFoundBarcode, pendingLines, supplierName, invoiceRef, submitting, lastBatchCount } =
    useAppSelector((s) => s.stock);

  const [code, setCode] = useState('');
  const [qty, setQty] = useState('1');
  const [cost, setCost] = useState('');
  const [imeis, setImeis] = useState<string[]>([]);
  const [imeiInput, setImeiInput] = useState('');

  // Quick / Manual Create states with Wholesale, Business, Warranty, and Category
  const [quickName, setQuickName] = useState('');
  const [quickCost, setQuickCost] = useState('');
  const [quickSell, setQuickSell] = useState('');
  const [quickWholesale, setQuickWholesale] = useState('');
  const [quickBusiness, setQuickBusiness] = useState('');
  const [quickQty, setQuickQty] = useState('1');
  const [quickCategory, setQuickCategory] = useState('');
  const [quickWarrantyId, setQuickWarrantyId] = useState('');
  const [quickWarrantyDays, setQuickWarrantyDays] = useState('');

  // Auxiliary data
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [warranties, setWarranties] = useState<WarrantyOption[]>([]);
  const [suppliers, setSuppliers] = useState<SupplierItem[]>([]);
  const [selectedSupplierId, setSelectedSupplierId] = useState('');
  const [isCreditPurchase, setIsCreditPurchase] = useState(false);

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
    // Fetch categories, warranties, and suppliers
    api.get<CategoryItem[]>('/categories').then((data) => setCategories(data || [])).catch(() => {});
    api.get<WarrantyOption[]>('/warranties').then((data) => setWarranties(data || [])).catch(() => {});
    api.get<SupplierItem[]>('/suppliers').then((data) => setSuppliers(data || [])).catch(() => {});
  }, []);

  useEffect(() => {
    if (matchedProduct) {
      setCost(String(matchedProduct.costPrice));
      setQty('1');
      setImeis([]);
    }
  }, [matchedProduct]);

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
        .catch(() => setSearchLoading(false));
    } else {
      setSearchResults([]);
    }
  }, [receiveMode, productSearch]);

  function submitScan() {
    if (!code.trim()) return;
    dispatch(barcodeEntered(code.trim()));
  }

  function addMatchedToBatch() {
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

  function submitQuickCreate() {
    dispatch(
      quickCreateRequested({
        barcode: notFoundBarcode ?? code.trim(),
        name: quickName,
        costPrice: Number(quickCost) || 0,
        sellPrice: Number(quickSell) || 0,
        wholesalePrice: quickWholesale ? Number(quickWholesale) : undefined,
        businessPrice: quickBusiness ? Number(quickBusiness) : undefined,
        warrantyPeriodId: quickWarrantyId || undefined,
        warrantyDurationDays: quickWarrantyDays ? parseInt(quickWarrantyDays) : undefined,
        quantity: Number(quickQty) || 1,
        category: quickCategory || 'Mobile Phones',
      })
    );
    setQuickName('');
    setQuickCost('');
    setQuickSell('');
    setQuickWholesale('');
    setQuickBusiness('');
    setQuickQty('1');
    setQuickCategory('');
    setQuickWarrantyId('');
    setQuickWarrantyDays('');
    setCode('');
    setReceiveMode('scan');
  }

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
        wholesalePrice: quickWholesale ? Number(quickWholesale) : undefined,
        businessPrice: quickBusiness ? Number(quickBusiness) : undefined,
        warrantyPeriodId: quickWarrantyId || undefined,
        warrantyDurationDays: quickWarrantyDays ? parseInt(quickWarrantyDays) : undefined,
        quantity: Number(quickQty) || 0,
        category: quickCategory.trim() || 'Mobile Phones',
        isSerialized: isSerializedProduct,
        lowStockThreshold: 3,
      });

      dispatch(
        lineAdded({
          productId: product.id,
          name: product.name,
          quantityDelta: product.quantity,
          costPriceAtTime: Number(product.costPrice),
          imeis: [],
        })
      );

      setQuickName('');
      setQuickCost('');
      setQuickSell('');
      setQuickWholesale('');
      setQuickBusiness('');
      setQuickQty('1');
      setQuickCategory('');
      setQuickWarrantyId('');
      setQuickWarrantyDays('');
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
      <div className="rounded-2xl border border-border bg-surface p-5 shadow-xs">
        {/* Tab Headers */}
        <div className="flex border-b border-border mb-4 gap-3">
          <button
            onClick={() => {
              setReceiveMode('scan');
              dispatch(barcodeEntered(''));
            }}
            className={`pb-2 text-xs font-bold border-b-2 px-1 cursor-pointer transition-colors ${
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
            className={`pb-2 text-xs font-bold border-b-2 px-1 cursor-pointer transition-colors ${
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
            className={`pb-2 text-xs font-bold border-b-2 px-1 cursor-pointer transition-colors ${
              receiveMode === 'create' ? 'border-primary text-primary' : 'border-transparent text-muted hover:text-ink'
            }`}
          >
            + New Product
          </button>
        </div>

        {receiveMode === 'scan' && (
          <div>
            <h3 className="font-semibold text-xs text-muted uppercase block mb-1">Scan to Receive</h3>
            <Input
              ref={scanRef}
              placeholder="Scan barcode / IMEI and hit Enter..."
              value={code}
              onChange={(e) => setCode(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') submitScan();
              }}
              autoComplete="off"
              className="w-full text-sm py-2 font-mono"
            />
          </div>
        )}

        {receiveMode === 'search' && (
          <div>
            <h3 className="font-semibold text-xs text-muted uppercase block mb-1">Search Products</h3>
            <Input
              placeholder="Type product name, SKU, or category…"
              value={productSearch}
              onChange={(e) => setProductSearch(e.target.value)}
              className="w-full text-xs py-2"
            />
            {searchLoading ? <p className="text-[11px] text-muted mt-1">Searching products…</p> : null}
            {searchResults.length > 0 ? (
              <div className="mt-2 max-h-48 overflow-y-auto divide-y divide-border border border-border rounded-xl bg-canvas">
                {searchResults.map((p) => (
                  <div
                    key={p.id}
                    onClick={() => {
                      dispatch(barcodeEntered(p.barcode || p.sku));
                      setReceiveMode('scan');
                    }}
                    className="p-2 text-xs hover:bg-surface cursor-pointer flex justify-between items-center"
                  >
                    <div>
                      <p className="font-semibold text-ink">{p.name}</p>
                      <p className="text-[10px] text-muted">SKU: {p.sku} | In Stock: {p.quantity}</p>
                    </div>
                    <span className="font-mono font-bold text-ink">Rs {Number(p.sellPrice).toFixed(2)}</span>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        )}

        {receiveMode === 'create' && (
          <form onSubmit={submitManualCreate} className="space-y-3">
            <h3 className="font-semibold text-xs text-muted uppercase block">
              Product Details &amp; Pricing
            </h3>
            <div className="grid grid-cols-2 gap-2">
              <Input
                required
                placeholder="Product Name *"
                value={quickName}
                onChange={(e) => setQuickName(e.target.value)}
                className="text-xs"
              />
              <Input
                placeholder="Barcode (Optional)"
                value={manualBarcode}
                onChange={(e) => setManualBarcode(e.target.value)}
                className="text-xs font-mono"
              />
            </div>

            {/* Price Types: Retail, Wholesale, Business */}
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-[10px] text-muted block mb-0.5">Retail Price (Rs) *</label>
                <Input
                  required
                  type="number"
                  min={0}
                  placeholder="0.00"
                  value={quickSell}
                  onChange={(e) => setQuickSell(e.target.value)}
                  className="w-full text-xs font-mono"
                />
              </div>
              <div>
                <label className="text-[10px] text-muted block mb-0.5">Wholesale Price (Rs)</label>
                <Input
                  type="number"
                  min={0}
                  placeholder="0.00"
                  value={quickWholesale}
                  onChange={(e) => setQuickWholesale(e.target.value)}
                  className="w-full text-xs font-mono"
                />
              </div>
              <div>
                <label className="text-[10px] text-muted block mb-0.5">Business Price (Rs)</label>
                <Input
                  type="number"
                  min={0}
                  placeholder="0.00"
                  value={quickBusiness}
                  onChange={(e) => setQuickBusiness(e.target.value)}
                  className="w-full text-xs font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] text-muted block mb-0.5">Cost Price (Rs) *</label>
                <Input
                  required
                  type="number"
                  min={0}
                  placeholder="0.00"
                  value={quickCost}
                  onChange={(e) => setQuickCost(e.target.value)}
                  className="w-full text-xs font-mono"
                />
              </div>
              <div>
                <label className="text-[10px] text-muted block mb-0.5">Category (50+ available)</label>
                <select
                  value={quickCategory}
                  onChange={(e) => setQuickCategory(e.target.value)}
                  className="w-full rounded-lg border border-border bg-canvas px-2.5 py-1.5 text-xs text-ink"
                >
                  <option value="">-- Choose Category --</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.name}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Configurable Warranty Per Product (User Request) */}
            <div className="rounded-xl bg-canvas border border-border p-2.5 space-y-1">
              <label className="text-[10px] font-bold uppercase text-muted block">
                Product Default Warranty (Configurable Per Product)
              </label>
              <div className="grid grid-cols-2 gap-2">
                <select
                  value={quickWarrantyId}
                  onChange={(e) => setQuickWarrantyId(e.target.value)}
                  className="w-full rounded border border-border bg-surface px-2 py-1 text-xs text-ink"
                >
                  <option value="">3 Days Auto-Support Default</option>
                  {warranties.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.label} ({w.durationDays} days)
                    </option>
                  ))}
                </select>
                <Input
                  type="number"
                  placeholder="Or custom days (e.g. 180)"
                  value={quickWarrantyDays}
                  onChange={(e) => setQuickWarrantyDays(e.target.value)}
                  className="text-xs"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 text-xs text-muted cursor-pointer">
                <input
                  type="checkbox"
                  checked={isSerializedProduct}
                  onChange={(e) => setIsSerializedProduct(e.target.checked)}
                  className="rounded border-border text-primary"
                />
                <span>Track Serial / IMEI Numbers</span>
              </label>
              <Button type="submit" className="text-xs font-bold py-2 px-4">
                Save &amp; Add to Batch
              </Button>
            </div>
          </form>
        )}

        {/* Matched product receiving */}
        {matchedProduct ? (
          <div className="mt-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 space-y-3">
            <div className="flex justify-between items-start">
              <div>
                <p className="font-bold text-sm text-ink">{matchedProduct.name}</p>
                <p className="text-[11px] text-muted">Barcode: {matchedProduct.barcode} | In Stock: {matchedProduct.quantity}</p>
              </div>
              <span className="text-xs bg-emerald-500/20 text-emerald-700 px-2 py-0.5 rounded-full font-bold">
                Matched
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] text-muted block mb-0.5">Cost Price at Intake</label>
                <Input
                  type="number"
                  value={cost}
                  onChange={(e) => setCost(e.target.value)}
                  className="text-xs font-mono"
                />
              </div>
              {!matchedProduct.isSerialized ? (
                <div>
                  <label className="text-[10px] text-muted block mb-0.5">Quantity to Add</label>
                  <Input
                    type="number"
                    min={1}
                    value={qty}
                    onChange={(e) => setQty(e.target.value)}
                    className="text-xs"
                  />
                </div>
              ) : null}
            </div>

            {matchedProduct.isSerialized ? (
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-muted uppercase">Scan IMEIs ({imeis.length})</label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Type or scan IMEI..."
                    value={imeiInput}
                    onChange={(e) => setImeiInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') addImei();
                    }}
                    className="text-xs font-mono flex-1"
                  />
                  <Button onClick={addImei} className="text-xs">
                    + Add IMEI
                  </Button>
                </div>
                <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto">
                  {imeis.map((im, idx) => (
                    <span key={idx} className="bg-canvas border border-border px-2 py-0.5 rounded text-[10px] font-mono">
                      {im}
                    </span>
                  ))}
                </div>
                <Button onClick={finishSerializedProduct} disabled={imeis.length === 0} className="w-full text-xs font-bold">
                  Add {imeis.length} Serialized Units to Batch
                </Button>
              </div>
            ) : (
              <Button onClick={addMatchedToBatch} className="w-full text-xs font-bold py-2">
                Add to Receiving Batch
              </Button>
            )}
          </div>
        ) : null}

        {/* Not found quick create banner */}
        {notFoundBarcode ? (
          <div className="mt-4 rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 space-y-3">
            <p className="text-xs font-bold text-amber-700">Barcode not found in inventory ({notFoundBarcode})</p>
            <div className="grid grid-cols-2 gap-2">
              <Input
                placeholder="Product Name"
                value={quickName}
                onChange={(e) => setQuickName(e.target.value)}
                className="text-xs"
              />
              <Input
                placeholder="Sell Price (Rs)"
                type="number"
                value={quickSell}
                onChange={(e) => setQuickSell(e.target.value)}
                className="text-xs font-mono"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Input
                placeholder="Cost Price (Rs)"
                type="number"
                value={quickCost}
                onChange={(e) => setQuickCost(e.target.value)}
                className="text-xs font-mono"
              />
              <Input
                placeholder="Quantity"
                type="number"
                value={quickQty}
                onChange={(e) => setQuickQty(e.target.value)}
                className="text-xs"
              />
            </div>
            <Button onClick={submitQuickCreate} className="w-full text-xs font-bold">
              Quick Create &amp; Add to Batch
            </Button>
          </div>
        ) : null}
      </div>

      {/* Right side: Batch intake summary */}
      <div className="flex flex-col rounded-2xl border border-border bg-surface p-5 shadow-xs">
        <h3 className="font-bold text-sm text-ink mb-3">Receiving Batch Summary</h3>

        {/* Supplier & Invoice info (Q16, Q17) */}
        <div className="space-y-2 mb-4 bg-canvas p-3 rounded-xl border border-border">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] font-semibold text-muted block mb-0.5">Supplier</label>
              <select
                value={selectedSupplierId}
                onChange={(e) => {
                  setSelectedSupplierId(e.target.value);
                  const sup = suppliers.find((s) => s.id === e.target.value);
                  if (sup) dispatch(supplierNameChanged(sup.name));
                }}
                className="w-full rounded border border-border bg-surface px-2 py-1 text-xs text-ink"
              >
                <option value="">-- Choose Supplier --</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} (Bal: Rs {Number(s.outstandingBalance).toFixed(0)})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-semibold text-muted block mb-0.5">Invoice #</label>
              <Input
                placeholder="INV-..."
                value={invoiceRef}
                onChange={(e) => dispatch(invoiceRefChanged(e.target.value))}
                className="text-xs py-1"
              />
            </div>
          </div>

          <label className="flex items-center gap-2 text-xs text-muted cursor-pointer pt-1">
            <input
              type="checkbox"
              checked={isCreditPurchase}
              onChange={(e) => setIsCreditPurchase(e.target.checked)}
              className="rounded border-border text-primary"
            />
            <span>Record as Credit Purchase (Track Supplier Payable)</span>
          </label>
        </div>

        {/* Batch lines table */}
        <div className="flex-1 overflow-y-auto border border-border rounded-xl bg-canvas mb-4">
          {pendingLines.length === 0 ? (
            <div className="flex items-center justify-center h-48 text-muted text-xs">
              No items in this batch yet. Scan or add products on the left.
            </div>
          ) : (
            <div className="divide-y divide-border">
              {pendingLines.map((line) => (
                <div key={line.productId} className="p-3 flex justify-between items-center text-xs">
                  <div>
                    <p className="font-semibold text-ink">{line.name}</p>
                    <p className="text-[10px] text-muted">
                      Qty: {line.quantityDelta}
                      {line.costPriceAtTime ? ` @ Rs ${line.costPriceAtTime.toFixed(2)}` : ''}
                      {line.imeis && line.imeis.length > 0 ? ` (${line.imeis.length} IMEIs)` : ''}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => dispatch(lineRemoved(line.productId))}
                    className="text-rose-500 hover:text-rose-700 font-bold px-2 py-1 text-sm cursor-pointer"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="border-t border-border pt-3 flex justify-between items-center text-sm font-bold text-ink mb-3">
          <span>Total Units to Receive:</span>
          <span className="font-mono text-base">{totalUnits} units</span>
        </div>

        <Button
          onClick={() => dispatch(batchSubmitRequested())}
          disabled={pendingLines.length === 0 || submitting}
          loading={submitting}
          className="w-full py-2.5 text-xs font-bold"
        >
          Finalize &amp; Update Inventory ({totalUnits} Items)
        </Button>

        {lastBatchCount ? (
          <p className="text-center text-xs text-emerald-600 font-medium mt-2">
            Successfully received {lastBatchCount} items into stock!
          </p>
        ) : null}
      </div>
    </div>
  );
}

// Sub-component 2: Supplier Management Panel (Q16, Q17)
function SupplierManagementPanel() {
  const [suppliers, setSuppliers] = useState<SupplierItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showPayModal, setShowPayModal] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<SupplierItem | null>(null);

  // Add form state
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [address, setAddress] = useState('');

  // Payment form state
  const [payAmount, setPayAmount] = useState('');
  const [payRef, setPayRef] = useState('');

  const loadSuppliers = () => {
    setLoading(true);
    api.get<SupplierItem[]>('/suppliers')
      .then((data) => {
        setSuppliers(data || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    loadSuppliers();
  }, []);

  async function handleAddSupplier(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    try {
      await api.post('/suppliers', { name, phone: phone || null, contactPerson: contactPerson || null, address: address || null });
      setShowAddModal(false);
      setName('');
      setPhone('');
      setContactPerson('');
      loadSuppliers();
    } catch (err: any) {
      alert(err.message || 'Failed to add supplier');
    }
  }

  async function handleRecordPayment(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedSupplier || !payAmount) return;
    try {
      await api.post(`/suppliers/${selectedSupplier.id}/payments`, {
        amount: parseFloat(payAmount),
        paymentMethod: 'BANK_TRANSFER',
        reference: payRef || undefined,
      });
      setShowPayModal(false);
      setPayAmount('');
      setPayRef('');
      loadSuppliers();
    } catch (err: any) {
      alert(err.message || 'Failed to record payment');
    }
  }

  return (
    <div className="rounded-2xl border border-border bg-surface p-5 shadow-xs">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h3 className="font-bold text-base text-ink">Supplier Tracking &amp; Credit Balances</h3>
          <p className="text-xs text-muted">Track credit purchases, outstanding balances, and supplier payment history</p>
        </div>
        <Button onClick={() => setShowAddModal(true)} className="text-xs font-bold">
          + Add Supplier
        </Button>
      </div>

      {loading ? (
        <p className="text-xs text-muted p-4 text-center">Loading suppliers…</p>
      ) : suppliers.length === 0 ? (
        <p className="text-xs text-muted p-8 text-center bg-canvas rounded-xl">No suppliers recorded yet.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full border-collapse text-left text-xs text-ink">
            <thead>
              <tr className="bg-canvas border-b border-border text-xs font-bold text-muted uppercase">
                <th className="px-4 py-3">Supplier Name</th>
                <th className="px-4 py-3">Contact</th>
                <th className="px-4 py-3 font-mono">Total Purchased</th>
                <th className="px-4 py-3 font-mono">Paid Amount</th>
                <th className="px-4 py-3 font-mono">Outstanding Balance</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {suppliers.map((s) => (
                <tr key={s.id} className="hover:bg-canvas transition-colors">
                  <td className="px-4 py-3 font-semibold text-ink">{s.name}</td>
                  <td className="px-4 py-3 text-muted">
                    {s.contactPerson ? `${s.contactPerson} ` : ''}
                    {s.phone ? `(${s.phone})` : ''}
                  </td>
                  <td className="px-4 py-3 font-mono">Rs {Number(s.totalPayable).toFixed(2)}</td>
                  <td className="px-4 py-3 font-mono text-emerald-600">Rs {Number(s.paidAmount).toFixed(2)}</td>
                  <td className="px-4 py-3 font-mono font-bold text-rose-600">
                    Rs {Number(s.outstandingBalance).toFixed(2)}
                  </td>
                  <td className="px-4 py-3">
                    <Button
                      onClick={() => {
                        setSelectedSupplier(s);
                        setShowPayModal(true);
                      }}
                      variant="secondary"
                      className="text-[11px] py-1 px-2.5 font-bold"
                    >
                      Record Payment
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Supplier Modal */}
      {showAddModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl border border-border bg-surface p-5 shadow-xl">
            <h3 className="font-bold text-base text-ink mb-3">Add Supplier</h3>
            <form onSubmit={handleAddSupplier} className="space-y-3 text-xs">
              <div>
                <label className="text-muted block mb-0.5">Supplier Name *</label>
                <Input required value={name} onChange={(e) => setName(e.target.value)} className="w-full" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-muted block mb-0.5">Phone</label>
                  <Input value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full" />
                </div>
                <div>
                  <label className="text-muted block mb-0.5">Contact Person</label>
                  <Input value={contactPerson} onChange={(e) => setContactPerson(e.target.value)} className="w-full" />
                </div>
              </div>
              <div>
                <label className="text-muted block mb-0.5">Address</label>
                <Input value={address} onChange={(e) => setAddress(e.target.value)} className="w-full" />
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-border">
                <Button type="button" onClick={() => setShowAddModal(false)} variant="secondary">Cancel</Button>
                <Button type="submit" className="font-bold">Save Supplier</Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {/* Record Payment Modal */}
      {showPayModal && selectedSupplier ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-2xl border border-border bg-surface p-5 shadow-xl">
            <h3 className="font-bold text-base text-ink mb-1">Record Supplier Payment</h3>
            <p className="text-xs text-muted mb-3">
              Supplier: <strong>{selectedSupplier.name}</strong> | Outstanding: Rs {Number(selectedSupplier.outstandingBalance).toFixed(2)}
            </p>
            <form onSubmit={handleRecordPayment} className="space-y-3 text-xs">
              <div>
                <label className="text-muted block mb-0.5">Payment Amount (Rs) *</label>
                <Input
                  required
                  type="number"
                  min={1}
                  step="any"
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                  className="w-full font-mono text-sm font-bold"
                />
              </div>
              <div>
                <label className="text-muted block mb-0.5">Reference / Bank Slip #</label>
                <Input value={payRef} onChange={(e) => setPayRef(e.target.value)} className="w-full" />
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-border">
                <Button type="button" onClick={() => setShowPayModal(false)} variant="secondary">Cancel</Button>
                <Button type="submit" className="font-bold">Confirm Payment</Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}

// Sub-component 3: Supplier Returns Panel (Q19)
function SupplierReturnsPanel() {
  const [returns, setReturns] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<SupplierItem[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [showModal, setShowModal] = useState(false);

  // Return form state
  const [supplierId, setSupplierId] = useState('');
  const [productId, setProductId] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [reason, setReason] = useState<'DEFECTIVE' | 'DAMAGED' | 'WRONG_ITEM' | 'OTHER'>('DEFECTIVE');
  const [refundCredit, setRefundCredit] = useState('');
  const [notes, setNotes] = useState('');

  const loadReturns = () => {
    api.get<any[]>('/supplier-returns').then((data) => setReturns(data || [])).catch(() => {});
    api.get<SupplierItem[]>('/suppliers').then((data) => setSuppliers(data || [])).catch(() => {});
    api.get<Product[]>('/products').then((data) => setProducts(data || [])).catch(() => {});
  };

  useEffect(() => {
    loadReturns();
  }, []);

  async function handleCreateReturn(e: React.FormEvent) {
    e.preventDefault();
    if (!supplierId || !productId) return;

    try {
      await api.post('/supplier-returns', {
        supplierId,
        productId,
        quantity: parseInt(quantity) || 1,
        reason,
        refundOrCreditAmount: refundCredit ? parseFloat(refundCredit) : undefined,
        notes: notes || undefined,
      });
      setShowModal(false);
      setSupplierId('');
      setProductId('');
      setQuantity('1');
      setRefundCredit('');
      setNotes('');
      loadReturns();
    } catch (err: any) {
      alert(err.message || 'Failed to process return');
    }
  }

  return (
    <div className="rounded-2xl border border-border bg-surface p-5 shadow-xs">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h3 className="font-bold text-base text-ink">Supplier Returns</h3>
          <p className="text-xs text-muted">Return defective, damaged, or wrong items to suppliers with auto-inventory deduction</p>
        </div>
        <Button onClick={() => setShowModal(true)} className="text-xs font-bold">
          + Process Return to Supplier
        </Button>
      </div>

      {returns.length === 0 ? (
        <p className="text-xs text-muted p-8 text-center bg-canvas rounded-xl">No supplier returns recorded.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full border-collapse text-left text-xs text-ink">
            <thead>
              <tr className="bg-canvas border-b border-border font-bold text-muted uppercase text-[10px]">
                <th className="px-4 py-3">Product</th>
                <th className="px-4 py-3">Supplier</th>
                <th className="px-4 py-3">Qty</th>
                <th className="px-4 py-3">Reason</th>
                <th className="px-4 py-3 font-mono">Credit Amount</th>
                <th className="px-4 py-3">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {returns.map((r) => (
                <tr key={r.id} className="hover:bg-canvas">
                  <td className="px-4 py-3 font-semibold text-ink">{r.product?.name}</td>
                  <td className="px-4 py-3 text-muted">{r.supplier?.name}</td>
                  <td className="px-4 py-3 font-bold">{r.quantity}</td>
                  <td className="px-4 py-3">
                    <span className="bg-rose-500/10 text-rose-600 px-2 py-0.5 rounded font-bold text-[10px]">
                      {r.reason}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono font-bold text-emerald-600">
                    Rs {Number(r.refundOrCreditAmount || 0).toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-muted">{new Date(r.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Return Modal */}
      {showModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl border border-border bg-surface p-5 shadow-xl">
            <h3 className="font-bold text-base text-ink mb-1">Return Items to Supplier</h3>
            <p className="text-xs text-muted mb-3">Inventory will be automatically deducted.</p>

            <form onSubmit={handleCreateReturn} className="space-y-3 text-xs">
              <div>
                <label className="text-muted block mb-0.5">Supplier *</label>
                <select
                  required
                  value={supplierId}
                  onChange={(e) => setSupplierId(e.target.value)}
                  className="w-full rounded border border-border bg-canvas px-2.5 py-1.5"
                >
                  <option value="">-- Choose Supplier --</option>
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-muted block mb-0.5">Product to Return *</label>
                <select
                  required
                  value={productId}
                  onChange={(e) => setProductId(e.target.value)}
                  className="w-full rounded border border-border bg-canvas px-2.5 py-1.5"
                >
                  <option value="">-- Choose Product --</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>{p.name} (In Stock: {p.quantity})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-muted block mb-0.5">Quantity to Deduct *</label>
                  <Input
                    required
                    type="number"
                    min={1}
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    className="w-full"
                  />
                </div>
                <div>
                  <label className="text-muted block mb-0.5">Return Reason</label>
                  <select
                    value={reason}
                    onChange={(e) => setReason(e.target.value as any)}
                    className="w-full rounded border border-border bg-canvas px-2 py-1.5"
                  >
                    <option value="DEFECTIVE">Defective</option>
                    <option value="DAMAGED">Damaged</option>
                    <option value="WRONG_ITEM">Wrong Item</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-muted block mb-0.5">Refund / Credit Claim (Rs)</label>
                <Input
                  type="number"
                  min={0}
                  placeholder="0.00"
                  value={refundCredit}
                  onChange={(e) => setRefundCredit(e.target.value)}
                  className="w-full font-mono"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-border">
                <Button type="button" onClick={() => setShowModal(false)} variant="secondary">Cancel</Button>
                <Button type="submit" className="font-bold">Deduct Stock &amp; Return</Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}

// Sub-component 4: Trade-In / Used Device Resale Panel (Q18)
function TradeInManagementPanel() {
  const [tradeIns, setTradeIns] = useState<TradeInItem[]>([]);
  const [showModal, setShowModal] = useState(false);

  // Form state
  const [deviceInfo, setDeviceInfo] = useState('');
  const [imei, setImei] = useState('');
  const [condition, setCondition] = useState('GOOD');
  const [tradeInValue, setTradeInValue] = useState('');
  const [custName, setCustName] = useState('');
  const [custPhone, setCustPhone] = useState('');

  const loadTradeIns = () => {
    api.get<TradeInItem[]>('/trade-ins').then((data) => setTradeIns(data || [])).catch(() => {});
  };

  useEffect(() => {
    loadTradeIns();
  }, []);

  async function handleCreateTradeIn(e: React.FormEvent) {
    e.preventDefault();
    if (!deviceInfo || !tradeInValue) return;

    try {
      await api.post('/trade-ins', {
        deviceInfo,
        imei: imei || undefined,
        condition,
        tradeInValue: parseFloat(tradeInValue),
        customerName: custName || undefined,
        customerPhone: custPhone || undefined,
      });
      setShowModal(false);
      setDeviceInfo('');
      setImei('');
      setTradeInValue('');
      setCustName('');
      setCustPhone('');
      loadTradeIns();
    } catch (err: any) {
      alert(err.message || 'Failed to accept trade-in');
    }
  }

  async function handleConvertToResale(tradeInId: string) {
    const sellPrice = prompt('Enter Resale Price (Rs) for this used device:');
    if (!sellPrice) return;

    try {
      await api.post(`/trade-ins/${tradeInId}/convert-resale`, {
        resaleSellPrice: parseFloat(sellPrice),
        category: 'Used Phones',
      });
      alert('Successfully added to inventory for resale!');
      loadTradeIns();
    } catch (err: any) {
      alert(err.message || 'Failed to convert to resale');
    }
  }

  return (
    <div className="rounded-2xl border border-border bg-surface p-5 shadow-xs">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h3 className="font-bold text-base text-ink">Trade-In Devices &amp; Used Device Resale</h3>
          <p className="text-xs text-muted">Accept used devices, track IMEIs, and convert them to resale inventory</p>
        </div>
        <Button onClick={() => setShowModal(true)} className="text-xs font-bold">
          + Intake Used Device
        </Button>
      </div>

      {tradeIns.length === 0 ? (
        <p className="text-xs text-muted p-8 text-center bg-canvas rounded-xl">No trade-in devices recorded.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full border-collapse text-left text-xs text-ink">
            <thead>
              <tr className="bg-canvas border-b border-border font-bold text-muted uppercase text-[10px]">
                <th className="px-4 py-3">Device &amp; IMEI</th>
                <th className="px-4 py-3">Condition</th>
                <th className="px-4 py-3 font-mono">Trade-In Value</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {tradeIns.map((t) => (
                <tr key={t.id} className="hover:bg-canvas">
                  <td className="px-4 py-3">
                    <p className="font-semibold text-ink">{t.deviceInfo}</p>
                    <p className="text-[10px] text-muted font-mono">{t.imei ? `IMEI: ${t.imei}` : 'No IMEI'}</p>
                  </td>
                  <td className="px-4 py-3 font-medium">{t.condition}</td>
                  <td className="px-4 py-3 font-mono font-bold text-emerald-600">
                    Rs {Number(t.tradeInValue).toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-muted">{t.customerName || 'Walk-in'} ({t.customerPhone || 'N/A'})</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                      t.status === 'CONVERTED_RESALE' ? 'bg-blue-500/10 text-blue-600' :
                      t.status === 'ADJUSTED' ? 'bg-purple-500/10 text-purple-600' :
                      'bg-amber-500/10 text-amber-600'
                    }`}>
                      {t.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {t.status === 'PENDING' ? (
                      <Button
                        onClick={() => handleConvertToResale(t.id)}
                        variant="secondary"
                        className="text-[11px] py-1 px-2.5 font-bold"
                      >
                        Convert to Resale
                      </Button>
                    ) : (
                      <span className="text-[11px] text-muted italic">Processed</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Intake Modal */}
      {showModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl border border-border bg-surface p-5 shadow-xl">
            <h3 className="font-bold text-base text-ink mb-1">Intake Trade-In Device</h3>
            <p className="text-xs text-muted mb-3">Record used phone details and agreed trade-in value.</p>

            <form onSubmit={handleCreateTradeIn} className="space-y-3 text-xs">
              <div>
                <label className="text-muted block mb-0.5">Device Model &amp; Specs *</label>
                <Input
                  required
                  placeholder="e.g. Samsung Galaxy S21 128GB Black"
                  value={deviceInfo}
                  onChange={(e) => setDeviceInfo(e.target.value)}
                  className="w-full"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-muted block mb-0.5">IMEI Number</label>
                  <Input
                    placeholder="35..."
                    value={imei}
                    onChange={(e) => setImei(e.target.value)}
                    className="w-full font-mono"
                  />
                </div>
                <div>
                  <label className="text-muted block mb-0.5">Condition</label>
                  <select
                    value={condition}
                    onChange={(e) => setCondition(e.target.value)}
                    className="w-full rounded border border-border bg-canvas px-2 py-1.5"
                  >
                    <option value="LIKE_NEW">Like New</option>
                    <option value="GOOD">Good / Minor Scratches</option>
                    <option value="FAIR">Fair / Visible Wear</option>
                    <option value="DEFECTIVE">Needs Repair</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-muted block mb-0.5">Agreed Trade-In Value (Rs) *</label>
                <Input
                  required
                  type="number"
                  min={0}
                  placeholder="0.00"
                  value={tradeInValue}
                  onChange={(e) => setTradeInValue(e.target.value)}
                  className="w-full font-mono text-sm font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-muted block mb-0.5">Customer Name</label>
                  <Input value={custName} onChange={(e) => setCustName(e.target.value)} className="w-full" />
                </div>
                <div>
                  <label className="text-muted block mb-0.5">Customer Phone</label>
                  <Input value={custPhone} onChange={(e) => setCustPhone(e.target.value)} className="w-full" />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-border">
                <Button type="button" onClick={() => setShowModal(false)} variant="secondary">Cancel</Button>
                <Button type="submit" className="font-bold">Save Trade-In Record</Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}

// Sub-component 5: Label Printer Panel
function LabelPrinterPanel() {
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<Product[]>([]);
  const [queue, setQueue] = useState<{ productId: string; name: string; quantity: number }[]>([]);
  const [labels, setLabels] = useState<{ productId: string; name: string; barcode: string; imageDataUrl: string; quantity: number }[]>([]);

  async function runSearch() {
    if (!search.trim()) return;
    const res = await api.get<Product[]>(`/products?search=${encodeURIComponent(search)}`);
    setResults(res);
  }

  function addToQueue(p: Product) {
    setQueue((prev) => {
      const exists = prev.find((i) => i.productId === p.id);
      if (exists) return prev.map((i) => (i.productId === p.id ? { ...i, quantity: i.quantity + 1 } : i));
      return [...prev, { productId: p.id, name: p.name, quantity: 1 }];
    });
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
    <div className="rounded-2xl border border-border bg-surface p-5 shadow-xs">
      <h3 className="font-bold text-base text-ink mb-1">Print Barcode Labels</h3>
      <p className="text-xs text-muted mb-3">Generate thermal barcode sticker labels for retail products</p>

      <div className="flex gap-2">
        <Input
          placeholder="Search product to label…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') runSearch();
          }}
          className="flex-1 text-xs"
        />
        <Button onClick={runSearch} variant="secondary" className="text-xs">
          Search
        </Button>
      </div>

      <ul className="my-3 flex flex-col gap-1.5 max-h-36 overflow-y-auto">
        {results.map((p) => (
          <li key={p.id} className="flex items-center justify-between p-2 rounded-lg bg-canvas border border-border text-xs">
            <div>
              <span className="font-semibold">{p.name}</span>
              <span className="text-[10px] text-muted ml-2">({p.barcode || p.sku})</span>
            </div>
            <Button onClick={() => addToQueue(p)} variant="secondary" className="py-0.5 px-2 text-[10px] font-bold">
              + Add
            </Button>
          </li>
        ))}
      </ul>

      {queue.length > 0 ? (
        <div className="space-y-2 border-t border-border pt-3">
          <p className="text-xs font-bold text-ink">Print Queue</p>
          {queue.map((q) => (
            <div key={q.productId} className="flex items-center justify-between text-xs">
              <span className="truncate">{q.name}</span>
              <div className="flex items-center gap-1">
                <span className="text-[10px] text-muted">Sticker Count:</span>
                <Input
                  type="number"
                  min={1}
                  value={q.quantity}
                  onChange={(e) =>
                    setQueue((prev) =>
                      prev.map((item) => (item.productId === q.productId ? { ...item, quantity: Number(e.target.value) } : item))
                    )
                  }
                  className="w-16 text-center text-xs py-0.5 font-bold"
                />
              </div>
            </div>
          ))}

          <Button onClick={printLabels} className="w-full py-2 text-xs font-bold mt-2">
            Generate &amp; Print Stickers
          </Button>
        </div>
      ) : null}

      <div className="label-sheet flex flex-wrap gap-[4mm] mt-4">
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
  const [activeTab, setActiveTab] = useState<'receiving' | 'suppliers' | 'returns' | 'tradeins' | 'labels'>('receiving');

  return (
    <div className="flex h-full flex-col min-h-0 bg-canvas p-4 space-y-3 overflow-y-auto">
      {/* Top Header & Tab Navigation */}
      <div className="flex items-center justify-between border-b border-border bg-surface p-4 rounded-2xl shadow-xs">
        <div>
          <h2 className="text-lg font-bold text-ink">Inventory, Suppliers &amp; Stock Operations</h2>
          <p className="text-xs text-muted">Manage stock intake, 50+ categories, wholesale/business pricing, suppliers, and trade-ins</p>
        </div>

        <div className="flex bg-canvas p-1 rounded-xl border border-border gap-1 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('receiving')}
            className={`px-3 py-1.5 rounded-lg cursor-pointer transition-all ${
              activeTab === 'receiving' ? 'bg-surface text-ink shadow-xs' : 'text-muted hover:text-ink'
            }`}
          >
            Stock Intake
          </button>
          <button
            onClick={() => setActiveTab('suppliers')}
            className={`px-3 py-1.5 rounded-lg cursor-pointer transition-all ${
              activeTab === 'suppliers' ? 'bg-surface text-ink shadow-xs' : 'text-muted hover:text-ink'
            }`}
          >
            Suppliers
          </button>
          <button
            onClick={() => setActiveTab('returns')}
            className={`px-3 py-1.5 rounded-lg cursor-pointer transition-all ${
              activeTab === 'returns' ? 'bg-surface text-ink shadow-xs' : 'text-muted hover:text-ink'
            }`}
          >
            Supplier Returns
          </button>
          <button
            onClick={() => setActiveTab('tradeins')}
            className={`px-3 py-1.5 rounded-lg cursor-pointer transition-all ${
              activeTab === 'tradeins' ? 'bg-surface text-ink shadow-xs' : 'text-muted hover:text-ink'
            }`}
          >
            Trade-In Resale
          </button>
          <button
            onClick={() => setActiveTab('labels')}
            className={`px-3 py-1.5 rounded-lg cursor-pointer transition-all ${
              activeTab === 'labels' ? 'bg-surface text-ink shadow-xs' : 'text-muted hover:text-ink'
            }`}
          >
            Barcode Labels
          </button>
        </div>
      </div>

      {/* Tab Panels */}
      {activeTab === 'receiving' && <ReceiveStockPanel />}
      {activeTab === 'suppliers' && <SupplierManagementPanel />}
      {activeTab === 'returns' && <SupplierReturnsPanel />}
      {activeTab === 'tradeins' && <TradeInManagementPanel />}
      {activeTab === 'labels' && (
        <div className="max-w-xl">
          <LabelPrinterPanel />
        </div>
      )}
    </div>
  );
}
