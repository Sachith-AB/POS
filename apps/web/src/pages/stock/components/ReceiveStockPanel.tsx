import { useEffect, useRef, useState } from 'react';
import { useAppDispatch, useAppSelector } from '../../../app/hooks';
import { api } from '../../../lib/api';
import { Input } from '../../../components/Input';
import { Button } from '../../../components/Button';
import { ConfirmModal } from '../../../components/ConfirmModal';
import { toast } from 'react-toastify';
import type { Product } from '../../../features/products/productsSlice';
import {
  barcodeEntered,
  batchSubmitRequested,
  invoiceRefChanged,
  isCreditPurchaseChanged,
  lineAdded,
  lineRemoved,
  quickCreateRequested,
  supplierIdChanged,
  supplierNameChanged,
} from '../../../features/stock/stockSlice';
import {
  FiSearch,
  FiEdit2,
  FiTrash2,
  FiAlertTriangle,
  FiBox,
  FiRefreshCw,
  FiPlus,
  FiX,
  FiCheckCircle,
  FiDollarSign,
  FiClock,
  FiFilter,
} from 'react-icons/fi';
import type { CategoryItem, WarrantyOption, SupplierItem } from './types';

export function ReceiveStockPanel() {
  const dispatch = useAppDispatch();
  const {
    matchedProduct,
    notFoundBarcode,
    pendingLines,
    supplierName,
    supplierId,
    invoiceRef,
    isCreditPurchase,
    submitting,
    lastBatchCount,
  } = useAppSelector((s) => s.stock);

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

  // Serialized IMEIs for New Product form
  const [newProductImeis, setNewProductImeis] = useState<string[]>([]);
  const [newProductImeiInput, setNewProductImeiInput] = useState('');

  // Auxiliary data
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [warranties, setWarranties] = useState<WarrantyOption[]>([]);
  const [suppliers, setSuppliers] = useState<SupplierItem[]>([]);

  // Custom manual receive states
  const [receiveMode, setReceiveMode] = useState<'scan' | 'search' | 'create'>('scan');
  const [manualBarcode, setManualBarcode] = useState('');
  const [isSerializedProduct, setIsSerializedProduct] = useState(false);
  const [productSearch, setProductSearch] = useState('');
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);

  // Quick Add Category State
  const [showNewCategoryModal, setShowNewCategoryModal] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [creatingCategory, setCreatingCategory] = useState(false);
  const [categoryError, setCategoryError] = useState<string | null>(null);

  async function handleCreateNewCategory(e?: React.FormEvent) {
    if (e) e.preventDefault();
    const trimmed = newCategoryName.trim();
    if (!trimmed) return;

    const existing = categories.find((c) => c.name.toLowerCase() === trimmed.toLowerCase());
    if (existing) {
      setQuickCategory(existing.name);
      setShowNewCategoryModal(false);
      setNewCategoryName('');
      setCategoryError(null);
      return;
    }

    setCreatingCategory(true);
    setCategoryError(null);
    try {
      const created = await api.post<CategoryItem>('/categories', { name: trimmed });
      setCategories((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name)));
      setQuickCategory(created.name);
      setShowNewCategoryModal(false);
      setNewCategoryName('');
    } catch (err: any) {
      setCategoryError(err.message || 'Failed to create category');
    } finally {
      setCreatingCategory(false);
    }
  }

  const scanRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (receiveMode === 'scan') {
      scanRef.current?.focus();
    }
  }, [receiveMode]);

  const loadSuppliers = () => {
    api.get<SupplierItem[]>('/suppliers').then((data) => setSuppliers(data || [])).catch(() => {});
  };

  useEffect(() => {
    // Fetch categories, warranties, and suppliers
    api.get<CategoryItem[]>('/categories').then((data) => setCategories(data || [])).catch(() => {});
    api.get<WarrantyOption[]>('/warranties').then((data) => setWarranties(data || [])).catch(() => {});
    loadSuppliers();
  }, []);

  useEffect(() => {
    if (lastBatchCount != null) {
      loadSuppliers();
    }
  }, [lastBatchCount]);

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

    const intakeQty = isSerializedProduct ? newProductImeis.length : (Number(quickQty) || 1);
    if (isSerializedProduct && intakeQty === 0) {
      toast.warn('Please add at least 1 IMEI / serial number for serialized products');
      return;
    }

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
        quantity: 0, // Initially 0, batch receiving will intake this product
        category: quickCategory.trim() || 'Mobile Phones',
        isSerialized: isSerializedProduct,
        lowStockThreshold: 3,
      });

      dispatch(
        lineAdded({
          productId: product.id,
          name: product.name,
          quantityDelta: intakeQty,
          costPriceAtTime: Number(product.costPrice),
          imeis: isSerializedProduct ? newProductImeis : [],
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
      setNewProductImeis([]);
      setNewProductImeiInput('');
      setReceiveMode('scan');
      toast.success(`Product "${product.name}" created & added ${intakeQty} to intake batch`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to create product');
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

            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-[10px] text-muted block mb-0.5">Cost Price (Rs) *</label>
                <Input
                  required
                  type="number"
                  min={0}
                  step="any"
                  placeholder="0.00"
                  value={quickCost}
                  onChange={(e) => setQuickCost(e.target.value)}
                  className="w-full text-xs font-mono"
                />
              </div>
              <div>
                <label className="text-[10px] text-muted block mb-0.5">Quantity to Add *</label>
                <Input
                  required
                  type="number"
                  min={1}
                  placeholder="1"
                  value={isSerializedProduct ? String(newProductImeis.length) : quickQty}
                  onChange={(e) => setQuickQty(e.target.value)}
                  disabled={isSerializedProduct}
                  className="w-full text-xs font-mono"
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-0.5">
                  <label className="text-[10px] text-muted block truncate">Category</label>
                  <button
                    type="button"
                    onClick={() => {
                      setCategoryError(null);
                      setNewCategoryName('');
                      setShowNewCategoryModal(true);
                    }}
                    className="text-[10px] font-semibold text-primary hover:underline flex items-center gap-0.5 cursor-pointer"
                  >
                    + New
                  </button>
                </div>
                <select
                  value={quickCategory}
                  onChange={(e) => {
                    if (e.target.value === '__new__') {
                      setCategoryError(null);
                      setNewCategoryName('');
                      setShowNewCategoryModal(true);
                    } else {
                      setQuickCategory(e.target.value);
                    }
                  }}
                  className="w-full rounded-lg border border-border bg-canvas px-2.5 py-1.5 text-xs text-ink"
                >
                  <option value="">-- Choose Category --</option>
                  <option value="__new__" className="font-semibold text-primary">
                    + Create New Category...
                  </option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.name}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Serial / IMEI scanning for New Product */}
            {isSerializedProduct && (
              <div className="rounded-xl bg-canvas border border-border p-2.5 space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-[10px] font-bold uppercase text-muted">
                    Serial / IMEI Numbers ({newProductImeis.length})
                  </label>
                  <span className="text-[10px] text-primary font-semibold">
                    Quantity auto-set: {newProductImeis.length} units
                  </span>
                </div>
                <div className="flex gap-2">
                  <Input
                    placeholder="Scan or enter IMEI / Serial #..."
                    value={newProductImeiInput}
                    onChange={(e) => setNewProductImeiInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        const val = newProductImeiInput.trim();
                        if (val && !newProductImeis.includes(val)) {
                          setNewProductImeis((prev) => [...prev, val]);
                          setNewProductImeiInput('');
                        }
                      }
                    }}
                    className="text-xs font-mono flex-1"
                  />
                  <Button
                    type="button"
                    onClick={() => {
                      const val = newProductImeiInput.trim();
                      if (val && !newProductImeis.includes(val)) {
                        setNewProductImeis((prev) => [...prev, val]);
                        setNewProductImeiInput('');
                      }
                    }}
                    className="text-xs"
                  >
                    + Add IMEI
                  </Button>
                </div>
                {newProductImeis.length > 0 && (
                  <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto">
                    {newProductImeis.map((im, idx) => (
                      <span
                        key={idx}
                        className="bg-surface border border-border px-2 py-0.5 rounded text-[10px] font-mono flex items-center gap-1"
                      >
                        {im}
                        <button
                          type="button"
                          onClick={() => setNewProductImeis((prev) => prev.filter((_, i) => i !== idx))}
                          className="text-rose-500 hover:text-rose-700 font-bold ml-1 cursor-pointer"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}

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
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setIsSerializedProduct(checked);
                    if (!checked) {
                      setNewProductImeis([]);
                      setNewProductImeiInput('');
                    }
                  }}
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
                value={supplierId}
                onChange={(e) => {
                  const sId = e.target.value;
                  dispatch(supplierIdChanged(sId));
                  const sup = suppliers.find((s) => s.id === sId);
                  dispatch(supplierNameChanged(sup ? sup.name : ''));
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
              <div className="flex justify-between items-center mb-0.5">
                <label className="text-[10px] font-semibold text-muted block">Invoice / Ref #</label>
                <button
                  type="button"
                  onClick={() => {
                    const rnd = `INV-${Date.now().toString().slice(-6)}-${Math.floor(1000 + Math.random() * 9000)}`;
                    dispatch(invoiceRefChanged(rnd));
                  }}
                  className="text-[10px] font-semibold text-primary hover:underline cursor-pointer"
                >
                  Generate Ref
                </button>
              </div>
              <Input
                placeholder="INV-..."
                value={invoiceRef}
                onChange={(e) => dispatch(invoiceRefChanged(e.target.value))}
                className="text-xs py-1 font-mono"
              />
            </div>
          </div>

          <label className="flex items-center gap-2 text-xs text-muted cursor-pointer pt-1">
            <input
              type="checkbox"
              checked={isCreditPurchase}
              onChange={(e) => dispatch(isCreditPurchaseChanged(e.target.checked))}
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

        {/* Batch totals and live supplier balance calculation */}
        {(() => {
          const totalBatchCost = pendingLines.reduce(
            (sum, l) => sum + (l.costPriceAtTime ?? 0) * l.quantityDelta,
            0
          );
          const currentSupplier = suppliers.find((s) => s.id === supplierId);
          const currentBal = currentSupplier ? Number(currentSupplier.outstandingBalance) : 0;
          const projectedBal = isCreditPurchase ? currentBal + totalBatchCost : currentBal;

          return (
            <div className="border-t border-border pt-3 space-y-1.5 mb-3 text-xs">
              <div className="flex justify-between items-center font-bold text-ink">
                <span>Total Units to Receive:</span>
                <span className="font-mono text-sm">{totalUnits} units</span>
              </div>
              <div className="flex justify-between items-center text-ink font-semibold">
                <span>Total Batch Value (Cost):</span>
                <span className="font-mono font-bold text-sm text-primary">
                  Rs {totalBatchCost.toFixed(2)}
                </span>
              </div>
              {currentSupplier && (
                <div className="bg-canvas/80 border border-border p-2.5 rounded-xl text-[11px] space-y-1 mt-1">
                  <div className="flex justify-between">
                    <span className="text-muted">Supplier:</span>
                    <span className="font-bold text-ink">{currentSupplier.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted">Intake Type:</span>
                    <span className={`font-semibold ${isCreditPurchase ? 'text-rose-600' : 'text-emerald-600'}`}>
                      {isCreditPurchase ? 'Credit Purchase (Payable)' : 'Paid / Non-Credit'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted">Current Balance:</span>
                    <span className="font-mono font-medium">Rs {currentBal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between border-t border-border/60 pt-1 font-bold">
                    <span>New Balance After Intake:</span>
                    <span className={`font-mono ${isCreditPurchase ? 'text-rose-600' : 'text-emerald-600'}`}>
                      Rs {projectedBal.toFixed(2)}
                    </span>
                  </div>
                </div>
              )}
            </div>
          );
        })()}

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

      {/* Quick Add Category Modal */}
      {showNewCategoryModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-2xl border border-border bg-surface p-5 shadow-xl">
            <h3 className="font-bold text-sm text-ink mb-1">Create New Category</h3>
            <p className="text-xs text-muted mb-3">
              Add a new product category. It will be saved and selected immediately.
            </p>

            <form onSubmit={handleCreateNewCategory} className="space-y-3 text-xs">
              <div>
                <label className="text-muted block mb-1 font-medium">Category Name *</label>
                <Input
                  autoFocus
                  required
                  placeholder="e.g. Smart Watches, Audio, Spare Parts..."
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  className="w-full text-xs"
                />
                {categoryError ? <p className="text-[11px] text-danger mt-1">{categoryError}</p> : null}
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-border">
                <Button
                  type="button"
                  onClick={() => {
                    setShowNewCategoryModal(false);
                    setCategoryError(null);
                  }}
                  variant="secondary"
                  className="text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  loading={creatingCategory}
                  disabled={!newCategoryName.trim()}
                  className="text-xs font-bold"
                >
                  Create &amp; Select
                </Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}

// Sub-component 2: Supplier Management Panel (Q16, Q17)