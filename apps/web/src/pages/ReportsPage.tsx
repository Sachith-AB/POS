import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { Input } from '../components/Input';
import { Button } from '../components/Button';

interface SlowProduct {
  id: string;
  sku: string;
  barcode: string | null;
  name: string;
  category: string;
  quantity: number;
  costPrice: number;
  sellPrice: number;
  costValue: number;
  lastSoldAt: string | null;
}

export function ReportsPage() {
  const [items, setItems] = useState<SlowProduct[]>([]);
  const [days, setDays] = useState<number>(90);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Pagination state
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 15;

  useEffect(() => {
    setPage(1);
  }, [days, search]);

  useEffect(() => {
    setLoading(true);
    setError(null);
    api
      .get<SlowProduct[]>(`/reports/slow-stock?days=${days}`)
      .then((res) => {
        setItems(res || []);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setError('Failed to fetch slow stock report.');
        setLoading(false);
      });
  }, [days]);

  // Filter items in memory by search term
  const filteredItems = items.filter((item) => {
    const q = search.toLowerCase().trim();
    if (!q) return true;
    return (
      item.name.toLowerCase().includes(q) ||
      item.sku.toLowerCase().includes(q) ||
      (item.barcode && item.barcode.toLowerCase().includes(q)) ||
      item.category.toLowerCase().includes(q)
    );
  });

  const totalCapitalTiedUp = filteredItems.reduce((sum, item) => sum + item.costValue, 0);
  const totalStockQuantity = filteredItems.reduce((sum, item) => sum + item.quantity, 0);

  const totalPages = Math.ceil(filteredItems.length / PAGE_SIZE);
  const paginatedItems = filteredItems.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const getRowColor = (lastSoldAt: string | null) => {
    if (!lastSoldAt) return 'border-l-4 border-l-rose-500 bg-rose-500/5'; // Never sold
    const daysSince = Math.floor(
      (Date.now() - new Date(lastSoldAt).getTime()) / (24 * 60 * 60 * 1000)
    );
    if (daysSince >= 180) return 'border-l-4 border-l-rose-500 bg-rose-500/5';
    if (daysSince >= 90) return 'border-l-4 border-l-amber-500 bg-amber-500/5';
    return '';
  };

  const getDaysSinceString = (lastSoldAt: string | null) => {
    if (!lastSoldAt) return 'Never Sold';
    const daysSince = Math.floor(
      (Date.now() - new Date(lastSoldAt).getTime()) / (24 * 60 * 60 * 1000)
    );
    return `${daysSince} days ago`;
  };

  return (
    <div className="flex h-full flex-col min-h-0 bg-canvas p-6 space-y-6 overflow-y-auto">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-ink">Slow-Moving Stock Report</h1>
        <p className="text-xs text-muted">Identify capital tied up in products that are not selling</p>
      </div>

      {/* Filter and stats row */}
      <div className="flex flex-wrap gap-4 items-end justify-between">
        <div className="flex gap-3 items-center">
          <div>
            <label className="text-[10px] font-bold text-muted uppercase block mb-1">Inactivity Period</label>
            <select
              value={days}
              onChange={(e) => setDays(Number(e.target.value))}
              className="rounded-lg border border-border bg-surface px-3 py-2 text-xs text-ink focus:border-primary focus:outline-none"
            >
              <option value={30}>Last 30 Days</option>
              <option value={60}>Last 60 Days</option>
              <option value={90}>Last 90 Days (Default)</option>
              <option value={180}>Last 180 Days</option>
            </select>
          </div>
          <div>
            <label className="text-[10px] font-bold text-muted uppercase block mb-1">Search Products</label>
            <div className="w-64">
              <Input
                placeholder="Filter by name, sku, barcode..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full"
              />
            </div>
          </div>
        </div>

        {/* Stats card */}
        <div className="flex gap-4">
          <div className="rounded-xl border border-border bg-surface px-4 py-2 text-center shadow-sm">
            <span className="text-[9px] font-bold uppercase text-muted tracking-wider block">Products Affected</span>
            <span className="text-lg font-bold text-ink mt-0.5 block">{filteredItems.length} items</span>
          </div>
          <div className="rounded-xl border border-border bg-surface px-4 py-2 text-center shadow-sm">
            <span className="text-[9px] font-bold uppercase text-muted tracking-wider block">Total Capital Tied Up</span>
            <span className="text-lg font-bold font-mono text-danger mt-0.5 block">
              Rs {totalCapitalTiedUp.toFixed(2)}
            </span>
          </div>
        </div>
      </div>

      {error ? (
        <div className="rounded-lg bg-error-bg p-3 border border-error-border text-xs text-error">
          {error}
        </div>
      ) : null}

      {/* Table view */}
      <div className="flex-1 rounded-xl border border-border bg-surface overflow-hidden shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center p-20 text-xs text-muted">
            Analyzing transaction movements...
          </div>
        ) : (
          <table className="w-full border-collapse text-left text-xs text-ink">
            <thead>
              <tr className="border-b border-border bg-canvas text-[10px] font-bold text-muted uppercase">
                <th className="px-4 py-3">Product Info</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3 text-right">In Stock Qty</th>
                <th className="px-4 py-3 text-right">Cost Price</th>
                <th className="px-4 py-3 text-right font-bold text-danger">Tied Up Capital</th>
                <th className="px-4 py-3">Last Sale Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-muted">
                    No slow-moving products found for this period. All stock is selling!
                  </td>
                </tr>
              ) : (
                paginatedItems.map((item) => (
                  <tr key={item.id} className={`${getRowColor(item.lastSoldAt)} hover:opacity-95 transition-all`}>
                    <td className="px-4 py-3">
                      <div className="font-semibold">{item.name}</div>
                      <div className="text-[10px] text-muted font-mono">
                        SKU: {item.sku} {item.barcode ? `· Barcode: ${item.barcode}` : ''}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted">{item.category}</td>
                    <td className="px-4 py-3 text-right font-mono font-semibold">{item.quantity}</td>
                    <td className="px-4 py-3 text-right font-mono">Rs {item.costPrice.toFixed(2)}</td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-danger">
                      Rs {item.costValue.toFixed(2)}
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-semibold">{getDaysSinceString(item.lastSoldAt)}</span>
                      {item.lastSoldAt ? (
                        <span className="text-[9px] text-muted block">
                          {new Date(item.lastSoldAt).toLocaleDateString()}
                        </span>
                      ) : null}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {filteredItems.length > 0 ? (
              <tfoot>
                <tr className="bg-canvas border-t border-border font-bold text-ink">
                  <td className="px-4 py-3.5" colSpan={2}>
                    Total Slow-Moving Inventory
                  </td>
                  <td className="px-4 py-3.5 text-right font-mono">{totalStockQuantity} units</td>
                  <td className="px-4 py-3.5"></td>
                  <td className="px-4 py-3.5 text-right font-mono text-danger">
                    Rs {totalCapitalTiedUp.toFixed(2)}
                  </td>
                  <td className="px-4 py-3.5"></td>
                </tr>
              </tfoot>
            ) : null}
          </table>
        )}
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-border pt-4 mt-3 bg-surface rounded-xl p-4 border shadow-sm shrink-0">
          <span className="text-xs text-muted">
            Showing page {page} of {totalPages} ({filteredItems.length} total products)
          </span>
          <div className="flex gap-1.5">
            <Button
              disabled={page === 1}
              onClick={() => setPage(page - 1)}
              variant="secondary"
              className="py-1 px-3"
            >
              Previous
            </Button>
            <Button
              disabled={page === totalPages}
              onClick={() => setPage(page + 1)}
              variant="secondary"
              className="py-1 px-3"
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
