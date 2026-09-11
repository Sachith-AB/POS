import { useEffect, useState } from 'react';
import { api } from '../../../lib/api';
import { Input } from '../../../components/Input';
import { Button } from '../../../components/Button';
import { toast } from 'react-toastify';
import type { Product } from '../../../features/products/productsSlice';
import {
  FiSearch,
  FiRotateCcw,
  FiPlus,
  FiX,
  FiAlertTriangle,
  FiCheckCircle,
  FiClock,
  FiFileText,
  FiDollarSign,
  FiRefreshCw,
  FiBox,
} from 'react-icons/fi';
import type { SupplierItem } from './types';

export function SupplierReturnsPanel() {
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