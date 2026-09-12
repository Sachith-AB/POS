import { useEffect, useState } from 'react';
import { api } from '../../../lib/api';
import { Input } from '../../../components/Input';
import { Button } from '../../../components/Button';
import {
  FiSearch,
  FiClock,
  FiFileText,
  FiFilter,
  FiArrowDownLeft,
  FiArrowUpRight,
  FiDollarSign,
  FiRotateCcw,
  FiTrendingUp,
  FiBox,
  FiRefreshCw,
  FiCheckCircle,
} from 'react-icons/fi';
import type { StockMovementItem, SupplierTransactionRecord, SupplierItem } from './types';

export function TransactionHistoryPanel() {
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
