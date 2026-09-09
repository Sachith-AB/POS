import { useEffect, useRef, useState } from 'react';
import { useAppDispatch, useAppSelector } from '../app/hooks';
import { api } from '../lib/api';
import { Input } from '../components/Input';
import { Button } from '../components/Button';
import { ConfirmModal } from '../components/ConfirmModal';
import { toast } from 'react-toastify';
import type { Product } from '../features/products/productsSlice';
import {
  FiSearch,
  FiEdit2,
  FiTrash2,
  FiAlertTriangle,
  FiBox,
  FiRefreshCw,
  FiDollarSign,
  FiArrowDownLeft,
  FiArrowUpRight,
  FiClock,
  FiFileText,
  FiFilter,
  FiTrendingUp,
  FiCheckCircle,
} from 'react-icons/fi';
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
  email?: string | null;
  contactPerson?: string | null;
  address?: string | null;
  notes?: string | null;
  totalPayable: number | string;
  paidAmount: number | string;
  outstandingBalance: number | string;
  transactions?: any[];
}

interface StockMovementItem {
  id: string;
  productId: string;
  supplierId: string | null;
  type: 'RECEIVE' | 'SALE' | 'RETURN' | 'ADJUSTMENT';
  quantityDelta: number;
  costPriceAtTime: number | string | null;
  supplierName: string | null;
  invoiceRef: string | null;
  employeeId: string;
  createdAt: string;
  product?: {
    id: string;
    name: string;
    sku: string;
    barcode: string | null;
    sellPrice: number | string;
  };
  supplier?: {
    id: string;
    name: string;
    phone: string | null;
  } | null;
  employee?: {
    id: string;
    name: string;
  };
}

interface SupplierTransactionRecord {
  id: string;
  supplierId: string;
  type: 'PURCHASE' | 'PAYMENT' | 'RETURN_CREDIT';
  amount: number | string;
  reference: string | null;
  notes: string | null;
  createdAt: string;
  supplier?: {
    id: string;
    name: string;
    phone: string | null;
  };
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
function SupplierManagementPanel() {
  const [suppliers, setSuppliers] = useState<SupplierItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showPayModal, setShowPayModal] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<SupplierItem | null>(null);

  // Add form state
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [savingAdd, setSavingAdd] = useState(false);

