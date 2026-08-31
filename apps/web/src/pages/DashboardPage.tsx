import { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '../app/hooks';
import { Button } from '../components/Button';
import { dashboardDataRequested } from '../features/dashboard/dashboardSlice';

export function DashboardPage() {
  const dispatch = useAppDispatch();
  const { summary, chartData, loading, error } = useAppSelector((s) => s.dashboard);

  useEffect(() => {
    dispatch(dashboardDataRequested());

    // Auto-refresh every 60 seconds
    const timer = setInterval(() => {
      dispatch(dashboardDataRequested());
    }, 60000);

    return () => clearInterval(timer);
  }, [dispatch]);

  // Calculate SVG chart parameters
  const maxTotal = Math.max(...chartData.map((d) => d.total), 1);
  const chartHeight = 160;
  const chartWidth = 720;
  const paddingBottom = 24;
  const paddingLeft = 40;
  const paddingRight = 10;
  const paddingTop = 10;
  
  const plotWidth = chartWidth - paddingLeft - paddingRight;
  const plotHeight = chartHeight - paddingTop - paddingBottom;

  const getTrendElement = (today: number, yesterday: number) => {
    if (yesterday === 0) return <span className="text-[10px] text-muted">No yesterday data</span>;
    const diff = today - yesterday;
    const pct = (diff / yesterday) * 100;
    const isUp = diff >= 0;
    return (
      <span className={`text-[10px] font-bold ${isUp ? 'text-emerald-500' : 'text-rose-500'}`}>
        {isUp ? '↑' : '↓'} {Math.abs(pct).toFixed(0)}% vs yesterday
      </span>
    );
  };

  return (
    <div className="flex h-full flex-col min-h-0 bg-canvas overflow-y-auto p-4 sm:p-6 space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-ink">Owner Dashboard</h1>
          <p className="text-xs text-muted">Real-time store performance, revenue metrics, and inventory health</p>
        </div>
        <Button
          onClick={() => dispatch(dashboardDataRequested())}
          loading={loading}
          variant="secondary"
          className="w-full sm:w-auto"
        >
          Refresh
        </Button>
      </div>

      {error ? (
        <div className="rounded-lg bg-error-bg p-3 border border-error-border text-xs text-error">
          {error}
        </div>
      ) : null}

      {summary ? (
        <>
          {/* KPI Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Sales Card */}
            <div className="rounded-xl border border-border bg-surface p-4 shadow-sm">
              <span className="text-[10px] font-bold uppercase text-muted tracking-wider block">Today's Transactions</span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl font-bold text-ink">{summary.today.salesCount}</span>
                <span className="text-xs text-muted">bills completed</span>
              </div>
              <p className="text-[10px] text-muted mt-2">Active customer checkouts</p>
            </div>

            {/* Revenue Card */}
            <div className="rounded-xl border border-border bg-surface p-4 shadow-sm">
              <span className="text-[10px] font-bold uppercase text-muted tracking-wider block">Today's Revenue</span>
              <div className="mt-1">
                <span className="text-2xl font-bold font-mono text-ink">Rs {summary.today.revenue.toFixed(2)}</span>
              </div>
              <div className="mt-2 flex items-center gap-1.5">
                {getTrendElement(summary.today.revenue, summary.yesterday.revenue)}
              </div>
            </div>

            {/* Profit Card */}
            <div className="rounded-xl border border-border bg-surface p-4 shadow-sm">
              <span className="text-[10px] font-bold uppercase text-muted tracking-wider block">Today's Gross Profit</span>
              <div className="mt-1">
                <span className="text-2xl font-bold font-mono text-success">Rs {summary.today.profit.toFixed(2)}</span>
              </div>
              <div className="mt-2 flex items-center gap-1.5">
                {getTrendElement(summary.today.profit, summary.yesterday.profit)}
              </div>
            </div>

            {/* Stock Valuation Card */}
            <div className="rounded-xl border border-border bg-surface p-4 shadow-sm">
              <span className="text-[10px] font-bold uppercase text-muted tracking-wider block">Current Capital Tied In Stock</span>
              <div className="mt-1">
                <span className="text-2xl font-bold font-mono text-ink">Rs {summary.stock.totalValue.toFixed(2)}</span>
              </div>
              <p className="text-[10px] text-muted mt-2">Calculated from product cost prices</p>
            </div>
          </div>

          {/* Charts & Top-Selling Layout */}
          <div className="flex flex-col lg:grid lg:grid-cols-[1fr_360px] gap-6 min-h-0">
            {/* Left Column: Hourly sales SVG Chart */}
            <div className="rounded-xl border border-border bg-surface p-5 shadow-sm space-y-4">
              <h2 className="text-xs font-bold text-ink uppercase tracking-wider">Today's Hourly Sales Trend</h2>
              
              <div className="relative w-full overflow-x-auto pb-2">
                <div className="w-full min-w-[640px] h-[160px]">
                  <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full h-full overflow-visible">
                    {/* Grid Lines */}
                    {[0, 0.25, 0.5, 0.75, 1].map((r, i) => {
                      const y = paddingTop + plotHeight * (1 - r);
                      const val = maxTotal * r;
                      return (
                        <g key={i} className="opacity-40">
                          <line
                            x1={paddingLeft}
                            y1={y}
                            x2={chartWidth - paddingRight}
                            y2={y}
                            stroke="var(--color-border)"
                            strokeWidth="1"
                            strokeDasharray="4,4"
                          />
                          <text
                            x={paddingLeft - 8}
                            y={y + 3}
                            textAnchor="end"
                            className="fill-muted font-mono text-[9px] font-semibold"
                          >
                            {val > 1000 ? `${(val / 1000).toFixed(0)}k` : val.toFixed(0)}
                          </text>
                        </g>
                      );
                    })}

                    {/* Hour Axes labels */}
                    {chartData.filter((_, idx) => idx % 3 === 0).map((d, i) => {
                      const idx = i * 3;
                      const x = paddingLeft + (idx * (plotWidth / 23));
                      return (
                        <text
                          key={i}
                          x={x}
                          y={chartHeight - 6}
                          textAnchor="middle"
                          className="fill-muted font-mono text-[9px] font-semibold"
                        >
                          {d.hour}
                        </text>
                      );
                    })}

                    {/* Bars */}
                    {chartData.map((d, idx) => {
                      const barWidth = Math.max(2, (plotWidth / 24) * 0.7);
                      const x = paddingLeft + (idx * (plotWidth / 23)) - (barWidth / 2);
                      const barHeight = (d.total / maxTotal) * plotHeight;
                      const y = paddingTop + plotHeight - barHeight;

                      return (
                        <g key={idx} className="group cursor-pointer">
                          {/* Interactive hover background */}
                          <rect
                            x={x - 2}
                            y={paddingTop}
                            width={barWidth + 4}
                            height={plotHeight}
                            className="fill-transparent hover:fill-primary/5 transition-colors"
                          />
                          {/* Actual data bar */}
                          <rect
                            x={x}
                            y={y}
                            width={barWidth}
                            height={Math.max(1, barHeight)}
                            rx="2"
                            className="fill-primary group-hover:fill-primary-hover transition-colors"
                          />
                          {/* Tooltip on hover */}
                          <title>{`${d.hour}: Rs ${d.total.toFixed(2)}`}</title>
                        </g>
                      );
                    })}
                  </svg>
                </div>
              </div>
            </div>

            {/* Right Column: Alerts & Side-stats */}
            <div className="rounded-xl border border-border bg-surface p-5 shadow-sm space-y-4">
              <h2 className="text-xs font-bold text-ink uppercase tracking-wider">Alerts & Actions</h2>
              
              <div className="divide-y divide-border">
                {/* Low Stock Alert */}
                <div className="flex justify-between items-center py-3">
                  <div>
                    <span className="text-xs font-semibold text-ink block">Low Stock Products</span>
                    <span className="text-[10px] text-muted block">Items at or below thresholds</span>
                  </div>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                      summary.stock.lowStockCount > 0
                        ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                        : 'bg-canvas text-muted border border-border'
                    }`}
                  >
                    {summary.stock.lowStockCount}
                  </span>
                </div>

                {/* Overdue Installments Alert */}
                <div className="flex justify-between items-center py-3">
                  <div>
                    <span className="text-xs font-semibold text-ink block">Overdue Installment Plans</span>
                    <span className="text-[10px] text-muted block">
                      Tied up: Rs {summary.installments.overdueValue.toFixed(0)}
                    </span>
                  </div>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                      summary.installments.overdueCount > 0
                        ? 'bg-rose-500/10 text-rose-500 border border-rose-500/20'
                        : 'bg-canvas text-muted border border-border'
                    }`}
                  >
                    {summary.installments.overdueCount}
                  </span>
                </div>

                {/* Active Repairs */}
                <div className="flex justify-between items-center py-3">
                  <div>
                    <span className="text-xs font-semibold text-ink block">Pending Device Repairs</span>
                    <span className="text-[10px] text-muted block">In progress or received status</span>
                  </div>
                  <span className="rounded-full bg-blue-500/10 text-blue-500 border border-blue-500/20 px-2.5 py-0.5 text-xs font-bold">
                    {summary.repairs.activeCount}
                  </span>
                </div>
              </div>

              {/* Status details for repairs */}
              <div className="rounded-lg bg-canvas border border-border p-3 space-y-1.5 text-[10px] font-medium text-muted">
                <span className="font-bold uppercase tracking-wider text-ink block mb-1">Repairs Status Breakdown</span>
                {summary.repairs.byStatus.length === 0 ? (
                  <p className="italic">No active repair tickets.</p>
                ) : (
                  summary.repairs.byStatus.map((g) => (
                    <div key={g.status} className="flex justify-between">
                      <span>{g.status}:</span>
                      <span className="font-bold text-ink">{g.count}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Top Selling Products List */}
          <div className="rounded-xl border border-border bg-surface p-5 shadow-sm space-y-4">
            <h2 className="text-xs font-bold text-ink uppercase tracking-wider">Top 10 Selling Products</h2>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-xs text-ink bg-canvas rounded-lg overflow-hidden border border-border">
                <thead>
                  <tr className="border-b border-border bg-surface text-[10px] font-bold text-muted uppercase">
                    <th className="px-4 py-2.5">Product Name</th>
                    <th className="px-4 py-2.5 text-right">Units Sold</th>
                    <th className="px-4 py-2.5 text-right">Total Revenue Generated</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {summary.topSellingProducts.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="px-4 py-6 text-center text-muted italic">
                        No sales recorded yet.
                      </td>
                    </tr>
                  ) : (
                    summary.topSellingProducts.map((p, i) => (
                      <tr key={i} className="hover:bg-surface-hover transition-colors">
                        <td className="px-4 py-3 font-medium">{p.name}</td>
                        <td className="px-4 py-3 text-right font-mono font-semibold">{p.quantity}</td>
                        <td className="px-4 py-3 text-right font-mono font-bold">Rs {p.revenue.toFixed(2)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        <div className="flex flex-1 items-center justify-center py-10">
          <p className="text-sm text-muted">Gathering summary stats...</p>
        </div>
      )}
    </div>
  );
}
