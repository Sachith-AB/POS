import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../app/hooks';
import {
  plansRequested,
  filtersChanged,
  planDetailRequested,
  planCreateRequested,
  paymentRecordRequested,
  clearSelectedPlan,
  type InstallmentPlan,
} from '../features/installments/installmentsSlice';
import { Input } from '../components/Input';
import { Button } from '../components/Button';
import { api } from '../lib/api';

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  COMPLETE: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
  OVERDUE: 'bg-rose-500/10 text-rose-500 border-rose-500/20',
};

interface SaleMinimal {
  id: string;
  total: string;
  createdAt: string;
  customer?: {
    name: string | null;
    phone: string;
  } | null;
}

export function InstallmentsPage() {
  const dispatch = useAppDispatch();
  const [searchParams, setSearchParams] = useSearchParams();
  const createSaleId = searchParams.get('createSaleId');

  const { items, total, page, pages, selectedPlan, loading, saving, error, filters } =
    useAppSelector((s) => s.installments);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [salesSearch, setSalesSearch] = useState('');
  const [completedSales, setCompletedSales] = useState<SaleMinimal[]>([]);
  const [selectedSale, setSelectedSale] = useState<SaleMinimal | null>(null);

  // Create plan state
  const [downPayment, setDownPayment] = useState('');
  const [numberOfInstallments, setNumberOfInstallments] = useState('4');
  const [intervalDays, setIntervalDays] = useState('30');
  const [guarantorName, setGuarantorName] = useState('');
  const [guarantorNic, setGuarantorNic] = useState('');
  const [guarantorPhone, setGuarantorPhone] = useState('');
  const [guarantorAddress, setGuarantorAddress] = useState('');

  // Record payment state
  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState<'CASH' | 'CARD' | 'BANK_TRANSFER' | 'EZ_CASH_ONLINE'>('CASH');

  useEffect(() => {
    dispatch(plansRequested(filters));
  }, [dispatch]);

  // Handle URL creation trigger
  useEffect(() => {
    if (createSaleId) {
      api
        .get<any>(`/sales/${createSaleId}`)
        .then((sale) => {
          setSelectedSale({
            id: sale.id,
            total: sale.total,
            createdAt: sale.createdAt,
            customer: sale.customer,
          });
          setShowCreateModal(true);
          const updatedParams = new URLSearchParams(searchParams);
          updatedParams.delete('createSaleId');
          setSearchParams(updatedParams);
        })
        .catch((err) => console.error(err));
    }
  }, [createSaleId]);


  // Fetch completed sales for dropdown search
  useEffect(() => {
    if (showCreateModal && salesSearch.trim().length >= 2) {
      api.get<any>(`/sales?search=${encodeURIComponent(salesSearch)}`).then((res) => {
        // Filter out those that are not completed
        const list = (res.items || res || []).filter(
          (s: any) => s.status === 'COMPLETED'
        );
        setCompletedSales(list);
      }).catch((err) => console.error(err));
    } else {
      setCompletedSales([]);
    }
  }, [showCreateModal, salesSearch]);

  function handleFilterStatusChange(status: string) {
    dispatch(filtersChanged({ status, page: 1 }));
    dispatch(plansRequested({ ...filters, status, page: 1 }));
  }

  function handlePageChange(nextPage: number) {
    dispatch(filtersChanged({ page: nextPage }));
    dispatch(plansRequested({ ...filters, page: nextPage }));
  }

  function handleCreatePlan(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedSale || !downPayment || !numberOfInstallments || !intervalDays) return;

    dispatch(
      planCreateRequested({
        saleId: selectedSale.id,
        downPayment: parseFloat(downPayment),
        numberOfInstallments: parseInt(numberOfInstallments),
        intervalDays: parseInt(intervalDays),
        guarantorName: guarantorName || undefined,
        guarantorNic: guarantorNic || undefined,
        guarantorPhone: guarantorPhone || undefined,
        guarantorAddress: guarantorAddress || undefined,
      })
    );

    // Reset create state
    setSelectedSale(null);
    setDownPayment('');
    setGuarantorName('');
    setGuarantorNic('');
    setGuarantorPhone('');
    setGuarantorAddress('');
    setShowCreateModal(false);
  }

  function handleRecordPayment(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedPlan || !payAmount) return;

    dispatch(
      paymentRecordRequested({
        planId: selectedPlan.id,
        amount: parseFloat(payAmount),
        method: payMethod,
      })
    );

    setPayAmount('');
  }

  // Helper to parse schedule JSON safely
  const parseSchedule = (scheduleJson: any) => {
    try {
      return Array.isArray(scheduleJson)
        ? scheduleJson
        : JSON.parse(scheduleJson as string);
    } catch {
      return [];
    }
  };

  const getNextDueDate = (plan: InstallmentPlan) => {
    const schedule = parseSchedule(plan.scheduleJson);
    const nextUnpaid = schedule.find((s: any) => !s.paid);
    return nextUnpaid ? new Date(nextUnpaid.dueDate).toLocaleDateString() : 'N/A';
  };

  return (
    <div className="flex h-full flex-col min-h-0 bg-canvas">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border bg-surface px-6 py-4">
        <div>
          <h1 className="text-xl font-bold text-ink">Guarantor Installment Plans</h1>
          <p className="text-xs text-muted">Create payment schedules, track balances, and manage guarantors</p>
        </div>
        <Button
          onClick={() => {
            setSelectedSale(null);
            setSalesSearch('');
            setShowCreateModal(true);
          }}
        >
          + Create Installment Plan
        </Button>
      </div>

      {/* Grid container */}
      <div className="grid flex-1 grid-cols-[1fr_400px] min-h-0 gap-0">
        {/* Left Side: Plans list */}
        <div className="flex flex-col min-h-0 border-r border-border p-4">
          <div className="flex gap-3 pb-4">
            <select
              value={filters.status}
              onChange={(e) => handleFilterStatusChange(e.target.value)}
              className="rounded-lg border border-border bg-surface px-3 py-2 text-xs text-ink focus:border-primary focus:outline-none"
            >
              <option value="ALL">All Statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="OVERDUE">Overdue</option>
              <option value="COMPLETE">Complete</option>
            </select>
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
                    <th className="px-4 py-3">Customer</th>
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
                        onClick={() => dispatch(planDetailRequested(item.id))}
                        className={`cursor-pointer hover:bg-canvas transition-colors ${
                          selectedPlan?.id === item.id ? 'bg-canvas font-semibold' : ''
                        }`}
                      >
                        <td className="px-4 py-3.5">
                          <div className="font-semibold">
                            {item.sale?.customer?.name || 'Walk-in'}
                          </div>
                          <div className="text-[10px] text-muted">{item.sale?.customer?.phone}</div>
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
                  onClick={() => handlePageChange(page - 1)}
                  variant="secondary"
                  className="py-1 px-3"
                >
                  Previous
                </Button>
                <Button
                  disabled={page === pages}
                  onClick={() => handlePageChange(page + 1)}
                  variant="secondary"
                  className="py-1 px-3"
                >
                  Next
                </Button>
              </div>
            </div>
          ) : null}
        </div>

        {/* Right Side: Detail Editor */}
        <div className="flex flex-col min-h-0 bg-surface p-6 overflow-y-auto">
          {selectedPlan ? (
            <div className="space-y-6">
              {/* Header details */}
              <div className="flex items-start justify-between border-b border-border pb-4">
                <div>
                  <h2 className="text-base font-bold text-ink">Plan Details</h2>
                  <span className="text-[10px] text-muted">Plan ID: {selectedPlan.id}</span>
                </div>
                <span
                  className={`rounded-full border px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wide ${
                    STATUS_COLORS[selectedPlan.status] || ''
                  }`}
                >
                  {selectedPlan.status}
                </span>
              </div>

              {/* Customer and Guarantor Details */}
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-xl border border-border bg-canvas p-3">
                  <span className="text-[9px] font-bold uppercase text-muted block mb-1">Customer</span>
                  <span className="text-xs font-semibold text-ink block">
                    {selectedPlan.sale?.customer?.name || 'Walk-in'}
                  </span>
                  <span className="text-xs text-muted font-mono block">
                    {selectedPlan.sale?.customer?.phone}
                  </span>
                </div>

                <div className="rounded-xl border border-border bg-canvas p-3">
                  <span className="text-[9px] font-bold uppercase text-muted block mb-1">Guarantor</span>
                  {selectedPlan.guarantorName ? (
                    <>
                      <span className="text-xs font-semibold text-ink block">
                        {selectedPlan.guarantorName}
                      </span>
                      <span className="text-[10px] text-muted block">NIC: {selectedPlan.guarantorNic}</span>
                      <span className="text-[10px] text-muted block">Phone: {selectedPlan.guarantorPhone}</span>
                      <span className="text-[9px] text-muted block truncate" title={selectedPlan.guarantorAddress || ''}>
                        {selectedPlan.guarantorAddress}
                      </span>
                    </>
                  ) : (
                    <span className="text-xs text-muted italic block">No Guarantor Recorded</span>
                  )}
                </div>
              </div>

              {/* Remaining Balance Card */}
              <div className="rounded-xl bg-primary/5 border border-primary/10 p-4 text-center">
                <span className="text-xs text-muted font-semibold uppercase block">Remaining Balance</span>
                <span className="text-xl font-bold font-mono text-primary mt-1 block">
                  Rs {Number(selectedPlan.remainingBalance).toFixed(2)}
                </span>
              </div>

              {/* Installment Payment Schedule */}
              <div className="space-y-2">
                <h3 className="text-xs font-bold text-ink uppercase tracking-wider">Installment Schedule</h3>
                <div className="rounded-xl border border-border overflow-hidden">
                  <table className="w-full border-collapse text-left text-[11px] text-ink bg-canvas">
                    <thead>
                      <tr className="border-b border-border bg-surface font-bold text-muted uppercase text-[9px]">
                        <th className="px-3 py-2">#</th>
                        <th className="px-3 py-2">Due Date</th>
                        <th className="px-3 py-2">Amount</th>
                        <th className="px-3 py-2">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {parseSchedule(selectedPlan.scheduleJson).map((inst: any, idx: number) => (
                        <tr key={idx} className={inst.paid ? 'bg-emerald-500/5' : ''}>
                          <td className="px-3 py-2 font-bold">{inst.installmentNumber}</td>
                          <td className="px-3 py-2 text-muted">
                            {new Date(inst.dueDate).toLocaleDateString()}
                          </td>
                          <td className="px-3 py-2 font-mono">Rs {inst.amount.toFixed(2)}</td>
                          <td className="px-3 py-2">
                            {inst.paid ? (
                              <span className="text-emerald-500 font-bold">✓ Paid</span>
                            ) : inst.paidAmount && inst.paidAmount > 0 ? (
                              <span className="text-amber-500 font-bold">
                                Part (Rs {inst.paidAmount.toFixed(0)})
                              </span>
                            ) : (
                              <span className="text-muted italic">Pending</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Record Payment Form */}
              {selectedPlan.status !== 'COMPLETE' ? (
                <form onSubmit={handleRecordPayment} className="space-y-3 border-t border-border pt-4">
                  <h3 className="text-xs font-bold text-ink uppercase tracking-wider">Record Installment Payment</h3>
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <Input
                        required
                        type="number"
                        min={0.01}
                        step="any"
                        placeholder="Amount to pay"
                        value={payAmount}
                        onChange={(e) => setPayAmount(e.target.value)}
                        className="w-full font-mono text-xs"
                      />
                    </div>
                    <select
                      value={payMethod}
                      onChange={(e) => setPayMethod(e.target.value as any)}
                      className="rounded-lg border border-border bg-surface px-2.5 text-xs text-ink focus:border-primary focus:outline-none"
                    >
                      <option value="CASH">Cash</option>
                      <option value="CARD">Card</option>
                      <option value="BANK_TRANSFER">Bank Transfer</option>
                      <option value="EZ_CASH_ONLINE">eZ Cash</option>
                    </select>
                  </div>
                  <Button
                    type="submit"
                    loading={saving}
                    className="w-full"
                  >
                    Record Payment
                  </Button>
                </form>
              ) : null}

              {/* Close Button */}
              <div className="border-t border-border pt-4">
                  <Button
                    onClick={() => dispatch(clearSelectedPlan())}
                    variant="secondary"
                    className="w-full"
                  >
                    Close Plan Details
                  </Button>
              </div>
            </div>
          ) : (
            <div className="flex h-full flex-col items-center justify-center text-center p-4">
              <span className="text-3xl text-muted block mb-2">📄</span>
              <h3 className="text-sm font-semibold text-ink">No Plan Selected</h3>
              <p className="text-xs text-muted max-w-[200px] mt-1">
                Select an installment plan from the list to view guarantor info, schedule, and record payments.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Create Modal */}
      {showCreateModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-xl border border-border bg-surface p-6 shadow-lg overflow-y-auto max-h-[90vh]">
            <h2 className="text-base font-bold text-ink mb-4">Create Installment Plan</h2>
            <form onSubmit={handleCreatePlan} className="space-y-4">
              {/* Search Completed Sales */}
              <div>
                <label className="text-xs font-semibold text-muted block mb-1">
                  Search Completed Sale (By Client Name, Phone, or ID)
                </label>
                <Input
                  placeholder="Type to search completed sales..."
                  value={salesSearch}
                  onChange={(e) => setSalesSearch(e.target.value)}
                  className="w-full"
                />
                
                {completedSales.length > 0 ? (
                  <div className="mt-1 max-h-32 overflow-y-auto border border-border rounded-lg bg-canvas divide-y divide-border">
                    {completedSales.map((s) => (
                      <div
                        key={s.id}
                        onClick={() => {
                          setSelectedSale(s);
                          setCompletedSales([]);
                          setSalesSearch('');
                        }}
                        className="p-2 text-xs text-ink cursor-pointer hover:bg-surface-hover flex justify-between"
                      >
                        <div>
                          <span className="font-bold">{s.customer?.name || 'Walk-in'}</span>
                          <span className="text-muted ml-2">({s.customer?.phone})</span>
                        </div>
                        <span className="font-mono font-bold">Rs {Number(s.total).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>

              {selectedSale ? (
                <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 text-xs">
                  <p className="font-bold text-primary">Selected Sale Summary:</p>
                  <p className="mt-1">Customer: {selectedSale.customer?.name || 'Walk-in'} ({selectedSale.customer?.phone})</p>
                  <p>Sale Date: {new Date(selectedSale.createdAt).toLocaleDateString()}</p>
                  <p className="font-bold">Total Bill: Rs {Number(selectedSale.total).toFixed(2)}</p>
                </div>
              ) : null}

              {/* Schedule config */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-[10px] font-semibold text-muted block mb-1">Down Payment (Rs)</label>
                  <Input
                    required
                    type="number"
                    min={0}
                    placeholder="0.00"
                    value={downPayment}
                    onChange={(e) => setDownPayment(e.target.value)}
                    className="w-full text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-muted block mb-1">Installments Count</label>
                  <Input
                    required
                    type="number"
                    min={1}
                    value={numberOfInstallments}
                    onChange={(e) => setNumberOfInstallments(e.target.value)}
                    className="w-full text-xs"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-muted block mb-1">Interval Days</label>
                  <Input
                    required
                    type="number"
                    min={1}
                    value={intervalDays}
                    onChange={(e) => setIntervalDays(e.target.value)}
                    className="w-full text-xs"
                  />
                </div>
              </div>

              {/* Guarantor Details */}
              <div className="border-t border-border pt-3 space-y-3">
                <h3 className="text-xs font-bold text-ink uppercase tracking-wide">Guarantor Information</h3>
                
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-semibold text-muted block mb-1">Guarantor Name</label>
                    <Input
                      placeholder="Name"
                      value={guarantorName}
                      onChange={(e) => setGuarantorName(e.target.value)}
                      className="w-full text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-muted block mb-1">Guarantor Phone</label>
                    <Input
                      placeholder="Phone"
                      value={guarantorPhone}
                      onChange={(e) => setGuarantorPhone(e.target.value)}
                      className="w-full text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-semibold text-muted block mb-1">Guarantor NIC</label>
                    <Input
                      placeholder="National ID Card No."
                      value={guarantorNic}
                      onChange={(e) => setGuarantorNic(e.target.value)}
                      className="w-full text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-muted block mb-1">Guarantor Address</label>
                    <Input
                      placeholder="Address"
                      value={guarantorAddress}
                      onChange={(e) => setGuarantorAddress(e.target.value)}
                      className="w-full text-xs"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 border-t border-border pt-4">
                <Button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  variant="secondary"
                  className="px-4 py-2 text-xs font-bold"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={!selectedSale}
                  loading={saving}
                  className="px-4 py-2 text-xs font-bold"
                >
                  Create Plan
                </Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
