import type { InstallmentPlan } from '../../../features/installments/installmentsSlice';
import { Button } from '../../../components/Button';
import { STATUS_COLORS, parseSchedule } from './types';

interface InstallmentPlansTableProps {
  items: InstallmentPlan[];
  total: number;
  page: number;
  pages: number;
  loading: boolean;
  selectedPlanId?: string;
  statusFilter: string;
  onFilterChange: (status: string) => void;
  onSelectPlan: (id: string) => void;
  onPageChange: (nextPage: number) => void;
}

export function InstallmentPlansTable({
  items,
  total,
  page,
  pages,
  loading,
  selectedPlanId,
  statusFilter,
  onFilterChange,
  onSelectPlan,
  onPageChange,
}: InstallmentPlansTableProps) {
  const getNextDueDate = (plan: InstallmentPlan) => {
    if (plan.status === 'COMPLETE' || Number(plan.remainingBalance) === 0) {
      const schedule = parseSchedule(plan.scheduleJson);
      const lastPaid = [...schedule].reverse().find((s) => s.paid && s.paidAt);
      const closedDate = lastPaid?.paidAt
        ? new Date(lastPaid.paidAt).toLocaleDateString()
        : new Date(plan.updatedAt || plan.createdAt).toLocaleDateString();
      return `Closed (${closedDate})`;
    }
    const schedule = parseSchedule(plan.scheduleJson);
    const nextUnpaid = schedule.find((s) => !s.paid);
    return nextUnpaid ? new Date(nextUnpaid.dueDate).toLocaleDateString() : 'N/A';
  };

  return (
    <div className="flex flex-col min-h-0 border-r border-border p-4">
      <div className="flex items-center justify-between pb-3">
        <select
          value={statusFilter}
          onChange={(e) => onFilterChange(e.target.value)}
          className="rounded-lg border border-border bg-surface px-3 py-1.5 text-xs text-ink focus:border-primary focus:outline-none cursor-pointer"
        >
          <option value="ALL">All Statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="OVERDUE">Overdue</option>
          <option value="COMPLETE">Complete</option>
        </select>
        <span className="text-xs text-muted font-medium">{total} total agreements</span>
      </div>

      {loading && items.length === 0 ? (
        <div className="flex flex-1 items-center justify-center">
          <p className="text-sm text-muted">Loading installment plans...</p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto rounded-xl border border-border bg-surface">
          <table className="w-full border-collapse text-left text-xs text-ink">
            <thead>
              <tr className="border-b border-border bg-canvas text-xs font-bold text-muted uppercase">
                <th className="px-4 py-3">Customer / Barcode</th>
                <th className="px-4 py-3">Remaining Balance</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Next Due Date</th>
                <th className="px-4 py-3">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {items.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-muted">
                    No installment plans found.
                  </td>
                </tr>
              ) : (
                items.map((item) => (
                  <tr
                    key={item.id}
                    onClick={() => onSelectPlan(item.id)}
                    className={`cursor-pointer hover:bg-canvas transition-colors ${
                      selectedPlanId === item.id ? 'bg-canvas font-semibold' : ''
                    }`}
                  >
                    <td className="px-4 py-3.5">
                      <div className="font-semibold text-ink">
                        {item.sale?.customer?.name || 'Walk-in'}
                      </div>
                      <div className="text-[10px] text-muted">{item.sale?.customer?.phone}</div>
                      {item.agreementBarcode ? (
                        <span className="inline-block mt-0.5 font-mono text-[9px] text-primary bg-primary/10 px-1.5 py-0.2 rounded">
                          {item.agreementBarcode}
                        </span>
                      ) : null}
                    </td>
                    <td className="px-4 py-3.5 font-mono font-bold text-ink">
                      Rs {Number(item.remainingBalance).toFixed(2)}
                    </td>
                    <td className="px-4 py-3.5">
                      <span
                        className={`rounded-full border px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${
                          STATUS_COLORS[item.status] || ''
                        }`}
                      >
                        {item.status}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-muted">{getNextDueDate(item)}</td>
                    <td className="px-4 py-3.5 text-muted">
                      {new Date(item.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {pages > 1 ? (
        <div className="flex items-center justify-between border-t border-border pt-4 mt-3">
          <span className="text-xs text-muted">
            Showing page {page} of {pages} ({total} total plans)
          </span>
          <div className="flex gap-1.5">
            <Button
              disabled={page === 1}
              onClick={() => onPageChange(page - 1)}
              variant="secondary"
              className="py-1 px-3"
            >
              Previous
            </Button>
            <Button
              disabled={page === pages}
              onClick={() => onPageChange(page + 1)}
              variant="secondary"
              className="py-1 px-3"
            >
              Next
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
