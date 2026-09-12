import { useState, useEffect, useRef } from 'react';
import { FiSearch, FiShoppingBag, FiTrash2, FiPlus, FiMinus, FiFileText, FiCheck, FiSmartphone } from 'react-icons/fi';
import { Input } from '../../../components/Input';
import { Button } from '../../../components/Button';
import { api } from '../../../lib/api';
import type { AgreementProductItem, SaleMinimal } from './types';

interface AgreementProductSelectorProps {
  selectedSale: SaleMinimal | null;
  onSaleSelect: (sale: SaleMinimal | null) => void;
  selectedProducts: AgreementProductItem[];
  onProductsChange: (products: AgreementProductItem[]) => void;
}

export function AgreementProductSelector({
  selectedSale,
  onSaleSelect,
  selectedProducts,
  onProductsChange,
}: AgreementProductSelectorProps) {
  const [mode, setMode] = useState<'PRODUCTS' | 'EXISTING_SALE'>('PRODUCTS');

  // Product search state
  const [productSearch, setProductSearch] = useState('');
  const [productResults, setProductResults] = useState<any[]>([]);
  const [searchingProducts, setSearchingProducts] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Sale search state
  const [saleSearch, setSaleSearch] = useState('');
  const [saleResults, setSaleResults] = useState<any[]>([]);
  const [searchingSales, setSearchingSales] = useState(false);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Debounced product search
  useEffect(() => {
    const trimmed = productSearch.trim();
    if (trimmed.length < 1) {
      setProductResults([]);
      setIsDropdownOpen(false);
      return;
    }

    const timer = setTimeout(async () => {
      setSearchingProducts(true);
      try {
        const results = await api.get<any[]>(`/products?search=${encodeURIComponent(trimmed)}`);
        setProductResults(results || []);
        setIsDropdownOpen(true);
      } catch (err) {
        console.error('Failed to search products', err);
      } finally {
        setSearchingProducts(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [productSearch]);

  // Debounced sale search
  useEffect(() => {
    const trimmed = saleSearch.trim();
    if (mode !== 'EXISTING_SALE' || trimmed.length < 2) {
      setSaleResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setSearchingSales(true);
      try {
        const res = await api.get<any>(`/sales?search=${encodeURIComponent(trimmed)}`);
        const list = (res.items || res || []).filter((s: any) => s.status === 'COMPLETED' || s.status === 'PARKED');
        setSaleResults(list);
      } catch (err) {
        console.error('Failed to search sales', err);
      } finally {
        setSearchingSales(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [saleSearch, mode]);

  // Add product to agreement
  async function handleAddProduct(prod: any) {
    setIsDropdownOpen(false);
    setProductSearch('');

    let availableImeis: { id: string; imei: string }[] = [];
    if (prod.isSerialized) {
      try {
        const mobiles = await api.get<any[]>(`/products/mobiles?search=${encodeURIComponent(prod.name)}`);
        const match = mobiles?.find((m: any) => m.id === prod.id) || mobiles?.[0];
        if (match?.serializedItems) {
          availableImeis = match.serializedItems
            .filter((si: any) => si.status === 'IN_STOCK')
            .map((si: any) => ({ id: si.id, imei: si.imei }));
        }
      } catch (err) {
        console.warn('Could not fetch IMEIs', err);
      }
    }

    const existingIdx = selectedProducts.findIndex((p) => p.productId === prod.id);
    if (existingIdx >= 0 && !prod.isSerialized) {
      const updated = [...selectedProducts];
      updated[existingIdx].quantity += 1;
      updated[existingIdx].lineTotal = updated[existingIdx].quantity * updated[existingIdx].unitPrice;
      onProductsChange(updated);
    } else {
      const price = Number(prod.sellPrice || 0);
      const newItem: AgreementProductItem = {
        productId: prod.id,
        name: prod.name,
        sku: prod.sku,
        barcode: prod.barcode,
        unitPrice: price,
        quantity: 1,
        lineTotal: price,
        isSerialized: prod.isSerialized,
        availableImeis,
        serializedItemId: availableImeis.length > 0 ? availableImeis[0].id : undefined,
        imei: availableImeis.length > 0 ? availableImeis[0].imei : undefined,
      };
      onProductsChange([...selectedProducts, newItem]);
    }
  }

  function handleRemoveProduct(productId: string, imei?: string | null) {
    onProductsChange(
      selectedProducts.filter((p) => !(p.productId === productId && (!imei || p.imei === imei)))
    );
  }

  function handleQuantityChange(productId: string, newQty: number) {
    if (newQty < 1) return;
    onProductsChange(
      selectedProducts.map((p) =>
        p.productId === productId
          ? { ...p, quantity: newQty, lineTotal: newQty * p.unitPrice }
          : p
      )
    );
  }

  function handlePriceChange(productId: string, newPrice: number) {
    onProductsChange(
      selectedProducts.map((p) =>
        p.productId === productId
          ? { ...p, unitPrice: newPrice, lineTotal: p.quantity * newPrice }
          : p
      )
    );
  }

  function handleImeiSelect(productId: string, serializedItemId: string) {
    onProductsChange(
      selectedProducts.map((p) => {
        if (p.productId !== productId) return p;
        const imeiMatch = p.availableImeis?.find((i) => i.id === serializedItemId);
        return {
          ...p,
          serializedItemId,
          imei: imeiMatch?.imei,
        };
      })
    );
  }

  const productsTotal = selectedProducts.reduce((acc, p) => acc + p.lineTotal, 0);

  return (
    <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 text-xs space-y-2.5">
      {/* If an existing sale from POS was loaded */}
      {selectedSale ? (
        <div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 font-bold text-primary">
              <FiShoppingBag className="h-4 w-4" />
              <span>Selected Sale Items:</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono text-muted">ID: {selectedSale.id.slice(-8)}</span>
              <button
                type="button"
                onClick={() => onSaleSelect(null)}
                className="text-[10px] font-semibold text-rose-500 hover:underline cursor-pointer"
              >
                Change Product
              </button>
            </div>
          </div>
          <p className="mt-1">
            Customer:{' '}
            <span className="font-semibold text-ink">{selectedSale.customer?.name || 'Walk-in'}</span>{' '}
            <span className="font-mono">({selectedSale.customer?.phone || 'No phone'})</span>
          </p>
          {selectedSale.items && selectedSale.items.length > 0 && (
            <div className="my-2 p-2 rounded-lg bg-surface/90 border border-border/70">
              <span className="font-semibold text-ink text-[11px] block mb-1">Products in this agreement:</span>
              <ul className="space-y-1">
                {selectedSale.items.map((it: any, idx: number) => (
                  <li key={idx} className="flex justify-between items-center text-[11px] text-ink">
                    <span className="truncate max-w-[240px] font-medium">
                      {it.product?.name || 'Item'} {it.quantity > 1 ? `× ${it.quantity}` : ''}
                    </span>
                    <span className="font-mono text-muted">
                      Rs {Number(it.lineTotal || Number(it.unitPrice) * it.quantity).toFixed(2)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <div className="flex justify-between items-center pt-1 border-t border-border/50">
            <p className="text-muted">Sale Date: {new Date(selectedSale.createdAt).toLocaleDateString()}</p>
            <p className="font-bold text-ink text-sm">Total Bill: Rs {Number(selectedSale.total).toFixed(2)}</p>
          </div>
        </div>
      ) : (
        /* Manual Product Selection Flow */
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 font-bold text-ink uppercase tracking-wide text-xs">
              <FiShoppingBag className="h-4 w-4 text-primary" />
              <span>Select Product / Device for Agreement</span>
              <span className="text-rose-500 font-bold">*</span>
            </div>
            {/* Mode Switcher */}
            <div className="flex rounded-lg border border-border bg-surface p-0.5 text-[10px]">
              <button
                type="button"
                onClick={() => setMode('PRODUCTS')}
                className={`px-2.5 py-1 rounded-md font-semibold transition-colors ${
                  mode === 'PRODUCTS' ? 'bg-primary text-white' : 'text-muted hover:text-ink'
                }`}
              >
                From Stock
              </button>
              <button
                type="button"
                onClick={() => setMode('EXISTING_SALE')}
                className={`px-2.5 py-1 rounded-md font-semibold transition-colors ${
                  mode === 'EXISTING_SALE' ? 'bg-primary text-white' : 'text-muted hover:text-ink'
                }`}
              >
                Existing Sale
              </button>
            </div>
          </div>

          {mode === 'PRODUCTS' ? (
            <div className="space-y-2">
              {/* Product Search Input with Dropdown */}
              <div ref={searchContainerRef} className="relative">
                <div className="relative">
                  <Input
                    placeholder="Search product by name, barcode, or SKU..."
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    onFocus={() => {
                      if (productResults.length > 0) setIsDropdownOpen(true);
                    }}
                    className="w-full text-xs pr-8"
                  />
                  <FiSearch className="absolute right-2.5 top-2.5 h-3.5 w-3.5 text-muted pointer-events-none" />
                </div>

                {searchingProducts && (
                  <span className="text-[10px] text-muted block mt-1 animate-pulse">Searching inventory...</span>
                )}

                {/* Dropdown Menu */}
                {isDropdownOpen && productResults.length > 0 && (
                  <div className="absolute z-20 mt-1 w-full max-h-56 overflow-y-auto rounded-xl border border-border bg-surface shadow-xl divide-y divide-border">
                    {productResults.map((prod) => (
                      <div
                        key={prod.id}
                        onClick={() => handleAddProduct(prod)}
                        className="flex items-center justify-between p-2.5 hover:bg-canvas cursor-pointer transition-colors text-xs"
                      >
                        <div className="min-w-0 pr-2">
                          <p className="font-semibold text-ink truncate">{prod.name}</p>
                          <div className="flex items-center gap-2 text-[10px] text-muted">
                            <span>SKU: {prod.sku || 'N/A'}</span>
                            {prod.isSerialized ? (
                              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400 font-bold">
                                <FiSmartphone className="h-2.5 w-2.5" /> Mobile / Serialized
                              </span>
                            ) : null}
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="font-mono font-bold text-ink">Rs {Number(prod.sellPrice).toFixed(2)}</p>
                          <span
                            className={`text-[10px] font-semibold ${
                              prod.quantity > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500'
                            }`}
                          >
                            Stock: {prod.quantity}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Selected Products List */}
              {selectedProducts.length > 0 ? (
                <div className="space-y-1.5 rounded-xl border border-border bg-surface p-2.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted block mb-1">
                    Selected Items for Agreement ({selectedProducts.length}):
                  </span>
                  <div className="space-y-2">
                    {selectedProducts.map((p, idx) => (
                      <div
                        key={`${p.productId}-${idx}`}
                        className="flex flex-col gap-1.5 p-2 rounded-lg bg-canvas border border-border/70 text-xs"
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <span className="font-bold text-ink">{p.name}</span>
                            {p.sku ? <span className="text-[10px] text-muted font-mono ml-2">SKU: {p.sku}</span> : null}
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveProduct(p.productId, p.imei)}
                            className="text-muted hover:text-rose-500 p-1 transition-colors cursor-pointer"
                            title="Remove"
                          >
                            <FiTrash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>

                        {/* If Serialized, pick IMEI */}
                        {p.isSerialized ? (
                          <div className="flex items-center gap-2 text-[11px]">
                            <span className="font-medium text-muted">Select IMEI:</span>
                            {p.availableImeis && p.availableImeis.length > 0 ? (
                              <select
                                value={p.serializedItemId || ''}
                                onChange={(e) => handleImeiSelect(p.productId, e.target.value)}
                                className="rounded border border-border bg-surface px-2 py-0.5 font-mono text-[11px] text-ink focus:border-primary focus:outline-none"
                              >
                                {p.availableImeis.map((item) => (
                                  <option key={item.id} value={item.id}>
                                    {item.imei}
                                  </option>
                                ))}
                              </select>
                            ) : (
                              <span className="text-amber-500 text-[10px]">No IN_STOCK IMEI found</span>
                            )}
                          </div>
                        ) : null}

                        {/* Price and Quantity Controls */}
                        <div className="flex items-center justify-between gap-3 pt-1 border-t border-border/40 text-xs">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] text-muted">Qty:</span>
                            {!p.isSerialized ? (
                              <div className="flex items-center border border-border rounded bg-surface">
                                <button
                                  type="button"
                                  onClick={() => handleQuantityChange(p.productId, p.quantity - 1)}
                                  className="p-1 text-muted hover:text-ink cursor-pointer"
                                >
                                  <FiMinus className="h-3 w-3" />
                                </button>
                                <span className="px-2 font-mono font-bold text-xs">{p.quantity}</span>
                                <button
                                  type="button"
                                  onClick={() => handleQuantityChange(p.productId, p.quantity + 1)}
                                  className="p-1 text-muted hover:text-ink cursor-pointer"
                                >
                                  <FiPlus className="h-3 w-3" />
                                </button>
                              </div>
                            ) : (
                              <span className="font-mono font-bold text-xs">1</span>
                            )}
                          </div>

                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] text-muted">Unit Price (Rs):</span>
                            <Input
                              type="number"
                              min={0}
                              value={p.unitPrice}
                              onChange={(e) => handlePriceChange(p.productId, parseFloat(e.target.value) || 0)}
                              className="w-24 text-right py-0.5 text-xs font-mono"
                            />
                          </div>

                          <div className="text-right font-bold text-ink font-mono">
                            Rs {p.lineTotal.toFixed(2)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="flex justify-between items-center pt-2 border-t border-border text-xs">
                    <span className="font-bold text-muted">Total Products Value:</span>
                    <span className="font-mono font-extrabold text-sm text-primary">
                      Rs {productsTotal.toFixed(2)}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="text-center p-3 rounded-lg border border-dashed border-border text-muted text-xs">
                  Please search and select at least one product/phone above to create an installment agreement.
                </div>
              )}
            </div>
          ) : (
            /* Existing Sale Search */
            <div className="space-y-2">
              <Input
                placeholder="Search completed or parked sale by customer phone or sale ID..."
                value={saleSearch}
                onChange={(e) => setSaleSearch(e.target.value)}
                className="w-full text-xs"
              />
              {searchingSales ? <p className="text-[10px] text-muted animate-pulse">Searching sales...</p> : null}

              {saleResults.length > 0 ? (
                <div className="max-h-48 overflow-y-auto rounded-xl border border-border bg-surface divide-y divide-border">
                  {saleResults.map((s) => (
                    <div
                      key={s.id}
                      onClick={() => onSaleSelect(s)}
                      className="flex items-center justify-between p-2.5 hover:bg-canvas cursor-pointer transition-colors text-xs"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-semibold text-primary">#{s.id.slice(-8)}</span>
                          <span className="font-medium text-ink">{s.customer?.name || 'Walk-in'}</span>
                          <span className="text-[10px] text-muted font-mono">({s.customer?.phone || 'No phone'})</span>
                        </div>
                        <span className="text-[10px] text-muted">
                          {new Date(s.createdAt).toLocaleDateString()} • {s.items?.length || 0} items
                        </span>
                      </div>
                      <div className="text-right font-mono font-bold text-ink">
                        Rs {Number(s.total).toFixed(2)}
                      </div>
                    </div>
                  ))}
                </div>
              ) : saleSearch.trim().length >= 2 && !searchingSales ? (
                <p className="text-center text-xs text-muted py-2">No matching sales found.</p>
              ) : null}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
