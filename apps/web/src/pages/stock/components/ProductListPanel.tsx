import { useEffect, useState } from 'react';
import { api } from '../../../lib/api';
import { Input } from '../../../components/Input';
import { Button } from '../../../components/Button';
import { ConfirmModal } from '../../../components/ConfirmModal';
import { toast } from 'react-toastify';
import type { Product } from '../../../features/products/productsSlice';
import {
  FiSearch,
  FiEdit2,
  FiTrash2,
  FiAlertTriangle,
  FiBox,
  FiRefreshCw,
  FiFilter,
  FiPlus,
  FiX,
  FiCheckCircle,
  FiDollarSign,
  FiTrendingUp,
} from 'react-icons/fi';
import type { CategoryItem, WarrantyOption } from './types';

export function ProductListPanel() {
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