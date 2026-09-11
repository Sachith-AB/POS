import { useEffect, useRef, useState } from 'react';
import { useAppDispatch, useAppSelector } from '../app/hooks';
import { api } from '../lib/api';
import { Input } from '../components/Input';
import { Button } from '../components/Button';
import { ConfirmModal } from '../components/ConfirmModal';
import { toast } from 'react-toastify';
import type { Product } from '../features/products/productsSlice';
import { printHtmlViaIframe, generateProductLabelsHtml, type ProductLabelItem } from '../lib/printUtils';
import {
  FiSearch,
  FiEdit2,
  FiTrash2,
  FiAlertTriangle,
  FiBox,
  FiRefreshCw,
  FiPrinter,
  FiDollarSign,
  FiArrowDownLeft,
  FiArrowUpRight,
  FiClock,
  FiFileText,
  FiFilter,
  FiTrendingUp,
  FiCheckCircle,
  FiUser,
  FiX,
  FiPhone,
  FiMail,
  FiMapPin,
  FiRotateCcw,
  FiPlus,
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
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showPayModal, setShowPayModal] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<SupplierItem | null>(null);

  // Profile Drawer / Modal state
  const [viewingProfileId, setViewingProfileId] = useState<string | null>(null);
  const [profileSupplier, setProfileSupplier] = useState<any | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [profileTab, setProfileTab] = useState<'returns' | 'ledger' | 'intakes'>('returns');

  // Return from profile state
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [returnSupplierId, setReturnSupplierId] = useState('');
  const [returnProductId, setReturnProductId] = useState('');
  const [returnQuantity, setReturnQuantity] = useState('1');
  const [returnReason, setReturnReason] = useState<'DEFECTIVE' | 'DAMAGED' | 'WRONG_ITEM' | 'OTHER'>('DEFECTIVE');
  const [returnCreditAmount, setReturnCreditAmount] = useState('');
  const [returnNotes, setReturnNotes] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [savingReturn, setSavingReturn] = useState(false);

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

  const loadProducts = () => {
    api.get<Product[]>('/products').then((data) => setProducts(data || [])).catch(() => {});
  };

  const loadSupplierProfile = async (id: string) => {
    setLoadingProfile(true);
    try {
      const data = await api.get<any>(`/suppliers/${id}`);
      setProfileSupplier(data);
    } catch (err: any) {
      toast.error('Failed to load supplier profile');
    } finally {
      setLoadingProfile(false);
    }
  };

  useEffect(() => {
    loadSuppliers();
    loadProducts();
  }, []);

  useEffect(() => {
    if (viewingProfileId) {
      loadSupplierProfile(viewingProfileId);
    } else {
      setProfileSupplier(null);
    }
  }, [viewingProfileId]);

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
      if (viewingProfileId === editingSupplier.id) {
        loadSupplierProfile(editingSupplier.id);
      }
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
      if (viewingProfileId === supplierToDelete.id) {
        setViewingProfileId(null);
      }
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
      if (viewingProfileId === selectedSupplier.id) {
        loadSupplierProfile(selectedSupplier.id);
      }
      toast.success('Payment recorded successfully');
    } catch (err: any) {
      toast.error(err.message || 'Failed to record payment');
    }
  }

  function openReturnModalForSupplier(suppId: string) {
    setReturnSupplierId(suppId);
    setReturnProductId('');
    setReturnQuantity('1');
    setReturnReason('DEFECTIVE');
    setReturnCreditAmount('');
    setReturnNotes('');
    setShowReturnModal(true);
  }

  function handleReturnProductChange(pId: string, qtyStr: string) {
    setReturnProductId(pId);
    const prod = products.find((p) => p.id === pId);
    const q = parseInt(qtyStr) || 1;
    if (prod) {
      setReturnCreditAmount((Number(prod.costPrice) * q).toFixed(2));
    }
  }

  function handleReturnQuantityChange(qtyStr: string) {
    setReturnQuantity(qtyStr);
    const prod = products.find((p) => p.id === returnProductId);
    const q = parseInt(qtyStr) || 1;
    if (prod) {
      setReturnCreditAmount((Number(prod.costPrice) * q).toFixed(2));
    }
  }

  async function handleProcessReturn(e: React.FormEvent) {
    e.preventDefault();
    if (!returnSupplierId || !returnProductId) return;
    setSavingReturn(true);
    try {
      await api.post('/supplier-returns', {
        supplierId: returnSupplierId,
        productId: returnProductId,
        quantity: parseInt(returnQuantity) || 1,
        reason: returnReason,
        refundOrCreditAmount: returnCreditAmount ? parseFloat(returnCreditAmount) : undefined,
        notes: returnNotes || undefined,
      });
      setShowReturnModal(false);
      loadSuppliers();
      if (viewingProfileId === returnSupplierId) {
        loadSupplierProfile(returnSupplierId);
      }
      toast.success('Return processed and credit reflected successfully');
    } catch (err: any) {
      toast.error(err.message || 'Failed to process return');
    } finally {
      setSavingReturn(false);
    }
  }

  // Filtered suppliers
  const filteredSuppliers = suppliers.filter((s) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      s.name.toLowerCase().includes(q) ||
      (s.phone && s.phone.toLowerCase().includes(q)) ||
      (s.email && s.email.toLowerCase().includes(q))
    );
  });

  // KPI calculations
  const totalSuppliersCount = suppliers.length;
  const totalCreditBalance = suppliers.reduce((sum, s) => sum + Number(s.outstandingBalance || 0), 0);
  const totalPurchasesValue = suppliers.reduce((sum, s) => sum + Number(s.totalPayable || 0), 0);
  const totalPaidValue = suppliers.reduce((sum, s) => sum + Number(s.paidAmount || 0), 0);

  // Profile return statistics
  const profileReturnsCount = profileSupplier?.returns?.length || 0;
  const profileTotalReturnCredit = (profileSupplier?.returns || []).reduce(
    (sum: number, r: any) => sum + Number(r.refundOrCreditAmount ?? (Number(r.product?.costPrice || 0) * r.quantity)),
    0
  );

  return (
    <div className="space-y-5">
      {/* Top Header & Action */}
      <div className="rounded-2xl border border-border bg-surface p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
          <div>
            <h3 className="font-bold text-base text-ink flex items-center gap-2">
              <span>Supplier Tracking &amp; Credit Balances</span>
              <span className="text-xs bg-brand/10 text-brand font-semibold px-2 py-0.5 rounded-full">
                {totalSuppliersCount} Suppliers
              </span>
            </h3>
            <p className="text-xs text-muted">
              Track credit purchases, outstanding balances, return credit slips, and complete supplier profiles
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={() => setShowAddModal(true)} className="text-xs font-bold flex items-center gap-1.5">
              <FiPlus className="w-3.5 h-3.5" />
              <span>Add Supplier</span>
            </Button>
          </div>
        </div>

        {/* KPI Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
          <div className="p-3.5 rounded-xl bg-canvas border border-border flex items-center justify-between">
            <div>
              <div className="text-[11px] text-muted font-medium">Total Suppliers</div>
              <div className="text-lg font-bold text-ink mt-0.5">{totalSuppliersCount}</div>
            </div>
            <div className="h-9 w-9 rounded-lg bg-surface border border-border flex items-center justify-center text-muted">
              <FiUser className="w-4 h-4" />
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-rose-500/5 border border-rose-500/20 flex items-center justify-between">
            <div>
              <div className="text-[11px] text-rose-600 dark:text-rose-400 font-semibold uppercase tracking-wider">
                Credit Balance (Payable)
              </div>
              <div className="text-lg font-bold font-mono text-rose-600 dark:text-rose-400 mt-0.5">
                Rs {totalCreditBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>
            <div className="h-9 w-9 rounded-lg bg-rose-500/10 flex items-center justify-center text-rose-600">
              <FiDollarSign className="w-4 h-4" />
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-canvas border border-border flex items-center justify-between">
            <div>
              <div className="text-[11px] text-muted font-medium">Total Purchased</div>
              <div className="text-lg font-bold font-mono text-ink mt-0.5">
                Rs {totalPurchasesValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>
            <div className="h-9 w-9 rounded-lg bg-surface border border-border flex items-center justify-center text-muted">
              <FiTrendingUp className="w-4 h-4" />
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-emerald-500/5 border border-emerald-500/20 flex items-center justify-between">
            <div>
              <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold uppercase tracking-wider">
                Total Paid
              </div>
              <div className="text-lg font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-0.5">
                Rs {totalPaidValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>
            <div className="h-9 w-9 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-600">
              <FiCheckCircle className="w-4 h-4" />
            </div>
          </div>
        </div>

        {/* Search Bar */}
        <div className="mb-4">
          <div className="relative max-w-sm">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-muted text-xs" />
            <input
              type="text"
              placeholder="Search suppliers by name, phone, or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-border bg-canvas text-ink placeholder:text-muted focus:border-brand focus:outline-hidden"
            />
          </div>
        </div>

        {/* Suppliers Table */}
        {loading ? (
          <p className="text-xs text-muted p-8 text-center">Loading suppliers…</p>
        ) : filteredSuppliers.length === 0 ? (
          <p className="text-xs text-muted p-8 text-center bg-canvas rounded-xl">
            {searchQuery ? 'No suppliers match your search.' : 'No suppliers recorded yet.'}
          </p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full border-collapse text-left text-xs text-ink">
              <thead>
                <tr className="bg-canvas border-b border-border text-xs font-bold text-muted uppercase">
                  <th className="px-4 py-3">Supplier Name &amp; Profile</th>
                  <th className="px-4 py-3">Contact Details</th>
                  <th className="px-4 py-3 font-mono">Total Purchased</th>
                  <th className="px-4 py-3 font-mono">Paid Amount</th>
                  <th className="px-4 py-3 font-mono text-rose-600">Credit Balance (Payable)</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredSuppliers.map((s) => (
                  <tr key={s.id} className="hover:bg-canvas/70 transition-colors">
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => {
                          setViewingProfileId(s.id);
                          setProfileTab('returns');
                        }}
                        className="text-left font-bold text-ink hover:text-brand flex items-center gap-1.5 group cursor-pointer"
                        title="Click to view Supplier Profile & Return Records"
                      >
                        <span className="h-7 w-7 rounded-lg bg-brand/10 text-brand flex items-center justify-center font-bold text-xs group-hover:bg-brand group-hover:text-white transition-all">
                          {s.name.charAt(0).toUpperCase()}
                        </span>
                        <div>
                          <div className="group-hover:underline">{s.name}</div>
                          {s.address ? (
                            <div className="text-[11px] font-normal text-muted truncate max-w-[180px]">
                              {s.address}
                            </div>
                          ) : null}
                        </div>
                      </button>
                    </td>
                    <td className="px-4 py-3 text-muted">
                      {s.phone ? <div className="text-ink font-medium">{s.phone}</div> : <div className="text-muted">—</div>}
                      {s.email ? <div className="text-[11px] text-muted">{s.email}</div> : null}
                    </td>
                    <td className="px-4 py-3 font-mono">Rs {Number(s.totalPayable).toFixed(2)}</td>
                    <td className="px-4 py-3 font-mono text-emerald-600">Rs {Number(s.paidAmount).toFixed(2)}</td>
                    <td className="px-4 py-3 font-mono font-bold text-rose-600">
                      <span className="bg-rose-500/10 text-rose-600 px-2 py-0.5 rounded">
                        Rs {Number(s.outstandingBalance).toFixed(2)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          onClick={() => {
                            setViewingProfileId(s.id);
                            setProfileTab('returns');
                          }}
                          variant="secondary"
                          className="py-1 px-2.5 text-xs font-semibold flex items-center gap-1 text-brand border-brand/20 hover:bg-brand/10"
                          title="View supplier profile, return records, and ledger"
                        >
                          <FiUser className="h-3 w-3" />
                          <span>Profile</span>
                        </Button>
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
      </div>

      {/* SUPPLIER PROFILE MODAL / DRAWER */}
      {viewingProfileId ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 sm:p-5 backdrop-blur-xs">
          <div className="w-full max-w-4xl max-h-[90vh] flex flex-col rounded-2xl border border-border bg-surface shadow-2xl overflow-hidden">
            {/* Profile Modal Header */}
            <div className="p-4 sm:p-5 border-b border-border bg-canvas/60 flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="h-11 w-11 rounded-xl bg-brand/10 text-brand flex items-center justify-center font-bold text-base shrink-0">
                  {profileSupplier ? profileSupplier.name.charAt(0).toUpperCase() : <FiUser className="w-5 h-5" />}
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-lg font-bold text-ink">
                      {profileSupplier?.name || 'Loading Supplier Profile...'}
                    </h2>
                    <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-surface border border-border text-muted">
                      Supplier Profile
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-muted mt-1">
                    {profileSupplier?.phone && (
                      <span className="flex items-center gap-1 text-brand font-medium">
                        <FiPhone className="w-3.5 h-3.5" /> {profileSupplier.phone}
                      </span>
                    )}
                    {profileSupplier?.email && (
                      <span className="flex items-center gap-1 text-muted">
                        <FiMail className="w-3.5 h-3.5" /> {profileSupplier.email}
                      </span>
                    )}
                    {profileSupplier?.address && (
                      <span className="flex items-center gap-1 text-muted">
                        <FiMapPin className="w-3.5 h-3.5" /> {profileSupplier.address}
                      </span>
                    )}
                  </div>
                  {profileSupplier?.notes && (
                    <p className="text-[11px] text-muted italic mt-1 bg-surface/50 border border-border/50 px-2 py-0.5 rounded">
                      Note: {profileSupplier.notes}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                {profileSupplier && (
                  <>
                    <Button
                      onClick={() => openReturnModalForSupplier(profileSupplier.id)}
                      variant="secondary"
                      className="text-xs font-bold text-rose-600 border-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/30 flex items-center gap-1 py-1 px-2.5"
                    >
                      <FiRotateCcw className="w-3 h-3" />
                      <span>+ Process Return</span>
                    </Button>
                    <Button
                      onClick={() => {
                        setSelectedSupplier(profileSupplier);
                        setPayAmount('');
                        setPayRef(`PAY-${Date.now().toString().slice(-6)}-${Math.floor(1000 + Math.random() * 9000)}`);
                        setShowPayModal(true);
                      }}
                      className="text-xs font-bold flex items-center gap-1 py-1 px-2.5"
                    >
                      <FiDollarSign className="w-3 h-3" />
                      <span>Record Payment</span>
                    </Button>
                  </>
                )}
                <button
                  type="button"
                  onClick={() => setViewingProfileId(null)}
                  className="p-1.5 rounded-lg text-muted hover:text-ink hover:bg-canvas transition-colors"
                >
                  <FiX className="w-5 h-5" />
                </button>
              </div>
            </div>

            {loadingProfile || !profileSupplier ? (
              <div className="p-12 text-center text-muted text-xs">Loading complete supplier profile data...</div>
            ) : (
              <div className="flex-1 flex flex-col overflow-hidden">
                {/* Profile Financial Statistics Bar */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-4 bg-surface border-b border-border">
                  <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20">
                    <div className="text-[10px] font-bold text-rose-600 uppercase tracking-wider">
                      Credit Amount (Payable)
                    </div>
                    <div className="text-base sm:text-lg font-bold font-mono text-rose-600 mt-0.5">
                      Rs {Number(profileSupplier.outstandingBalance).toFixed(2)}
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-canvas border border-border">
                    <div className="text-[10px] font-medium text-muted uppercase">Total Purchased</div>
                    <div className="text-sm sm:text-base font-bold font-mono text-ink mt-0.5">
                      Rs {Number(profileSupplier.totalPayable).toFixed(2)}
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-canvas border border-border">
                    <div className="text-[10px] font-medium text-muted uppercase">Total Paid</div>
                    <div className="text-sm sm:text-base font-bold font-mono text-emerald-600 mt-0.5">
                      Rs {Number(profileSupplier.paidAmount).toFixed(2)}
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-canvas border border-border">
                    <div className="text-[10px] font-medium text-muted uppercase">Return Claims</div>
                    <div className="text-sm sm:text-base font-bold text-ink mt-0.5 flex items-center justify-between">
                      <span>{profileReturnsCount} Returns</span>
                      <span className="text-xs font-mono text-emerald-600">
                        Rs {profileTotalReturnCredit.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Profile Navigation Tabs */}
                <div className="flex border-b border-border bg-canvas px-4 gap-1 text-xs font-medium">
                  <button
                    type="button"
                    onClick={() => setProfileTab('returns')}
                    className={`py-2.5 px-3 border-b-2 font-bold cursor-pointer transition-all flex items-center gap-1.5 ${
                      profileTab === 'returns'
                        ? 'border-brand text-brand bg-surface'
                        : 'border-transparent text-muted hover:text-ink'
                    }`}
                  >
                    <FiRotateCcw className="w-3.5 h-3.5" />
                    <span>Return Records</span>
                    <span className="ml-1 text-[10px] px-1.5 py-0.2 rounded-full bg-brand/10 text-brand">
                      {profileReturnsCount}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setProfileTab('ledger')}
                    className={`py-2.5 px-3 border-b-2 font-bold cursor-pointer transition-all flex items-center gap-1.5 ${
                      profileTab === 'ledger'
                        ? 'border-brand text-brand bg-surface'
                        : 'border-transparent text-muted hover:text-ink'
                    }`}
                  >
                    <FiFileText className="w-3.5 h-3.5" />
                    <span>Transactions &amp; Ledger</span>
                    <span className="ml-1 text-[10px] px-1.5 py-0.2 rounded-full bg-muted/20 text-muted">
                      {profileSupplier.transactions?.length || 0}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setProfileTab('intakes')}
                    className={`py-2.5 px-3 border-b-2 font-bold cursor-pointer transition-all flex items-center gap-1.5 ${
                      profileTab === 'intakes'
                        ? 'border-brand text-brand bg-surface'
                        : 'border-transparent text-muted hover:text-ink'
                    }`}
                  >
                    <FiBox className="w-3.5 h-3.5" />
                    <span>Stock Received</span>
                    <span className="ml-1 text-[10px] px-1.5 py-0.2 rounded-full bg-muted/20 text-muted">
                      {profileSupplier.stockMovements?.length || 0}
                    </span>
                  </button>
                </div>

                {/* Profile Tab Contents */}
                <div className="p-4 flex-1 overflow-y-auto">
                  {/* TAB 1: RETURN RECORDS */}
                  {profileTab === 'returns' && (
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <div>
                          <h4 className="font-bold text-xs text-ink uppercase tracking-wider">
                            Supplier Return Records &amp; Credit Slips
                          </h4>
                          <p className="text-[11px] text-muted">
                            Defective or damaged items returned to {profileSupplier.name} with auto-credited balances
                          </p>
                        </div>
                        <Button
                          onClick={() => openReturnModalForSupplier(profileSupplier.id)}
                          className="text-xs font-bold py-1 px-3"
                        >
                          + Return Item
                        </Button>
                      </div>

                      {profileSupplier.returns?.length === 0 ? (
                        <div className="p-8 text-center bg-canvas rounded-xl border border-border">
                          <p className="text-xs text-muted mb-2">
                            No return records found for this supplier.
                          </p>
                          <Button
                            onClick={() => openReturnModalForSupplier(profileSupplier.id)}
                            variant="secondary"
                            className="text-xs font-bold"
                          >
                            + Process Return to {profileSupplier.name}
                          </Button>
                        </div>
                      ) : (
                        <div className="overflow-x-auto rounded-xl border border-border">
                          <table className="w-full border-collapse text-left text-xs text-ink">
                            <thead>
                              <tr className="bg-canvas border-b border-border font-bold text-muted uppercase text-[10px]">
                                <th className="px-3.5 py-2.5">Date</th>
                                <th className="px-3.5 py-2.5">Product</th>
                                <th className="px-3.5 py-2.5">Qty Deducted</th>
                                <th className="px-3.5 py-2.5">Reason</th>
                                <th className="px-3.5 py-2.5 font-mono text-emerald-600">Credit Amount</th>
                                <th className="px-3.5 py-2.5">Notes</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                              {profileSupplier.returns.map((ret: any) => {
                                const creditVal = Number(
                                  ret.refundOrCreditAmount ?? (Number(ret.product?.costPrice || 0) * ret.quantity)
                                );
                                return (
                                  <tr key={ret.id} className="hover:bg-canvas">
                                    <td className="px-3.5 py-2.5 text-muted whitespace-nowrap">
                                      {new Date(ret.createdAt).toLocaleDateString()}
                                    </td>
                                    <td className="px-3.5 py-2.5 font-semibold text-ink">
                                      <div>{ret.product?.name || 'Product'}</div>
                                      {ret.product?.sku ? (
                                        <div className="text-[10px] text-muted font-mono font-normal">
                                          SKU: {ret.product.sku}
                                        </div>
                                      ) : null}
                                    </td>
                                    <td className="px-3.5 py-2.5 font-bold">{ret.quantity}</td>
                                    <td className="px-3.5 py-2.5">
                                      <span className="bg-rose-500/10 text-rose-600 px-2 py-0.5 rounded font-bold text-[10px]">
                                        {ret.reason}
                                      </span>
                                    </td>
                                    <td className="px-3.5 py-2.5 font-mono font-bold text-emerald-600 whitespace-nowrap">
                                      Rs {creditVal.toFixed(2)}
                                    </td>
                                    <td className="px-3.5 py-2.5 text-muted max-w-[200px] truncate">
                                      {ret.notes || '—'}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                            <tfoot>
                              <tr className="bg-canvas border-t border-border font-bold text-xs">
                                <td colSpan={4} className="px-3.5 py-2.5 text-right text-muted">
                                  Total Return Credit Claimed:
                                </td>
                                <td className="px-3.5 py-2.5 font-mono text-emerald-600 whitespace-nowrap">
                                  Rs {profileTotalReturnCredit.toFixed(2)}
                                </td>
                                <td></td>
                              </tr>
                            </tfoot>
                          </table>
                        </div>
                      )}
                    </div>
                  )}

                  {/* TAB 2: TRANSACTIONS & LEDGER */}
                  {profileTab === 'ledger' && (
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <h4 className="font-bold text-xs text-ink uppercase tracking-wider">
                          Financial Transactions &amp; Payment Ledger
                        </h4>
                        <span className="text-xs text-muted">
                          Balance: <strong className="text-rose-600 font-mono">Rs {Number(profileSupplier.outstandingBalance).toFixed(2)}</strong>
                        </span>
                      </div>

                      {profileSupplier.transactions?.length === 0 ? (
                        <p className="text-xs text-muted p-8 text-center bg-canvas rounded-xl">
                          No transactions recorded yet.
                        </p>
                      ) : (
                        <div className="overflow-x-auto rounded-xl border border-border">
                          <table className="w-full border-collapse text-left text-xs text-ink">
                            <thead>
                              <tr className="bg-canvas border-b border-border font-bold text-muted uppercase text-[10px]">
                                <th className="px-3.5 py-2.5">Date</th>
                                <th className="px-3.5 py-2.5">Type</th>
                                <th className="px-3.5 py-2.5">Reference</th>
                                <th className="px-3.5 py-2.5 font-mono">Amount</th>
                                <th className="px-3.5 py-2.5">Description / Notes</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                              {profileSupplier.transactions.map((t: any) => (
                                <tr key={t.id} className="hover:bg-canvas">
                                  <td className="px-3.5 py-2.5 text-muted whitespace-nowrap">
                                    {new Date(t.createdAt).toLocaleDateString()}
                                  </td>
                                  <td className="px-3.5 py-2.5">
                                    <span
                                      className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                                        t.type === 'PURCHASE'
                                          ? 'bg-blue-500/10 text-blue-600'
                                          : t.type === 'PAYMENT'
                                          ? 'bg-emerald-500/10 text-emerald-600'
                                          : 'bg-purple-500/10 text-purple-600'
                                      }`}
                                    >
                                      {t.type}
                                    </span>
                                  </td>
                                  <td className="px-3.5 py-2.5 font-mono text-muted">{t.reference || '—'}</td>
                                  <td
                                    className={`px-3.5 py-2.5 font-mono font-bold ${
                                      t.type === 'PAYMENT' || t.type === 'RETURN_CREDIT'
                                        ? 'text-emerald-600'
                                        : 'text-rose-600'
                                    }`}
                                  >
                                    {t.type === 'PAYMENT' || t.type === 'RETURN_CREDIT' ? '-' : '+'}Rs{' '}
                                    {Number(t.amount).toFixed(2)}
                                  </td>
                                  <td className="px-3.5 py-2.5 text-muted">{t.notes || '—'}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}

                  {/* TAB 3: STOCK INTAKES */}
                  {profileTab === 'intakes' && (
                    <div className="space-y-3">
                      <h4 className="font-bold text-xs text-ink uppercase tracking-wider">
                        Recent Stock Intake Deliveries
                      </h4>

                      {profileSupplier.stockMovements?.length === 0 ? (
                        <p className="text-xs text-muted p-8 text-center bg-canvas rounded-xl">
                          No stock movements recorded for this supplier.
                        </p>
                      ) : (
                        <div className="overflow-x-auto rounded-xl border border-border">
                          <table className="w-full border-collapse text-left text-xs text-ink">
                            <thead>
                              <tr className="bg-canvas border-b border-border font-bold text-muted uppercase text-[10px]">
                                <th className="px-3.5 py-2.5">Date</th>
                                <th className="px-3.5 py-2.5">Product</th>
                                <th className="px-3.5 py-2.5">Quantity</th>
                                <th className="px-3.5 py-2.5">Invoice / Movement Ref</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                              {profileSupplier.stockMovements.map((sm: any) => (
                                <tr key={sm.id} className="hover:bg-canvas">
                                  <td className="px-3.5 py-2.5 text-muted whitespace-nowrap">
                                    {new Date(sm.createdAt).toLocaleDateString()}
                                  </td>
                                  <td className="px-3.5 py-2.5 font-semibold text-ink">
                                    {sm.product?.name || 'Item'}
                                  </td>
                                  <td className="px-3.5 py-2.5 font-bold font-mono">
                                    {sm.quantityDelta > 0 ? `+${sm.quantityDelta}` : sm.quantityDelta}
                                  </td>
                                  <td className="px-3.5 py-2.5 font-mono text-muted">{sm.invoiceRef || '—'}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      ) : null}

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
              Supplier: <strong>{selectedSupplier.name}</strong> | Credit Payable: Rs {Number(selectedSupplier.outstandingBalance).toFixed(2)}
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

      {/* Return Modal (usable from supplier profile as well) */}
      {showReturnModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl border border-border bg-surface p-5 shadow-xl">
            <h3 className="font-bold text-base text-ink mb-1">Return Items to Supplier</h3>
            <p className="text-xs text-muted mb-3">
              Inventory will be automatically deducted, and return credit will reduce supplier payable.
            </p>

            <form onSubmit={handleProcessReturn} className="space-y-3 text-xs">
              <div>
                <label className="text-muted block mb-0.5">Supplier *</label>
                <select
                  required
                  value={returnSupplierId}
                  onChange={(e) => setReturnSupplierId(e.target.value)}
                  className="w-full rounded border border-border bg-canvas px-2.5 py-1.5"
                >
                  <option value="">-- Choose Supplier --</option>
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-muted block mb-0.5">Product to Return *</label>
                <select
                  required
                  value={returnProductId}
                  onChange={(e) => handleReturnProductChange(e.target.value, returnQuantity)}
                  className="w-full rounded border border-border bg-canvas px-2.5 py-1.5"
                >
                  <option value="">-- Choose Product --</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} (In Stock: {p.quantity}, Cost: Rs {Number(p.costPrice).toFixed(2)})
                    </option>
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
                    value={returnQuantity}
                    onChange={(e) => handleReturnQuantityChange(e.target.value)}
                    className="w-full"
                  />
                </div>
                <div>
                  <label className="text-muted block mb-0.5">Return Reason</label>
                  <select
                    value={returnReason}
                    onChange={(e) => setReturnReason(e.target.value as any)}
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
                <div className="flex justify-between items-center mb-0.5">
                  <label className="text-muted block font-medium">Refund / Credit Claim (Rs) *</label>
                  <span className="text-[10px] text-muted">Auto-suggested from cost price</span>
                </div>
                <Input
                  type="number"
                  min={0}
                  step="any"
                  placeholder="0.00"
                  value={returnCreditAmount}
                  onChange={(e) => setReturnCreditAmount(e.target.value)}
                  className="w-full font-mono text-emerald-600 font-bold"
                />
              </div>

              <div>
                <label className="text-muted block mb-0.5">Notes / Defect Details</label>
                <Input
                  placeholder="e.g. Broken screen out of box"
                  value={returnNotes}
                  onChange={(e) => setReturnNotes(e.target.value)}
                  className="w-full"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-border">
                <Button
                  type="button"
                  onClick={() => setShowReturnModal(false)}
                  variant="secondary"
                  disabled={savingReturn}
                >
                  Cancel
                </Button>
                <Button type="submit" className="font-bold" disabled={savingReturn}>
                  {savingReturn ? 'Processing…' : 'Deduct Stock & Process Return'}
                </Button>
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
  const [savingReturn, setSavingReturn] = useState(false);

  const loadReturns = () => {
    api.get<any[]>('/supplier-returns').then((data) => setReturns(data || [])).catch(() => {});
    api.get<SupplierItem[]>('/suppliers').then((data) => setSuppliers(data || [])).catch(() => {});
    api.get<Product[]>('/products').then((data) => setProducts(data || [])).catch(() => {});
  };

  useEffect(() => {
    loadReturns();
  }, []);

  function handleProductSelect(pId: string, qStr: string) {
    setProductId(pId);
    const prod = products.find((p) => p.id === pId);
    const q = parseInt(qStr) || 1;
    if (prod) {
      setRefundCredit((Number(prod.costPrice) * q).toFixed(2));
    }
  }

  function handleQuantitySelect(qStr: string) {
    setQuantity(qStr);
    const prod = products.find((p) => p.id === productId);
    const q = parseInt(qStr) || 1;
    if (prod) {
      setRefundCredit((Number(prod.costPrice) * q).toFixed(2));
    }
  }

  async function handleCreateReturn(e: React.FormEvent) {
    e.preventDefault();
    if (!supplierId || !productId) return;
    setSavingReturn(true);

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
      toast.success('Return processed and credit amount updated successfully');
    } catch (err: any) {
      toast.error(err.message || 'Failed to process return');
    } finally {
      setSavingReturn(false);
    }
  }

  // Summary figures
  const totalReturnsCount = returns.length;
  const totalCreditAmount = returns.reduce(
    (sum, r) => sum + Number(r.refundOrCreditAmount ?? (Number(r.product?.costPrice || 0) * r.quantity)),
    0
  );
  const totalUnitsDeducted = returns.reduce((sum, r) => sum + Number(r.quantity || 0), 0);

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-border bg-surface p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
          <div>
            <h3 className="font-bold text-base text-ink flex items-center gap-2">
              <span>Supplier Returns &amp; Credit Slips</span>
              <span className="text-xs bg-rose-500/10 text-rose-600 font-semibold px-2 py-0.5 rounded-full">
                {totalReturnsCount} Returns
              </span>
            </h3>
            <p className="text-xs text-muted">
              Return defective, damaged, or wrong items to suppliers with auto-inventory deduction and supplier payable credits
            </p>
          </div>
          <Button onClick={() => setShowModal(true)} className="text-xs font-bold flex items-center gap-1.5">
            <FiRotateCcw className="w-3.5 h-3.5" />
            <span>+ Process Return to Supplier</span>
          </Button>
        </div>

        {/* Summary KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
          <div className="p-3.5 rounded-xl bg-canvas border border-border flex items-center justify-between">
            <div>
              <div className="text-[11px] text-muted font-medium uppercase tracking-wider">
                Total Returns
              </div>
              <div className="text-lg font-bold text-ink mt-0.5">{totalReturnsCount} Records</div>
            </div>
            <div className="h-9 w-9 rounded-lg bg-surface border border-border flex items-center justify-center text-muted">
              <FiRotateCcw className="w-4 h-4" />
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-emerald-500/5 border border-emerald-500/20 flex items-center justify-between">
            <div>
              <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold uppercase tracking-wider">
                Total Return Credit Claimed
              </div>
              <div className="text-lg font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-0.5">
                Rs {totalCreditAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>
            <div className="h-9 w-9 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-600">
              <FiDollarSign className="w-4 h-4" />
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-canvas border border-border flex items-center justify-between">
            <div>
              <div className="text-[11px] text-muted font-medium uppercase tracking-wider">
                Total Units Deducted
              </div>
              <div className="text-lg font-bold font-mono text-ink mt-0.5">
                {totalUnitsDeducted} Items
              </div>
            </div>
            <div className="h-9 w-9 rounded-lg bg-surface border border-border flex items-center justify-center text-muted">
              <FiBox className="w-4 h-4" />
            </div>
          </div>
        </div>

        {returns.length === 0 ? (
          <p className="text-xs text-muted p-8 text-center bg-canvas rounded-xl">No supplier returns recorded yet.</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full border-collapse text-left text-xs text-ink">
              <thead>
                <tr className="bg-canvas border-b border-border font-bold text-muted uppercase text-[10px]">
                  <th className="px-4 py-3">Product Name &amp; SKU</th>
                  <th className="px-4 py-3">Supplier</th>
                  <th className="px-4 py-3">Qty Deducted</th>
                  <th className="px-4 py-3">Reason</th>
                  <th className="px-4 py-3 font-mono text-emerald-600">Credit Amount</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {returns.map((r) => {
                  const creditVal = Number(
                    r.refundOrCreditAmount ?? (Number(r.product?.costPrice || 0) * r.quantity)
                  );
                  return (
                    <tr key={r.id} className="hover:bg-canvas">
                      <td className="px-4 py-3 font-semibold text-ink">
                        <div>{r.product?.name}</div>
                        {r.product?.sku ? (
                          <div className="text-[10px] font-mono text-muted font-normal">
                            SKU: {r.product.sku}
                          </div>
                        ) : null}
                      </td>
                      <td className="px-4 py-3 text-muted">{r.supplier?.name}</td>
                      <td className="px-4 py-3 font-bold">{r.quantity}</td>
                      <td className="px-4 py-3">
                        <span className="bg-rose-500/10 text-rose-600 px-2 py-0.5 rounded font-bold text-[10px]">
                          {r.reason}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono font-bold text-emerald-600 whitespace-nowrap">
                        Rs {creditVal.toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-muted">{new Date(r.createdAt).toLocaleDateString()}</td>
                      <td className="px-4 py-3 text-muted max-w-[200px] truncate">{r.notes || '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Return Modal */}
        {showModal ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-md rounded-2xl border border-border bg-surface p-5 shadow-xl">
              <h3 className="font-bold text-base text-ink mb-1">Return Items to Supplier</h3>
              <p className="text-xs text-muted mb-3">
                Inventory will be automatically deducted and supplier credit applied.
              </p>

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
                    onChange={(e) => handleProductSelect(e.target.value, quantity)}
                    className="w-full rounded border border-border bg-canvas px-2.5 py-1.5"
                  >
                    <option value="">-- Choose Product --</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} (In Stock: {p.quantity}, Cost: Rs {Number(p.costPrice).toFixed(2)})
                      </option>
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
                      onChange={(e) => handleQuantitySelect(e.target.value)}
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
                  <div className="flex justify-between items-center mb-0.5">
                    <label className="text-muted block font-medium">Refund / Credit Claim (Rs) *</label>
                    <span className="text-[10px] text-muted">Auto-suggested from cost price</span>
                  </div>
                  <Input
                    type="number"
                    min={0}
                    step="any"
                    placeholder="0.00"
                    value={refundCredit}
                    onChange={(e) => setRefundCredit(e.target.value)}
                    className="w-full font-mono text-emerald-600 font-bold"
                  />
                </div>

                <div>
                  <label className="text-muted block mb-0.5">Notes / Defect Details</label>
                  <Input
                    placeholder="e.g. Serial # or reason details"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-border">
                  <Button
                    type="button"
                    onClick={() => setShowModal(false)}
                    variant="secondary"
                    disabled={savingReturn}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" className="font-bold" disabled={savingReturn}>
                    {savingReturn ? 'Processing…' : 'Deduct Stock & Return'}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

// Sub-component 4: Trade-In / Used Device Resale Panel (Q18)
function TradeInManagementPanel() {
  const [tradeIns, setTradeIns] = useState<TradeInItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [searchFilter, setSearchFilter] = useState('');

  // Customers & Customer Devices
  const [customers, setCustomers] = useState<any[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [customerDevices, setCustomerDevices] = useState<any[]>([]);
  const [loadingCustomerDevices, setLoadingCustomerDevices] = useState(false);

  // Form state
  const [deviceInfo, setDeviceInfo] = useState('');
  const [imei, setImei] = useState('');
  const [condition, setCondition] = useState('GOOD');
  const [tradeInValue, setTradeInValue] = useState('');
  const [custName, setCustName] = useState('');
  const [custPhone, setCustPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [savingTradeIn, setSavingTradeIn] = useState(false);

  // Convert to Resale Modal state
  const [showConvertModal, setShowConvertModal] = useState(false);
  const [tradeInToConvert, setTradeInToConvert] = useState<TradeInItem | null>(null);
  const [convertResalePrice, setConvertResalePrice] = useState('');
  const [convertWholesalePrice, setConvertWholesalePrice] = useState('');
  const [convertName, setConvertName] = useState('');
  const [convertCategory, setConvertCategory] = useState('Used Phones');
  const [converting, setConverting] = useState(false);

  const loadTradeIns = () => {
    setLoading(true);
    api.get<TradeInItem[]>('/trade-ins')
      .then((data) => {
        setTradeIns(data || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  const loadCustomers = () => {
    api.get<any>('/customers?limit=100')
      .then((res) => {
        setCustomers(res.items || res || []);
      })
      .catch(() => {});
  };

  useEffect(() => {
    loadTradeIns();
    loadCustomers();
  }, []);

  // When selectedCustomerId changes, fetch their profile to load their registered devices
  useEffect(() => {
    if (!selectedCustomerId) {
      setCustomerDevices([]);
      return;
    }
    setLoadingCustomerDevices(true);
    api.get<any>(`/customers/${selectedCustomerId}`)
      .then((profile) => {
        if (profile) {
          setCustName(profile.name || '');
          setCustPhone(profile.phone || '');
          setCustomerDevices(profile.imeiHistory || []);
        }
      })
      .catch(() => setCustomerDevices([]))
      .finally(() => setLoadingCustomerDevices(false));
  }, [selectedCustomerId]);

  function openIntakeModal() {
    setSelectedCustomerId('');
    setCustomerDevices([]);
    setDeviceInfo('');
    setImei('');
    setCondition('GOOD');
    setTradeInValue('');
    setCustName('');
    setCustPhone('');
    setNotes('');
    setShowModal(true);
  }

  function handleSelectCustomerDevice(devStr: string) {
    if (!devStr) return;
    const [pName, devImei] = devStr.split('|||');
    setDeviceInfo(pName || '');
    setImei(devImei || '');
  }

  async function handleCreateTradeIn(e: React.FormEvent) {
    e.preventDefault();
    if (!deviceInfo.trim() || !tradeInValue) return;
    setSavingTradeIn(true);

    try {
      await api.post('/trade-ins', {
        customerId: selectedCustomerId || undefined,
        deviceInfo: deviceInfo.trim(),
        imei: imei.trim() || undefined,
        condition,
        tradeInValue: parseFloat(tradeInValue),
        customerName: custName.trim() || undefined,
        customerPhone: custPhone.trim() || undefined,
        notes: notes.trim() || undefined,
      });
      setShowModal(false);
      loadTradeIns();
      toast.success('Customer device recorded as trade-in successfully!');
    } catch (err: any) {
      toast.error(err.message || 'Failed to record trade-in device');
    } finally {
      setSavingTradeIn(false);
    }
  }

  function openConvertModal(t: TradeInItem) {
    setTradeInToConvert(t);
    setConvertName(t.deviceInfo);
    setConvertResalePrice((Number(t.tradeInValue) * 1.25).toFixed(2));
    setConvertWholesalePrice('');
    setConvertCategory('Used Phones');
    setShowConvertModal(true);
  }

  async function handleConfirmConvert(e: React.FormEvent) {
    e.preventDefault();
    if (!tradeInToConvert || !convertResalePrice) return;
    setConverting(true);

    try {
      await api.post(`/trade-ins/${tradeInToConvert.id}/convert-to-stock`, {
        name: convertName.trim() || tradeInToConvert.deviceInfo,
        sellPrice: parseFloat(convertResalePrice),
        wholesalePrice: convertWholesalePrice ? parseFloat(convertWholesalePrice) : undefined,
        category: convertCategory,
      });
      setShowConvertModal(false);
      setTradeInToConvert(null);
      loadTradeIns();
      toast.success('Device successfully converted to inventory for resale!');
    } catch (err: any) {
      toast.error(err.message || 'Failed to convert to resale');
    } finally {
      setConverting(false);
    }
  }

  // Filtered trade ins
  const filteredTradeIns = tradeIns.filter((t) => {
    if (!searchFilter.trim()) return true;
    const q = searchFilter.toLowerCase();
    return (
      t.deviceInfo.toLowerCase().includes(q) ||
      (t.imei && t.imei.toLowerCase().includes(q)) ||
      (t.customerName && t.customerName.toLowerCase().includes(q)) ||
      (t.customerPhone && t.customerPhone.toLowerCase().includes(q))
    );
  });

  // KPI Calculations
  const totalCount = tradeIns.length;
  const totalValue = tradeIns.reduce((sum, t) => sum + Number(t.tradeInValue || 0), 0);
  const pendingCount = tradeIns.filter((t) => t.status === 'PENDING').length;
  const inStockCount = tradeIns.filter((t) => t.status === 'IN_STOCK').length;

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-border bg-surface p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
          <div>
            <h3 className="font-bold text-base text-ink flex items-center gap-2">
              <span>Trade-In Devices &amp; Used Device Resale</span>
              <span className="text-xs bg-brand/10 text-brand font-semibold px-2 py-0.5 rounded-full">
                {totalCount} Total Devices
              </span>
            </h3>
            <p className="text-xs text-muted">
              Intake customer devices as trade-ins, track IMEIs, and convert them to resale stock
            </p>
          </div>
          <Button onClick={openIntakeModal} className="text-xs font-bold flex items-center gap-1.5">
            <FiPlus className="w-3.5 h-3.5" />
            <span>+ Intake Customer Device</span>
          </Button>
        </div>

        {/* Summary KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
          <div className="p-3.5 rounded-xl bg-canvas border border-border flex items-center justify-between">
            <div>
              <div className="text-[11px] text-muted font-medium uppercase">Total Trade-Ins</div>
              <div className="text-lg font-bold text-ink mt-0.5">{totalCount} Devices</div>
            </div>
            <div className="h-9 w-9 rounded-lg bg-surface border border-border flex items-center justify-center text-muted">
              <FiRefreshCw className="w-4 h-4" />
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-emerald-500/5 border border-emerald-500/20 flex items-center justify-between">
            <div>
              <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold uppercase">
                Total Trade-In Value
              </div>
              <div className="text-lg font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-0.5">
                Rs {totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>
            <div className="h-9 w-9 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-600">
              <FiDollarSign className="w-4 h-4" />
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-amber-500/5 border border-amber-500/20 flex items-center justify-between">
            <div>
              <div className="text-[11px] text-amber-600 dark:text-amber-400 font-semibold uppercase">
                Pending / Available
              </div>
              <div className="text-lg font-bold text-amber-600 dark:text-amber-400 mt-0.5">
                {pendingCount} Pending
              </div>
            </div>
            <div className="h-9 w-9 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-600">
              <FiClock className="w-4 h-4" />
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-blue-500/5 border border-blue-500/20 flex items-center justify-between">
            <div>
              <div className="text-[11px] text-blue-600 dark:text-blue-400 font-semibold uppercase">
                Converted to Stock
              </div>
              <div className="text-lg font-bold text-blue-600 dark:text-blue-400 mt-0.5">
                {inStockCount} In Inventory
              </div>
            </div>
            <div className="h-9 w-9 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-600">
              <FiBox className="w-4 h-4" />
            </div>
          </div>
        </div>

        {/* Search Bar */}
        <div className="mb-4">
          <div className="relative max-w-sm">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-muted text-xs" />
            <input
              type="text"
              placeholder="Search trade-ins by model, IMEI, or customer..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-border bg-canvas text-ink placeholder:text-muted focus:border-brand focus:outline-hidden"
            />
          </div>
        </div>

        {loading ? (
          <p className="text-xs text-muted p-8 text-center">Loading trade-in devices…</p>
        ) : filteredTradeIns.length === 0 ? (
          <p className="text-xs text-muted p-8 text-center bg-canvas rounded-xl">
            {searchFilter ? 'No trade-ins match your search.' : 'No trade-in devices recorded yet.'}
          </p>
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
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredTradeIns.map((t) => (
                  <tr key={t.id} className="hover:bg-canvas">
                    <td className="px-4 py-3">
                      <p className="font-semibold text-ink">{t.deviceInfo}</p>
                      <p className="text-[10px] text-muted font-mono">{t.imei ? `IMEI: ${t.imei}` : 'No IMEI'}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded bg-surface border border-border font-medium text-[11px]">
                        {t.condition}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono font-bold text-emerald-600">
                      Rs {Number(t.tradeInValue).toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-muted">
                      <div className="font-medium text-ink">{t.customerName || 'Walk-in'}</div>
                      <div className="text-[11px]">{t.customerPhone || 'No Phone'}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                          t.status === 'IN_STOCK'
                            ? 'bg-blue-500/10 text-blue-600'
                            : t.status === 'ADJUSTED' || t.status === 'SOLD'
                            ? 'bg-purple-500/10 text-purple-600'
                            : 'bg-amber-500/10 text-amber-600'
                        }`}
                      >
                        {t.status === 'IN_STOCK' ? 'ADDED TO RESALE' : t.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {t.status === 'PENDING' ? (
                        <Button
                          onClick={() => openConvertModal(t)}
                          variant="secondary"
                          className="text-[11px] py-1 px-2.5 font-bold text-brand border-brand/30 hover:bg-brand/10"
                          title="Convert this trade-in device to inventory for resale"
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
            <div className="w-full max-w-lg rounded-2xl border border-border bg-surface p-5 shadow-xl">
              <h3 className="font-bold text-base text-ink mb-1">Intake Customer Trade-In Device</h3>
              <p className="text-xs text-muted mb-4">
                Record device details, select from customer's previous devices, and assign agreed trade-in value.
              </p>

              <form onSubmit={handleCreateTradeIn} className="space-y-3 text-xs">
                {/* Customer Selector */}
                <div>
                  <label className="text-muted block mb-0.5 font-medium">Select Existing Customer (Optional)</label>
                  <select
                    value={selectedCustomerId}
                    onChange={(e) => setSelectedCustomerId(e.target.value)}
                    className="w-full rounded border border-border bg-canvas px-2.5 py-1.5"
                  >
                    <option value="">-- Walk-in / Enter New Customer --</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name || 'Unnamed'} ({c.phone})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Customer Device Dropdown (if existing customer chosen) */}
                {selectedCustomerId && (
                  <div className="p-2.5 rounded-xl bg-canvas border border-border space-y-1.5">
                    <label className="text-ink block font-bold text-[11px]">
                      Select from Customer's Registered Devices (Purchased in Store)
                    </label>
                    {loadingCustomerDevices ? (
                      <p className="text-[11px] text-muted">Loading customer's devices...</p>
                    ) : customerDevices.length === 0 ? (
                      <p className="text-[11px] text-muted italic">
                        No previous device purchases on file for this customer. Enter device details below.
                      </p>
                    ) : (
                      <select
                        onChange={(e) => handleSelectCustomerDevice(e.target.value)}
                        className="w-full rounded border border-border bg-surface px-2.5 py-1.5 text-ink font-medium"
                      >
                        <option value="">-- Choose one of customer's purchased devices --</option>
                        {customerDevices.map((dev, idx) => (
                          <option key={idx} value={`${dev.productName}|||${dev.imei}`}>
                            {dev.productName} (IMEI: {dev.imei}) - Purchased {new Date(dev.date).toLocaleDateString()}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                )}

                <div>
                  <label className="text-muted block mb-0.5 font-medium">Device Model &amp; Specs *</label>
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
                    <label className="text-muted block mb-0.5 font-medium">IMEI Number</label>
                    <Input
                      placeholder="35..."
                      value={imei}
                      onChange={(e) => setImei(e.target.value)}
                      className="w-full font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-muted block mb-0.5 font-medium">Condition</label>
                    <select
                      value={condition}
                      onChange={(e) => setCondition(e.target.value)}
                      className="w-full rounded border border-border bg-canvas px-2 py-1.5"
                    >
                      <option value="LIKE_NEW">Like New / Mint</option>
                      <option value="GOOD">Good / Minor Scratches</option>
                      <option value="FAIR">Fair / Visible Wear</option>
                      <option value="DEFECTIVE">Needs Repair</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-muted block mb-0.5 font-medium">Agreed Trade-In Value (Rs) *</label>
                  <Input
                    required
                    type="number"
                    min={1}
                    step="any"
                    placeholder="0.00"
                    value={tradeInValue}
                    onChange={(e) => setTradeInValue(e.target.value)}
                    className="w-full font-mono text-sm font-bold text-emerald-600"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-muted block mb-0.5 font-medium">Customer Name</label>
                    <Input
                      placeholder="Customer name"
                      value={custName}
                      onChange={(e) => setCustName(e.target.value)}
                      className="w-full"
                    />
                  </div>
                  <div>
                    <label className="text-muted block mb-0.5 font-medium">Customer Phone</label>
                    <Input
                      placeholder="e.g. 0771234567"
                      value={custPhone}
                      onChange={(e) => setCustPhone(e.target.value)}
                      className="w-full"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-muted block mb-0.5 font-medium">Notes / Diagnostic Remarks</label>
                  <Input
                    placeholder="e.g. Battery health 86%, accessories included"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-border">
                  <Button
                    type="button"
                    onClick={() => setShowModal(false)}
                    variant="secondary"
                    disabled={savingTradeIn}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" className="font-bold" disabled={savingTradeIn}>
                    {savingTradeIn ? 'Saving…' : 'Record Trade-In Device'}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        ) : null}

        {/* Convert to Resale Stock Modal */}
        {showConvertModal && tradeInToConvert ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-md rounded-2xl border border-border bg-surface p-5 shadow-xl">
              <h3 className="font-bold text-base text-ink mb-1">Convert to Resale Inventory</h3>
              <p className="text-xs text-muted mb-3">
                This will add the device to inventory as a used product with barcode/serial tracking.
              </p>

              <form onSubmit={handleConfirmConvert} className="space-y-3 text-xs">
                <div>
                  <label className="text-muted block mb-0.5 font-medium">Product Name *</label>
                  <Input
                    required
                    value={convertName}
                    onChange={(e) => setConvertName(e.target.value)}
                    className="w-full"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-muted block mb-0.5 font-medium">Resale Sell Price (Rs) *</label>
                    <Input
                      required
                      type="number"
                      min={1}
                      step="any"
                      placeholder="0.00"
                      value={convertResalePrice}
                      onChange={(e) => setConvertResalePrice(e.target.value)}
                      className="w-full font-mono text-emerald-600 font-bold"
                    />
                  </div>
                  <div>
                    <label className="text-muted block mb-0.5 font-medium">Wholesale Price (Optional)</label>
                    <Input
                      type="number"
                      min={1}
                      step="any"
                      placeholder="0.00"
                      value={convertWholesalePrice}
                      onChange={(e) => setConvertWholesalePrice(e.target.value)}
                      className="w-full font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-muted block mb-0.5 font-medium">Category</label>
                    <Input
                      value={convertCategory}
                      onChange={(e) => setConvertCategory(e.target.value)}
                      className="w-full"
                    />
                  </div>
                  <div>
                    <label className="text-muted block mb-0.5 font-medium">Cost Price (Trade-in Value)</label>
                    <div className="py-2 px-2.5 rounded bg-canvas border border-border font-mono font-bold text-muted">
                      Rs {Number(tradeInToConvert.tradeInValue).toFixed(2)}
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-border">
                  <Button
                    type="button"
                    onClick={() => setShowConvertModal(false)}
                    variant="secondary"
                    disabled={converting}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" className="font-bold" disabled={converting}>
                    {converting ? 'Converting…' : 'Add to Resale Inventory'}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

// Sub-component 5: Label Printer Panel
function LabelPrinterPanel() {
  const settings = useAppSelector((s) => s.settings?.data);
  const [search, setSearch] = useState('');
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<Product[]>([]);
  const [queue, setQueue] = useState<{ productId: string; name: string; barcode: string; sku: string; sellPrice: number; quantity: number }[]>([]);
  const [labels, setLabels] = useState<ProductLabelItem[]>([]);
  const [generating, setGenerating] = useState(false);

  // Sticker print configurations
  const [labelSize, setLabelSize] = useState<'38x25' | '50x30' | 'sheet'>('38x25');
  const [showPrice, setShowPrice] = useState(true);
  const [showShopName, setShowShopName] = useState(true);

  async function runSearch() {
    if (!search.trim()) return;
    setSearching(true);
    try {
      const res = await api.get<Product[]>(`/products?search=${encodeURIComponent(search.trim())}`);
      setResults(res || []);
      if (!res || res.length === 0) {
        toast.info('No products found matching search');
      }
    } catch (err: any) {
      toast.error(err.message || 'Product search failed');
    } finally {
      setSearching(false);
    }
  }

  function addToQueue(p: Product) {
    setQueue((prev) => {
      const exists = prev.find((i) => i.productId === p.id);
      if (exists) {
        return prev.map((i) => (i.productId === p.id ? { ...i, quantity: i.quantity + 1 } : i));
      }
      return [
        ...prev,
        {
          productId: p.id,
          name: p.name,
          barcode: p.barcode || p.sku || '',
          sku: p.sku || '',
          sellPrice: Number(p.sellPrice || 0),
          quantity: 1,
        },
      ];
    });
  }

  function removeFromQueue(productId: string) {
    setQueue((prev) => prev.filter((i) => i.productId !== productId));
  }

  async function handleGenerate(printImmediately = false) {
    if (queue.length === 0) {
      toast.warn('Please add at least one product to the print queue');
      return;
    }

    setGenerating(true);
    try {
      const generated = await api.post<ProductLabelItem[]>('/labels', {
        items: queue.map((q) => ({ productId: q.productId, quantity: Math.max(1, q.quantity) })),
        format: 'CODE128',
      });

      setLabels(generated);
      const totalStickers = queue.reduce((sum, item) => sum + Math.max(1, item.quantity), 0);

      if (printImmediately) {
        toast.info(`Opening print dialog for ${totalStickers} sticker(s)...`);
        const html = generateProductLabelsHtml(generated, {
          size: labelSize,
          shopName: settings?.companyName || 'RETAIL STORE',
          showPrice,
          showShopName,
        });
        printHtmlViaIframe(html);
      } else {
        toast.success(`Generated preview for ${totalStickers} sticker(s)`);
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to generate barcode labels');
    } finally {
      setGenerating(false);
    }
  }

  function handlePrintCurrentLabels() {
    if (labels.length === 0) return;
    const totalStickers = labels.reduce((sum, item) => sum + Math.max(1, item.quantity), 0);
    toast.info(`Opening print dialog for ${totalStickers} sticker(s)...`);
    const html = generateProductLabelsHtml(labels, {
      size: labelSize,
      shopName: settings?.companyName || 'RETAIL STORE',
      showPrice,
      showShopName,
    });
    printHtmlViaIframe(html);
  }

  return (
    <div className="space-y-4">
      {/* Top Configuration & Search Card */}
      <div className="rounded-2xl border border-border bg-surface p-5 shadow-xs">
        <div className="flex items-center justify-between mb-1">
          <h3 className="font-bold text-base text-ink flex items-center gap-2">
            <FiPrinter className="w-5 h-5 text-primary" />
            Print Barcode Stickers
          </h3>
          <span className="text-[11px] font-semibold text-primary bg-primary/10 px-2.5 py-0.5 rounded-full">
            Thermal &amp; Sheet Support
          </span>
        </div>
        <p className="text-xs text-muted mb-4">
          Generate high-resolution thermal barcode labels (38x25mm / 50x30mm) or A4 printable sheets for retail inventory.
        </p>

        {/* Search bar */}
        <div className="flex gap-2">
          <Input
            placeholder="Search product by name, barcode, or SKU…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') runSearch();
            }}
            className="flex-1 text-xs"
          />
          <Button onClick={runSearch} variant="secondary" className="text-xs min-w-[80px]" disabled={searching}>
            {searching ? 'Searching…' : 'Search'}
          </Button>
        </div>

        {/* Search Results */}
        {results.length > 0 && (
          <ul className="my-3 flex flex-col gap-1.5 max-h-44 overflow-y-auto pr-1">
            {results.map((p) => (
              <li
                key={p.id}
                className="flex items-center justify-between p-2.5 rounded-xl bg-canvas border border-border text-xs hover:border-primary/40 transition-colors"
              >
                <div>
                  <div className="font-semibold text-ink">{p.name}</div>
                  <div className="text-[10px] text-muted flex gap-2 mt-0.5">
                    <span>Code: {p.barcode || p.sku}</span>
                    <span>•</span>
                    <span className="font-bold text-ink">Rs {Number(p.sellPrice).toFixed(2)}</span>
                    <span>•</span>
                    <span>Stock: {p.quantity}</span>
                  </div>
                </div>
                <Button
                  onClick={() => addToQueue(p)}
                  variant="secondary"
                  className="py-1 px-2.5 text-xs font-bold flex items-center gap-1"
                >
                  + Add
                </Button>
              </li>
            ))}
          </ul>
        )}

        {/* Print Queue */}
        {queue.length > 0 ? (
          <div className="space-y-3 border-t border-border pt-4 mt-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-ink">
                Print Queue ({queue.length} product{queue.length > 1 ? 's' : ''}, {queue.reduce((s, i) => s + (i.quantity || 1), 0)} sticker{queue.reduce((s, i) => s + (i.quantity || 1), 0) > 1 ? 's' : ''})
              </span>
              <button
                type="button"
                onClick={() => setQueue([])}
                className="text-[10px] text-danger hover:underline cursor-pointer"
              >
                Clear Queue
              </button>
            </div>

            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {queue.map((q) => (
                <div
                  key={q.productId}
                  className="flex items-center justify-between p-2 rounded-lg bg-canvas border border-border/70 text-xs"
                >
                  <div className="min-w-0 pr-2">
                    <div className="truncate font-medium text-ink">{q.name}</div>
                    <div className="text-[10px] text-muted">Rs {q.sellPrice.toFixed(2)}</div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[10px] text-muted">Copies:</span>
                    <Input
                      type="number"
                      min={1}
                      max={500}
                      value={q.quantity}
                      onChange={(e) =>
                        setQueue((prev) =>
                          prev.map((item) =>
                            item.productId === q.productId ? { ...item, quantity: Math.max(1, parseInt(e.target.value) || 1) } : item
                          )
                        )
                      }
                      className="w-16 text-center text-xs py-0.5 font-bold"
                    />
                    <button
                      type="button"
                      onClick={() => removeFromQueue(q.productId)}
                      className="p-1 rounded text-muted hover:text-danger hover:bg-danger/10 transition-colors"
                      title="Remove product"
                    >
                      <FiTrash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Sticker Configuration Options */}
            <div className="p-3 bg-canvas rounded-xl border border-border space-y-2 text-xs">
              <div className="font-semibold text-ink text-[11px] uppercase tracking-wider">Printer &amp; Label Format</div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <label
                  className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-all ${
                    labelSize === '38x25'
                      ? 'bg-surface border-primary text-primary font-bold shadow-2xs'
                      : 'border-border text-muted hover:text-ink'
                  }`}
                >
                  <input
                    type="radio"
                    name="labelSize"
                    checked={labelSize === '38x25'}
                    onChange={() => setLabelSize('38x25')}
                    className="hidden"
                  />
                  <span>38 × 25 mm (Thermal)</span>
                </label>
                <label
                  className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-all ${
                    labelSize === '50x30'
                      ? 'bg-surface border-primary text-primary font-bold shadow-2xs'
                      : 'border-border text-muted hover:text-ink'
                  }`}
                >
                  <input
                    type="radio"
                    name="labelSize"
                    checked={labelSize === '50x30'}
                    onChange={() => setLabelSize('50x30')}
                    className="hidden"
                  />
                  <span>50 × 30 mm (Thermal)</span>
                </label>
                <label
                  className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-all ${
                    labelSize === 'sheet'
                      ? 'bg-surface border-primary text-primary font-bold shadow-2xs'
                      : 'border-border text-muted hover:text-ink'
                  }`}
                >
                  <input
                    type="radio"
                    name="labelSize"
                    checked={labelSize === 'sheet'}
                    onChange={() => setLabelSize('sheet')}
                    className="hidden"
                  />
                  <span>A4 Sticker Sheet</span>
                </label>
              </div>

              <div className="flex gap-4 pt-1">
                <label className="flex items-center gap-1.5 cursor-pointer text-[11px]">
                  <input
                    type="checkbox"
                    checked={showPrice}
                    onChange={(e) => setShowPrice(e.target.checked)}
                    className="rounded border-border accent-primary"
                  />
                  <span>Include Retail Price</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer text-[11px]">
                  <input
                    type="checkbox"
                    checked={showShopName}
                    onChange={(e) => setShowShopName(e.target.checked)}
                    className="rounded border-border accent-primary"
                  />
                  <span>Include Shop Name</span>
                </label>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 pt-1">
              <Button
                onClick={() => handleGenerate(true)}
                disabled={generating}
                className="flex-1 py-2.5 text-xs font-bold flex items-center justify-center gap-2"
              >
                <FiPrinter className="w-4 h-4" />
                {generating ? 'Generating & Printing…' : 'Generate & Print Stickers'}
              </Button>
              <Button
                onClick={() => handleGenerate(false)}
                disabled={generating}
                variant="secondary"
                className="py-2.5 text-xs font-bold"
              >
                Preview Labels
              </Button>
            </div>
          </div>
        ) : null}
      </div>

      {/* Live Label Preview Section */}
      {labels.length > 0 && (
        <div className="rounded-2xl border border-border bg-surface p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-bold text-sm text-ink">Sticker Label Preview</h4>
              <p className="text-[11px] text-muted">
                Showing {labels.reduce((s, i) => s + (i.quantity || 1), 0)} sticker(s) ready to print
              </p>
            </div>
            <Button
              onClick={handlePrintCurrentLabels}
              className="py-1.5 px-3 text-xs font-bold flex items-center gap-1.5"
            >
              <FiPrinter className="w-3.5 h-3.5" />
              Print Stickers
            </Button>
          </div>

          <div className="flex flex-wrap gap-3 p-3 bg-canvas rounded-xl border border-border max-h-72 overflow-y-auto">
            {labels.flatMap((label) =>
              Array.from({ length: Math.min(label.quantity, 10) }, (_, i) => (
                <div
                  key={`${label.productId}-${i}`}
                  className="w-[140px] p-2 bg-white border border-gray-300 rounded shadow-xs flex flex-col items-center justify-between text-center text-black"
                >
                  {showShopName && (
                    <div className="text-[9px] font-extrabold uppercase tracking-wide truncate max-w-full text-gray-800">
                      {settings?.companyName || 'RETAIL STORE'}
                    </div>
                  )}
                  <div className="text-[10px] font-bold text-gray-900 truncate max-w-full my-0.5">
                    {label.name}
                  </div>
                  <img
                    src={label.imageDataUrl}
                    alt={label.barcode}
                    className="w-full max-h-9 object-contain my-0.5"
                  />
                  {showPrice && (
                    <div className="text-[10px] font-black text-black">
                      Rs {label.sellPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                  )}
                </div>
              ))
            )}
            {labels.some((l) => l.quantity > 10) && (
              <div className="flex items-center justify-center p-3 text-xs text-muted">
                + more copies will be printed according to queue counts
              </div>
            )}
          </div>
        </div>
      )}
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