  // Edit form state
  const [editingSupplier, setEditingSupplier] = useState<SupplierItem | null>(null);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  // Delete state
  const [supplierToDelete, setSupplierToDelete] = useState<SupplierItem | null>(null);
  const [deletingSupplier, setDeletingSupplier] = useState(false);

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
    setSavingAdd(true);
    try {
      await api.post('/suppliers', {
        name: name.trim(),
        phone: phone.trim() || null,
        email: email.trim() || null,
        address: address.trim() || null,
        notes: notes.trim() || null,
      });
      setShowAddModal(false);
      setName('');
      setPhone('');
      setEmail('');
      setAddress('');
      setNotes('');
      loadSuppliers();
      toast.success('Supplier added successfully');
    } catch (err: any) {
      toast.error(err.message || 'Failed to add supplier');
    } finally {
      setSavingAdd(false);
    }
  }

  function openEditSupplierModal(s: SupplierItem) {
    setEditingSupplier(s);
    setEditName(s.name || '');
    setEditPhone(s.phone || '');
    setEditEmail(s.email || '');
    setEditAddress(s.address || '');
    setEditNotes(s.notes || '');
  }

  async function handleEditSupplier(e: React.FormEvent) {
    e.preventDefault();
    if (!editingSupplier || !editName.trim()) return;
    setSavingEdit(true);
    try {
      await api.patch(`/suppliers/${editingSupplier.id}`, {
        name: editName.trim(),
        phone: editPhone.trim() || null,
        email: editEmail.trim() || null,
        address: editAddress.trim() || null,
        notes: editNotes.trim() || null,
      });
      setEditingSupplier(null);
      loadSuppliers();
      toast.success('Supplier updated successfully');
    } catch (err: any) {
      toast.error(err.message || 'Failed to update supplier');
    } finally {
      setSavingEdit(false);
    }
  }

  async function confirmDeleteSupplier() {
    if (!supplierToDelete) return;
    setDeletingSupplier(true);
    try {
      await api.delete(`/suppliers/${supplierToDelete.id}`);
      toast.success(`Supplier "${supplierToDelete.name}" deleted successfully`);
      setSupplierToDelete(null);
      loadSuppliers();
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete supplier');
    } finally {
      setDeletingSupplier(false);
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
      toast.success('Payment recorded successfully');
    } catch (err: any) {
      toast.error(err.message || 'Failed to record payment');
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
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {suppliers.map((s) => (
                <tr key={s.id} className="hover:bg-canvas transition-colors">
                  <td className="px-4 py-3 font-semibold text-ink">
                    <div>{s.name}</div>
                    {s.address ? <div className="text-[11px] font-normal text-muted truncate max-w-[200px]">{s.address}</div> : null}
                  </td>
                  <td className="px-4 py-3 text-muted">
                    {s.contactPerson ? <div className="text-ink font-medium">{s.contactPerson}</div> : null}
                    <div>{s.phone || (s.contactPerson ? '' : '—')}</div>
                    {s.email ? <div className="text-[11px] text-muted">{s.email}</div> : null}
                  </td>
                  <td className="px-4 py-3 font-mono">Rs {Number(s.totalPayable).toFixed(2)}</td>
                  <td className="px-4 py-3 font-mono text-emerald-600">Rs {Number(s.paidAmount).toFixed(2)}</td>
                  <td className="px-4 py-3 font-mono font-bold text-rose-600">
                    Rs {Number(s.outstandingBalance).toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <Button
                        onClick={() => {
                          setSelectedSupplier(s);
                          setPayAmount('');
                          setPayRef(`PAY-${Date.now().toString().slice(-6)}-${Math.floor(1000 + Math.random() * 9000)}`);
                          setShowPayModal(true);
                        }}
                        variant="secondary"
                        className="text-[11px] py-1 px-2.5 font-bold"
                        title="Record supplier payment"
                      >
                        Record Payment
                      </Button>
                      <Button
                        onClick={() => openEditSupplierModal(s)}
                        variant="secondary"
                        className="py-1 px-2.5 text-xs font-semibold flex items-center gap-1"
                        title="Edit supplier"
                      >
                        <FiEdit2 className="h-3 w-3" />
                        <span>Edit</span>
                      </Button>
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => setSupplierToDelete(s)}
                        className="py-1 px-2.5 text-xs font-semibold flex items-center gap-1 text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30 border-rose-200 dark:border-rose-900/50"
                        title="Delete supplier"
                      >
                        <FiTrash2 className="h-3 w-3" />
                        <span>Delete</span>
                      </Button>
                    </div>
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
                <Input required value={name} onChange={(e) => setName(e.target.value)} className="w-full" placeholder="e.g. Abans PLC" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-muted block mb-0.5">Phone</label>
                  <Input value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full" placeholder="e.g. 0771234567" />
                </div>
                <div>
                  <label className="text-muted block mb-0.5">Email</label>
                  <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full" placeholder="supplier@example.com" />
                </div>
              </div>
              <div>
                <label className="text-muted block mb-0.5">Address</label>
                <Input value={address} onChange={(e) => setAddress(e.target.value)} className="w-full" placeholder="Colombo 03, Sri Lanka" />
              </div>
              <div>
                <label className="text-muted block mb-0.5">Notes</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  className="w-full rounded-xl border border-border bg-surface p-2.5 text-xs text-ink focus:border-brand focus:outline-hidden resize-none"
                  placeholder="Additional supplier notes or contact info..."
                />
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-border">
                <Button type="button" onClick={() => setShowAddModal(false)} variant="secondary" disabled={savingAdd}>
                  Cancel
                </Button>
                <Button type="submit" className="font-bold" disabled={savingAdd}>
                  {savingAdd ? 'Saving…' : 'Save Supplier'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {/* Edit Supplier Modal */}
      {editingSupplier ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl border border-border bg-surface p-5 shadow-xl">
            <h3 className="font-bold text-base text-ink mb-3">Edit Supplier</h3>
            <form onSubmit={handleEditSupplier} className="space-y-3 text-xs">
              <div>
                <label className="text-muted block mb-0.5">Supplier Name *</label>
                <Input
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-muted block mb-0.5">Phone</label>
                  <Input
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    className="w-full"
                  />
                </div>
                <div>
                  <label className="text-muted block mb-0.5">Email</label>
                  <Input
                    type="email"
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    className="w-full"
                  />
                </div>
              </div>
              <div>
                <label className="text-muted block mb-0.5">Address</label>
                <Input
                  value={editAddress}
                  onChange={(e) => setEditAddress(e.target.value)}
                  className="w-full"
                />
              </div>
              <div>
                <label className="text-muted block mb-0.5">Notes</label>
                <textarea
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  rows={2}
                  className="w-full rounded-xl border border-border bg-surface p-2.5 text-xs text-ink focus:border-brand focus:outline-hidden resize-none"
                  placeholder="Additional supplier notes..."
                />
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-border">
                <Button
                  type="button"
                  onClick={() => setEditingSupplier(null)}
                  variant="secondary"
                  disabled={savingEdit}
                >
                  Cancel
                </Button>
                <Button type="submit" className="font-bold" disabled={savingEdit}>
                  {savingEdit ? 'Saving…' : 'Save Changes'}
                </Button>
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
                <div className="flex justify-between items-center mb-0.5">
                  <label className="text-muted block font-medium">Reference / Bank Slip #</label>
                  <button
                    type="button"
                    onClick={() => setPayRef(`PAY-${Date.now().toString().slice(-6)}-${Math.floor(1000 + Math.random() * 9000)}`)}
                    className="text-[10px] text-primary hover:underline font-semibold cursor-pointer"
                  >
                    Random Ref
                  </button>
                </div>
                <Input value={payRef} onChange={(e) => setPayRef(e.target.value)} className="w-full font-mono" />
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-border">
                <Button type="button" onClick={() => setShowPayModal(false)} variant="secondary">Cancel</Button>
                <Button type="submit" className="font-bold">Confirm Payment</Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {/* Delete Supplier Confirmation Modal */}
      <ConfirmModal
        isOpen={Boolean(supplierToDelete)}
        title="Delete Supplier?"
        message={`Are you sure you want to delete supplier "${supplierToDelete?.name}"? This will permanently remove the supplier and any associated transaction records.`}
        confirmLabel="Delete Supplier"
        loading={deletingSupplier}
        onConfirm={confirmDeleteSupplier}
        onCancel={() => setSupplierToDelete(null)}
      />
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
      toast.success('Return processed successfully');
    } catch (err: any) {
      toast.error(err.message || 'Failed to process return');
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
      toast.success('Trade-in accepted successfully');
    } catch (err: any) {
      toast.error(err.message || 'Failed to accept trade-in');
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
      toast.success('Successfully added to inventory for resale!');
      loadTradeIns();
    } catch (err: any) {
      toast.error(err.message || 'Failed to convert to resale');
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

// Sub-component 6: Product List Panel
function ProductListPanel() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [lowStockOnly, setLowStockOnly] = useState(false);

  // Edit Modal State
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editName, setEditName] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editSellPrice, setEditSellPrice] = useState('');
  const [editCostPrice, setEditCostPrice] = useState('');
  const [editWholesalePrice, setEditWholesalePrice] = useState('');
  const [editBusinessPrice, setEditBusinessPrice] = useState('');
  const [editLowStockThreshold, setEditLowStockThreshold] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Delete Product Confirmation Modal State
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [deletingProduct, setDeletingProduct] = useState(false);

  const confirmDeleteProduct = async () => {
    if (!productToDelete) return;
    setDeletingProduct(true);
    try {
      await api.delete(`/products/${productToDelete.id}`);
      setProducts((prev) => prev.filter((p) => p.id !== productToDelete.id));
      if (editingProduct?.id === productToDelete.id) {
        setEditingProduct(null);
      }
      toast.success('Product deleted successfully');
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete product');
    } finally {
      setDeletingProduct(false);
      setProductToDelete(null);
    }
  };

  const loadProducts = () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search.trim()) params.append('search', search.trim());
    if (selectedCategory) params.append('category', selectedCategory);

    api
      .get<Product[]>(`/products?${params.toString()}`)
      .then((data) => setProducts(data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    api
      .get<CategoryItem[]>('/categories')
      .then((d) => setCategories(d || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadProducts();
    }, 250);
    return () => clearTimeout(timer);
  }, [search, selectedCategory]);

  const openEditModal = (p: Product) => {
    setEditingProduct(p);
    setEditName(p.name);
    setEditCategory(p.category);
    setEditSellPrice(String(p.sellPrice));
    setEditCostPrice(String(p.costPrice));
    setEditWholesalePrice(p.wholesalePrice != null ? String(p.wholesalePrice) : '');
    setEditBusinessPrice(p.businessPrice != null ? String(p.businessPrice) : '');
    setEditLowStockThreshold(String(p.lowStockThreshold));
    setEditError(null);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;
    setSavingEdit(true);
    setEditError(null);
    try {
      const updated = await api.patch<Product>(`/products/${editingProduct.id}`, {
        name: editName.trim(),
        category: editCategory,
        sellPrice: Number(editSellPrice) || 0,
        costPrice: Number(editCostPrice) || 0,
        wholesalePrice: editWholesalePrice ? Number(editWholesalePrice) : null,
        businessPrice: editBusinessPrice ? Number(editBusinessPrice) : null,
        lowStockThreshold: Number(editLowStockThreshold) || 0,
      });
      setProducts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
      setEditingProduct(null);
    } catch (err: any) {
      setEditError(err.message || 'Failed to update product');
    } finally {
      setSavingEdit(false);
    }
  };

  const displayedProducts = lowStockOnly
    ? products.filter((p) => p.quantity <= p.lowStockThreshold)
    : products;

  const totalStockUnits = products.reduce((sum, p) => sum + p.quantity, 0);
  const totalValuation = products.reduce((sum, p) => sum + (Number(p.costPrice) || 0) * p.quantity, 0);
  const lowStockCount = products.filter((p) => p.quantity <= p.lowStockThreshold).length;

  return (
    <div className="space-y-3">
      {/* Metric Overview Cards */}
      <div className="grid grid-cols-4 gap-3">
        <div className="rounded-2xl border border-border bg-surface p-4 shadow-xs">
          <div className="flex items-center justify-between text-muted text-xs">
            <span>Total Catalog Products</span>
            <FiBox className="h-4 w-4 text-primary" />
          </div>
          <p className="text-2xl font-bold text-ink mt-1">{products.length}</p>
          <span className="text-[10px] text-muted">Across {categories.length} categories</span>
        </div>

        <div className="rounded-2xl border border-border bg-surface p-4 shadow-xs">
          <div className="flex items-center justify-between text-muted text-xs">
            <span>Total Stock Units</span>
            <span className="text-[11px] font-semibold text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded-full">Active</span>
          </div>
          <p className="text-2xl font-bold text-ink mt-1">{totalStockUnits}</p>
          <span className="text-[10px] text-muted">Available in store</span>
        </div>

        <div className="rounded-2xl border border-border bg-surface p-4 shadow-xs">
          <div className="flex items-center justify-between text-muted text-xs">
            <span>Low Stock Alerts</span>
            <FiAlertTriangle className={`h-4 w-4 ${lowStockCount > 0 ? 'text-amber-500' : 'text-muted'}`} />
          </div>
          <p className={`text-2xl font-bold mt-1 ${lowStockCount > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-ink'}`}>
            {lowStockCount}
          </p>
          <span className="text-[10px] text-muted">Items below reorder limit</span>
        </div>

        <div className="rounded-2xl border border-border bg-surface p-4 shadow-xs">
          <div className="flex items-center justify-between text-muted text-xs">
            <span>Stock Valuation (Cost)</span>
            <FiDollarSign className="h-4 w-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-bold text-ink mt-1 font-mono">
            Rs {totalValuation.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
          </p>
          <span className="text-[10px] text-muted">Total inventory asset value</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-border bg-surface p-3 shadow-xs">
        <div className="flex flex-1 items-center gap-2 min-w-[280px]">
          <div className="relative flex-1">
            <FiSearch className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted pointer-events-none" />
            <Input
              placeholder="Search by product name, SKU, or barcode..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 text-xs py-1.5"
            />
          </div>

          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="rounded-lg border border-border bg-canvas px-2.5 py-1.5 text-xs text-ink max-w-[200px]"
          >
            <option value="">All Categories ({categories.length})</option>
            {categories.map((c) => (
              <option key={c.id} value={c.name}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <label className="flex items-center gap-1.5 text-xs text-muted cursor-pointer select-none px-2 py-1 rounded-lg border border-border bg-canvas hover:bg-surface">
            <input
              type="checkbox"
              checked={lowStockOnly}
              onChange={(e) => setLowStockOnly(e.target.checked)}
              className="rounded border-border text-primary cursor-pointer"
            />
            <span className={lowStockOnly ? 'font-bold text-amber-600 dark:text-amber-400' : ''}>Low Stock Only</span>
          </label>

          <Button onClick={loadProducts} variant="secondary" className="text-xs py-1.5 px-3 flex items-center gap-1">
            <FiRefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </Button>
        </div>
      </div>

      {/* Product Table */}
      <div className="rounded-2xl border border-border bg-surface shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-border bg-canvas text-[11px] font-bold text-muted uppercase">
                <th className="py-3 px-4">Product</th>
                <th className="py-3 px-3">SKU / Barcode</th>
                <th className="py-3 px-3">Category</th>
                <th className="py-3 px-3 text-right">Cost Price</th>
                <th className="py-3 px-3 text-right">Retail Price</th>
                <th className="py-3 px-3 text-right">Wholesale / Biz</th>
                <th className="py-3 px-3 text-center">Stock Level</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading && displayedProducts.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-muted">
                    <FiRefreshCw className="h-5 w-5 animate-spin mx-auto mb-2 text-primary" />
                    Loading products...
                  </td>
                </tr>
              ) : displayedProducts.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-muted">
                    No products found matching your search or filters.
                  </td>
                </tr>
              ) : (
                displayedProducts.map((p) => {
                  const isLow = p.quantity <= p.lowStockThreshold && p.quantity > 0;
                  const isOut = p.quantity === 0;

                  return (
                    <tr key={p.id} className="hover:bg-canvas transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-semibold text-ink text-xs">{p.name}</div>
                        {p.isSerialized ? (
                          <span className="inline-block mt-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-600 border border-blue-500/20">
                            IMEI / Serial Tracked
                          </span>
                        ) : null}
                      </td>
                      <td className="py-3 px-3 font-mono text-[11px] text-muted">
                        <div>{p.sku}</div>
                        {p.barcode ? <div className="text-[10px] text-muted">{p.barcode}</div> : null}
                      </td>
                      <td className="py-3 px-3">
                        <span className="inline-block text-[11px] font-medium px-2 py-0.5 rounded-full bg-canvas border border-border text-ink">
                          {p.category}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-medium text-muted">
                        Rs {Number(p.costPrice).toFixed(2)}
                      </td>
                      <td className="py-3 px-3 text-right font-mono font-bold text-ink">
                        Rs {Number(p.sellPrice).toFixed(2)}
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-[11px] text-muted">
                        <div>W: {p.wholesalePrice != null ? `Rs ${Number(p.wholesalePrice).toFixed(2)}` : '—'}</div>
                        <div>B: {p.businessPrice != null ? `Rs ${Number(p.businessPrice).toFixed(2)}` : '—'}</div>
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                            isOut
                              ? 'bg-rose-500/10 text-rose-600 border border-rose-500/20'
                              : isLow
                              ? 'bg-amber-500/10 text-amber-600 border border-amber-500/20'
                              : 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
                          }`}
                        >
                          {p.quantity} {isOut ? '(Out)' : isLow ? '(Low)' : 'in stock'}
                        </span>
                        <div className="text-[9px] text-muted mt-0.5 font-mono">Limit: {p.lowStockThreshold}</div>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            onClick={() => openEditModal(p)}
                            variant="secondary"
                            className="py-1 px-2.5 text-xs font-semibold flex items-center gap-1"
                          >
                            <FiEdit2 className="h-3 w-3" />
                            <span>Edit</span>
                          </Button>
                          <Button
                            type="button"
                            variant="secondary"
                            onClick={() => setProductToDelete(p)}
                            className="py-1 px-2.5 text-xs font-semibold flex items-center gap-1 text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30 border-rose-200 dark:border-rose-900/50"
                            title="Delete product"
                          >
                            <FiTrash2 className="h-3 w-3" />
                            <span>Delete</span>
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Product Modal */}
      {editingProduct ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-2xl border border-border bg-surface p-5 shadow-xl">
            <h3 className="font-bold text-base text-ink mb-1">Edit Product Details</h3>
            <p className="text-xs text-muted mb-3">
              Update pricing, category, or reorder threshold for <span className="font-semibold text-ink">{editingProduct.name}</span>.
            </p>

            <form onSubmit={handleSaveEdit} className="space-y-3 text-xs">
              <div>
                <label className="text-muted block mb-0.5 font-medium">Product Name *</label>
                <Input
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-muted block mb-0.5 font-medium">Category *</label>
                  <select
                    value={editCategory}
                    onChange={(e) => setEditCategory(e.target.value)}
                    className="w-full rounded-lg border border-border bg-canvas px-2.5 py-2 text-xs text-ink"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.name}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-muted block mb-0.5 font-medium">Low Stock Alert Limit</label>
                  <Input
                    type="number"
                    min={0}
                    value={editLowStockThreshold}
                    onChange={(e) => setEditLowStockThreshold(e.target.value)}
                    className="w-full font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-muted block mb-0.5 font-medium">Cost Price (Rs) *</label>
                  <Input
                    required
                    type="number"
                    min={0}
                    step="any"
                    value={editCostPrice}
                    onChange={(e) => setEditCostPrice(e.target.value)}
                    className="w-full font-mono"
                  />
                </div>
                <div>
                  <label className="text-muted block mb-0.5 font-medium">Retail Price (Rs) *</label>
                  <Input
                    required
                    type="number"
                    min={0}
                    step="any"
                    value={editSellPrice}
                    onChange={(e) => setEditSellPrice(e.target.value)}
                    className="w-full font-mono font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-muted block mb-0.5 font-medium">Wholesale Price (Rs)</label>
                  <Input
                    type="number"
                    min={0}
                    step="any"
                    placeholder="Optional"
                    value={editWholesalePrice}
                    onChange={(e) => setEditWholesalePrice(e.target.value)}
                    className="w-full font-mono"
                  />
                </div>
                <div>
                  <label className="text-muted block mb-0.5 font-medium">Business Price (Rs)</label>
                  <Input
                    type="number"
                    min={0}
                    step="any"
                    placeholder="Optional"
                    value={editBusinessPrice}
                    onChange={(e) => setEditBusinessPrice(e.target.value)}
                    className="w-full font-mono"
                  />
                </div>
              </div>

              {editError ? <p className="text-[11px] text-danger">{editError}</p> : null}

              <div className="flex justify-between items-center pt-2 border-t border-border">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setProductToDelete(editingProduct)}
                  className="text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 flex items-center gap-1"
                >
                  <FiTrash2 className="h-3.5 w-3.5" />
                  <span>Delete Product</span>
                </Button>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    onClick={() => setEditingProduct(null)}
                    variant="secondary"
                    className="text-xs"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    loading={savingEdit}
                    className="text-xs font-bold px-4"
                  >
                    Save Changes
                  </Button>
                </div>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {/* Delete Product Confirmation Modal */}
      <ConfirmModal
        isOpen={Boolean(productToDelete)}
        title="Delete Product?"
        message={`Are you sure you want to delete "${productToDelete?.name}" (SKU: ${productToDelete?.sku})? This product will be permanently removed from catalog.`}
        confirmLabel="Delete Product"
        loading={deletingProduct}
        onConfirm={confirmDeleteProduct}
        onCancel={() => setProductToDelete(null)}
      />
    </div>
  );
}

// Sub-component 7: Transaction & Stock Movement History Panel
function TransactionHistoryPanel() {
  const [activeHistoryTab, setActiveHistoryTab] = useState<'movements' | 'ledger'>('movements');

  // Stock movements state
  const [movements, setMovements] = useState<StockMovementItem[]>([]);
  const [movementsLoading, setMovementsLoading] = useState(true);
  const [movementSearch, setMovementSearch] = useState('');
  const [movementType, setMovementType] = useState('ALL');
  const [selectedSupplierId, setSelectedSupplierId] = useState('ALL');

  // Supplier ledger state
  const [ledger, setLedger] = useState<SupplierTransactionRecord[]>([]);
  const [ledgerLoading, setLedgerLoading] = useState(true);
  const [ledgerSearch, setLedgerSearch] = useState('');
  const [ledgerType, setLedgerType] = useState('ALL');
  const [ledgerSupplierId, setLedgerSupplierId] = useState('ALL');

  // Shared auxiliary data
  const [suppliers, setSuppliers] = useState<SupplierItem[]>([]);

  useEffect(() => {
    api.get<SupplierItem[]>('/suppliers').then((data) => setSuppliers(data || [])).catch(() => {});
  }, []);

  const loadMovements = () => {
    setMovementsLoading(true);
    const params = new URLSearchParams();
    if (movementSearch.trim()) params.append('search', movementSearch.trim());
    if (movementType !== 'ALL') params.append('type', movementType);
    if (selectedSupplierId !== 'ALL') params.append('supplierId', selectedSupplierId);

    api.get<{ items: StockMovementItem[]; total: number }>(`/stock-movements?${params.toString()}`)
      .then((res) => {
        setMovements(res.items || []);
        setMovementsLoading(false);
      })
      .catch(() => setMovementsLoading(false));
  };

  const loadLedger = () => {
    setLedgerLoading(true);
    const params = new URLSearchParams();
    if (ledgerSearch.trim()) params.append('search', ledgerSearch.trim());
    if (ledgerType !== 'ALL') params.append('type', ledgerType);
    if (ledgerSupplierId !== 'ALL') params.append('supplierId', ledgerSupplierId);

    api.get<{ items: SupplierTransactionRecord[]; total: number }>(`/suppliers/transactions?${params.toString()}`)
      .then((res) => {
        setLedger(res.items || []);
        setLedgerLoading(false);
      })
      .catch(() => setLedgerLoading(false));
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      if (activeHistoryTab === 'movements') {
        loadMovements();
      } else {
        loadLedger();
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [activeHistoryTab, movementSearch, movementType, selectedSupplierId, ledgerSearch, ledgerType, ledgerSupplierId]);

  // Movement Stats
  const totalReceivedUnits = movements
    .filter((m) => m.type === 'RECEIVE')
    .reduce((sum, m) => sum + Math.abs(m.quantityDelta), 0);
  const totalSoldUnits = movements
    .filter((m) => m.type === 'SALE')
    .reduce((sum, m) => sum + Math.abs(m.quantityDelta), 0);
  const totalReceivedCost = movements
    .filter((m) => m.type === 'RECEIVE')
    .reduce((sum, m) => sum + (Number(m.costPriceAtTime) || 0) * Math.abs(m.quantityDelta), 0);

  // Ledger Stats
  const totalPurchases = ledger
    .filter((t) => t.type === 'PURCHASE')
    .reduce((sum, t) => sum + Number(t.amount), 0);
  const totalPayments = ledger
    .filter((t) => t.type === 'PAYMENT')
    .reduce((sum, t) => sum + Number(t.amount), 0);
  const totalReturnCredits = ledger
    .filter((t) => t.type === 'RETURN_CREDIT')
    .reduce((sum, t) => sum + Number(t.amount), 0);

  return (
    <div className="rounded-2xl border border-border bg-surface p-5 shadow-xs space-y-4">
      {/* Header and Sub-Tab Switcher */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 border-b border-border pb-4">
        <div>
          <h3 className="font-bold text-base text-ink flex items-center gap-2">
            <FiClock className="text-primary h-4 w-4" />
            Stock &amp; Supplier Transaction History
          </h3>
          <p className="text-xs text-muted">
            Complete audit trail of stock intakes, delivery movements, sales deductions, and supplier financial ledger
          </p>
        </div>

        <div className="flex bg-canvas p-1 rounded-xl border border-border gap-1 text-xs font-semibold self-start sm:self-auto">
          <button
            onClick={() => setActiveHistoryTab('movements')}
            className={`px-3 py-1.5 rounded-lg cursor-pointer transition-all flex items-center gap-1.5 ${
              activeHistoryTab === 'movements' ? 'bg-surface text-ink shadow-xs' : 'text-muted hover:text-ink'
            }`}
          >
            <FiBox className="h-3.5 w-3.5" />
            <span>Stock Movements ({movements.length})</span>
          </button>
          <button
            onClick={() => setActiveHistoryTab('ledger')}
            className={`px-3 py-1.5 rounded-lg cursor-pointer transition-all flex items-center gap-1.5 ${
              activeHistoryTab === 'ledger' ? 'bg-surface text-ink shadow-xs' : 'text-muted hover:text-ink'
            }`}
          >
            <FiDollarSign className="h-3.5 w-3.5" />
            <span>Supplier Ledger ({ledger.length})</span>
          </button>
        </div>
      </div>

      {/* Stock Movements View */}
      {activeHistoryTab === 'movements' && (
        <div className="space-y-4">
          {/* Movement KPI summary cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-canvas border border-border rounded-xl p-3">
              <span className="text-[11px] font-medium text-muted block mb-1">Total Units Received</span>
              <div className="flex items-center justify-between">
                <span className="text-lg font-bold text-emerald-600 font-mono">+{totalReceivedUnits}</span>
                <span className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600"><FiArrowDownLeft className="h-4 w-4" /></span>
              </div>
            </div>
            <div className="bg-canvas border border-border rounded-xl p-3">
              <span className="text-[11px] font-medium text-muted block mb-1">Total Units Sold</span>
              <div className="flex items-center justify-between">
                <span className="text-lg font-bold text-sky-600 font-mono">-{totalSoldUnits}</span>
                <span className="p-1.5 rounded-lg bg-sky-500/10 text-sky-600"><FiArrowUpRight className="h-4 w-4" /></span>
              </div>
            </div>
            <div className="bg-canvas border border-border rounded-xl p-3">
              <span className="text-[11px] font-medium text-muted block mb-1">Intake Cost Value</span>
              <div className="flex items-center justify-between">
                <span className="text-lg font-bold text-primary font-mono">
                  Rs {totalReceivedCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
                <span className="p-1.5 rounded-lg bg-primary/10 text-primary"><FiTrendingUp className="h-4 w-4" /></span>
              </div>
            </div>
            <div className="bg-canvas border border-border rounded-xl p-3">
              <span className="text-[11px] font-medium text-muted block mb-1">Total Movement Logs</span>
              <div className="flex items-center justify-between">
                <span className="text-lg font-bold text-ink font-mono">{movements.length}</span>
                <span className="p-1.5 rounded-lg bg-canvas border border-border text-muted"><FiFileText className="h-4 w-4" /></span>
              </div>
            </div>
          </div>

          {/* Filters Bar */}
          <div className="flex flex-wrap items-center justify-between gap-2.5 bg-canvas p-2.5 rounded-xl border border-border">
            <div className="flex flex-wrap items-center gap-2 flex-1">
              <div className="relative min-w-[200px] flex-1">
                <FiSearch className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted h-3.5 w-3.5" />
                <Input
                  placeholder="Search product, barcode, invoice #, supplier..."
                  value={movementSearch}
                  onChange={(e) => setMovementSearch(e.target.value)}
                  className="w-full pl-8 text-xs py-1.5"
                />
              </div>

              <select
                value={movementType}
                onChange={(e) => setMovementType(e.target.value)}
                className="rounded-lg border border-border bg-surface px-2.5 py-1.5 text-xs text-ink"
              >
                <option value="ALL">All Types</option>
                <option value="RECEIVE">RECEIVE (Intake)</option>
                <option value="SALE">SALE (Sold)</option>
                <option value="RETURN">RETURN</option>
                <option value="ADJUSTMENT">ADJUSTMENT</option>
              </select>

              <select
                value={selectedSupplierId}
                onChange={(e) => setSelectedSupplierId(e.target.value)}
                className="rounded-lg border border-border bg-surface px-2.5 py-1.5 text-xs text-ink max-w-[180px] truncate"
              >
                <option value="ALL">All Suppliers</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>

            <Button
              type="button"
              variant="secondary"
              onClick={loadMovements}
              className="text-xs py-1.5 px-3 flex items-center gap-1"
            >
              <FiRefreshCw className={`h-3 w-3 ${movementsLoading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </Button>
          </div>

          {/* Movements Table */}
          {movementsLoading ? (
            <p className="text-xs text-muted p-8 text-center bg-canvas rounded-xl">Loading movements history…</p>
          ) : movements.length === 0 ? (
            <p className="text-xs text-muted p-8 text-center bg-canvas rounded-xl">No stock movements found matching filters.</p>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-border">
              <table className="w-full border-collapse text-left text-xs text-ink">
                <thead>
                  <tr className="bg-canvas border-b border-border text-xs font-bold text-muted uppercase">
                    <th className="px-3.5 py-3">Date / Time</th>
                    <th className="px-3.5 py-3">Product Info</th>
                    <th className="px-3.5 py-3 text-center">Movement Type</th>
                    <th className="px-3.5 py-3 text-right font-mono">Qty Delta</th>
                    <th className="px-3.5 py-3 text-right font-mono">Cost at Time</th>
                    <th className="px-3.5 py-3 text-right font-mono">Total Value</th>
                    <th className="px-3.5 py-3">Supplier / Invoice</th>
                    <th className="px-3.5 py-3">Handled By</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {movements.map((m) => {
                    const isPositive = m.quantityDelta > 0;
                    const unitCost = Number(m.costPriceAtTime) || (m.product ? Number(m.product.sellPrice) : 0);
                    const totalVal = unitCost * Math.abs(m.quantityDelta);

                    let badgeColor = 'bg-surface border-border text-muted';
                    if (m.type === 'RECEIVE') badgeColor = 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700';
                    else if (m.type === 'SALE') badgeColor = 'bg-sky-500/10 border-sky-500/30 text-sky-700';
                    else if (m.type === 'RETURN') badgeColor = 'bg-amber-500/10 border-amber-500/30 text-amber-700';
                    else if (m.type === 'ADJUSTMENT') badgeColor = 'bg-purple-500/10 border-purple-500/30 text-purple-700';

                    return (
                      <tr key={m.id} className="hover:bg-canvas transition-colors">
                        <td className="px-3.5 py-2.5 font-mono text-muted text-[11px] whitespace-nowrap">
                          {new Date(m.createdAt).toLocaleString(undefined, {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </td>
                        <td className="px-3.5 py-2.5">
                          <p className="font-semibold text-ink">{m.product?.name || 'Unknown Product'}</p>
                          <p className="text-[10px] font-mono text-muted">
                            SKU: {m.product?.sku || 'N/A'} {m.product?.barcode ? `| Barcode: ${m.product.barcode}` : ''}
                          </p>
                        </td>
                        <td className="px-3.5 py-2.5 text-center">
                          <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold border ${badgeColor}`}>
                            {m.type}
                          </span>
                        </td>
                        <td className="px-3.5 py-2.5 text-right font-mono font-bold text-xs whitespace-nowrap">
                          <span className={isPositive ? 'text-emerald-600' : 'text-rose-600'}>
                            {isPositive ? `+${m.quantityDelta}` : m.quantityDelta}
                          </span>
                        </td>
                        <td className="px-3.5 py-2.5 text-right font-mono text-muted whitespace-nowrap">
                          {m.costPriceAtTime != null ? `Rs ${Number(m.costPriceAtTime).toFixed(2)}` : '—'}
                        </td>
                        <td className="px-3.5 py-2.5 text-right font-mono font-semibold text-ink whitespace-nowrap">
                          {totalVal > 0 ? `Rs ${totalVal.toFixed(2)}` : '—'}
                        </td>
                        <td className="px-3.5 py-2.5 text-xs">
                          {m.supplier?.name || m.supplierName ? (
                            <p className="font-medium text-ink">{m.supplier?.name || m.supplierName}</p>
                          ) : (
                            <p className="text-muted">—</p>
                          )}
                          {m.invoiceRef && <p className="text-[10px] font-mono text-muted">Inv: {m.invoiceRef}</p>}
                        </td>
                        <td className="px-3.5 py-2.5 text-xs text-muted">
                          {m.employee?.name || 'System'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Supplier Ledger View */}
      {activeHistoryTab === 'ledger' && (
        <div className="space-y-4">
          {/* Ledger KPI summary cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-canvas border border-border rounded-xl p-3">
              <span className="text-[11px] font-medium text-muted block mb-1">Total Purchases (Credit)</span>
              <div className="flex items-center justify-between">
                <span className="text-lg font-bold text-rose-600 font-mono">
                  Rs {totalPurchases.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
                <span className="p-1.5 rounded-lg bg-rose-500/10 text-rose-600"><FiArrowUpRight className="h-4 w-4" /></span>
              </div>
            </div>
            <div className="bg-canvas border border-border rounded-xl p-3">
              <span className="text-[11px] font-medium text-muted block mb-1">Total Payments Settled</span>
              <div className="flex items-center justify-between">
                <span className="text-lg font-bold text-emerald-600 font-mono">
                  Rs {totalPayments.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
                <span className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600"><FiCheckCircle className="h-4 w-4" /></span>
              </div>
            </div>
            <div className="bg-canvas border border-border rounded-xl p-3">
              <span className="text-[11px] font-medium text-muted block mb-1">Total Return Credits</span>
              <div className="flex items-center justify-between">
                <span className="text-lg font-bold text-amber-600 font-mono">
                  Rs {totalReturnCredits.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
                <span className="p-1.5 rounded-lg bg-amber-500/10 text-amber-600"><FiDollarSign className="h-4 w-4" /></span>
              </div>
            </div>
            <div className="bg-canvas border border-border rounded-xl p-3">
              <span className="text-[11px] font-medium text-muted block mb-1">Total Ledger Entries</span>
              <div className="flex items-center justify-between">
                <span className="text-lg font-bold text-ink font-mono">{ledger.length}</span>
                <span className="p-1.5 rounded-lg bg-canvas border border-border text-muted"><FiFileText className="h-4 w-4" /></span>
              </div>
            </div>
          </div>

          {/* Ledger Filters */}
          <div className="flex flex-wrap items-center justify-between gap-2.5 bg-canvas p-2.5 rounded-xl border border-border">
            <div className="flex flex-wrap items-center gap-2 flex-1">
              <div className="relative min-w-[200px] flex-1">
                <FiSearch className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted h-3.5 w-3.5" />
                <Input
                  placeholder="Search supplier, reference, or notes..."
                  value={ledgerSearch}
                  onChange={(e) => setLedgerSearch(e.target.value)}
                  className="w-full pl-8 text-xs py-1.5"
                />
              </div>

              <select
                value={ledgerType}
                onChange={(e) => setLedgerType(e.target.value)}
                className="rounded-lg border border-border bg-surface px-2.5 py-1.5 text-xs text-ink"
              >
                <option value="ALL">All Types</option>
                <option value="PURCHASE">PURCHASE (Credit / Payable)</option>
                <option value="PAYMENT">PAYMENT (Settlement)</option>
                <option value="RETURN_CREDIT">RETURN_CREDIT</option>
              </select>

              <select
                value={ledgerSupplierId}
                onChange={(e) => setLedgerSupplierId(e.target.value)}
                className="rounded-lg border border-border bg-surface px-2.5 py-1.5 text-xs text-ink max-w-[180px] truncate"
              >
                <option value="ALL">All Suppliers</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>

            <Button
              type="button"
              variant="secondary"
              onClick={loadLedger}
              className="text-xs py-1.5 px-3 flex items-center gap-1"
            >
              <FiRefreshCw className={`h-3 w-3 ${ledgerLoading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </Button>
          </div>

          {/* Ledger Table */}
          {ledgerLoading ? (
            <p className="text-xs text-muted p-8 text-center bg-canvas rounded-xl">Loading supplier ledger…</p>
          ) : ledger.length === 0 ? (
            <p className="text-xs text-muted p-8 text-center bg-canvas rounded-xl">No supplier transactions recorded yet.</p>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-border">
              <table className="w-full border-collapse text-left text-xs text-ink">
                <thead>
                  <tr className="bg-canvas border-b border-border text-xs font-bold text-muted uppercase">
                    <th className="px-3.5 py-3">Date / Time</th>
                    <th className="px-3.5 py-3">Supplier</th>
                    <th className="px-3.5 py-3 text-center">Type</th>
                    <th className="px-3.5 py-3 text-right font-mono">Amount (Rs)</th>
                    <th className="px-3.5 py-3">Reference #</th>
                    <th className="px-3.5 py-3">Notes &amp; Description</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {ledger.map((t) => {
                    let badgeColor = 'bg-surface border-border text-muted';
                    let amountColor = 'text-ink';
                    if (t.type === 'PURCHASE') {
                      badgeColor = 'bg-rose-500/10 border-rose-500/30 text-rose-700';
                      amountColor = 'text-rose-600 font-bold';
                    } else if (t.type === 'PAYMENT') {
                      badgeColor = 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700';
                      amountColor = 'text-emerald-600 font-bold';
                    } else if (t.type === 'RETURN_CREDIT') {
                      badgeColor = 'bg-amber-500/10 border-amber-500/30 text-amber-700';
                      amountColor = 'text-amber-600 font-bold';
                    }

                    return (
                      <tr key={t.id} className="hover:bg-canvas transition-colors">
                        <td className="px-3.5 py-2.5 font-mono text-muted text-[11px] whitespace-nowrap">
                          {new Date(t.createdAt).toLocaleString(undefined, {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </td>
                        <td className="px-3.5 py-2.5 font-semibold text-ink">
                          {t.supplier?.name || 'Supplier'}
                        </td>
                        <td className="px-3.5 py-2.5 text-center">
                          <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold border ${badgeColor}`}>
                            {t.type === 'PURCHASE' ? 'PURCHASE (PAYABLE)' : t.type}
                          </span>
                        </td>
                        <td className={`px-3.5 py-2.5 text-right font-mono ${amountColor} whitespace-nowrap`}>
                          Rs {Number(t.amount).toFixed(2)}
                        </td>
                        <td className="px-3.5 py-2.5 font-mono text-xs text-muted whitespace-nowrap">
                          {t.reference || '—'}
                        </td>
                        <td className="px-3.5 py-2.5 text-xs text-muted max-w-md truncate">
                          {t.notes || '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function StockPage() {
  const [activeTab, setActiveTab] = useState<'receiving' | 'products' | 'suppliers' | 'returns' | 'tradeins' | 'labels' | 'history'>('receiving');

  return (
    <div className="flex h-full flex-col min-h-0 bg-canvas p-4 space-y-3 overflow-y-auto">
      {/* Top Header & Tab Navigation */}
      <div className="flex items-center justify-between border-b border-border bg-surface p-4 rounded-2xl shadow-xs">
        <div>
          <h2 className="text-lg font-bold text-ink">Inventory, Suppliers &amp; Stock Operations</h2>
          <p className="text-xs text-muted">Manage stock intake, 50+ categories, wholesale/business pricing, suppliers, and transaction history</p>
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
            onClick={() => setActiveTab('products')}
            className={`px-3 py-1.5 rounded-lg cursor-pointer transition-all ${
              activeTab === 'products' ? 'bg-surface text-ink shadow-xs' : 'text-muted hover:text-ink'
            }`}
          >
            Product List
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
            onClick={() => setActiveTab('history')}
            className={`px-3 py-1.5 rounded-lg cursor-pointer transition-all ${
              activeTab === 'history' ? 'bg-surface text-ink shadow-xs' : 'text-muted hover:text-ink'
            }`}
          >
            Transaction History
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
      {activeTab === 'products' && <ProductListPanel />}
      {activeTab === 'suppliers' && <SupplierManagementPanel />}
      {activeTab === 'history' && <TransactionHistoryPanel />}
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
