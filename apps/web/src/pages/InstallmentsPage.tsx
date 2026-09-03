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

  const settings = useAppSelector((s) => s.settings.data);
  const { items, total, page, pages, selectedPlan, loading, saving, error, filters } =
    useAppSelector((s) => s.installments);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [salesSearch, setSalesSearch] = useState('');
  const [completedSales, setCompletedSales] = useState<SaleMinimal[]>([]);
  const [selectedSale, setSelectedSale] = useState<SaleMinimal | null>(null);

  // Barcode scanner lookup input (Q10)
  const [barcodeSearch, setBarcodeSearch] = useState('');
  const [barcodeSearching, setBarcodeSearching] = useState(false);
  const [barcodeError, setBarcodeError] = useState<string | null>(null);

  // Create plan state
  const [downPayment, setDownPayment] = useState('');
  const [numberOfInstallments, setNumberOfInstallments] = useState('6');
  const [intervalDays, setIntervalDays] = useState('30');
  const [interestMethod, setInterestMethod] = useState<'PERCENTAGE' | 'FIXED_AMOUNT'>('PERCENTAGE');
  const [interestValue, setInterestValue] = useState('12');
  const [guarantorName, setGuarantorName] = useState('');
  const [guarantorNic, setGuarantorNic] = useState('');
  const [guarantorPhone, setGuarantorPhone] = useState('');
  const [guarantorAddress, setGuarantorAddress] = useState('');
  const [guarantorPhotoUrl, setGuarantorPhotoUrl] = useState('');
  const [guarantorConsent, setGuarantorConsent] = useState(true);

  // Record payment state: Strictly Cash & Bank Transfer only (Q12)
  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState<'CASH' | 'BANK_TRANSFER'>('CASH');

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

          // Pre-fill defaults from query params or settings (Q13)
          const urlDown = searchParams.get('downPayment');
          const urlMonths = searchParams.get('months');
          const urlInterest = searchParams.get('interest');

          const defaultDownPct = settings?.defaultDownPaymentPercent ? Number(settings.defaultDownPaymentPercent) : 35;
          const calculatedDown = urlDown ? urlDown : ((Number(sale.total) * defaultDownPct) / 100).toFixed(2);

          setDownPayment(calculatedDown);
          setNumberOfInstallments(urlMonths || '6');
          setInterestValue(urlInterest || String(settings?.defaultInterestValue ?? 12));
          setInterestMethod(settings?.defaultInterestMethod || 'PERCENTAGE');

          setShowCreateModal(true);
          const updatedParams = new URLSearchParams(searchParams);
          updatedParams.delete('createSaleId');
          setSearchParams(updatedParams);
        })
        .catch((err) => console.error(err));
    }
  }, [createSaleId, settings]);

  async function handleBarcodeLookup() {
    const code = barcodeSearch.trim();
    if (!code) return;
    setBarcodeSearching(true);
    setBarcodeError(null);
    try {
      const plan = await api.get<InstallmentPlan>(`/agreements/lookup/${encodeURIComponent(code)}`);
      dispatch(planDetailRequested(plan.id));
      setBarcodeSearch('');
    } catch {
      setBarcodeError(`No agreement found for barcode "${code}"`);
    } finally {
      setBarcodeSearching(false);
    }
  }



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
        interestMethod,
        interestValue: parseFloat(interestValue) || 0,
        guarantorName: guarantorName || undefined,
        guarantorNic: guarantorNic || undefined,
        guarantorPhone: guarantorPhone || undefined,
        guarantorAddress: guarantorAddress || undefined,
        guarantorPhotoUrl: guarantorPhotoUrl || undefined,
        guarantorConsentGiven: guarantorConsent,
      })
    );

    // Reset create state
    setSelectedSale(null);
    setDownPayment('');
    setGuarantorName('');
    setGuarantorNic('');
    setGuarantorPhone('');
    setGuarantorAddress('');
    setGuarantorPhotoUrl('');
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

  function printAgreementSticker(plan: InstallmentPlan) {
    const printWindow = window.open('', '_blank', 'width=400,height=300');
    if (!printWindow) return;
    const barcode = plan.agreementBarcode || `AGR-${plan.id.slice(-8).toUpperCase()}`;
    const custName = plan.sale?.customer?.name || 'Walk-in';
    const date = new Date(plan.createdAt).toLocaleDateString();
    const totalPay = Number(plan.totalPayable || plan.remainingBalance).toFixed(2);

    printWindow.document.write(`
      <html>
        <head>
          <title>Agreement Sticker - ${barcode}</title>
          <style>
            body { font-family: monospace; padding: 12px; margin: 0; text-align: center; }
            .badge { font-size: 11px; font-weight: bold; border-bottom: 1px dashed #000; padding-bottom: 4px; margin-bottom: 6px; }
            .barcode-box { font-size: 18px; font-weight: 900; letter-spacing: 2px; margin: 8px 0; border: 2px solid #000; padding: 6px; display: inline-block; }
            .details { font-size: 10px; text-align: left; margin-top: 6px; }
          </style>
        </head>
        <body>
          <div class="badge">PHYSICAL AGREEMENT STICKER</div>
          <div class="barcode-box">*${barcode}*</div>
          <div class="details">
            <div><strong>Agreement:</strong> ${barcode}</div>
            <div><strong>Customer:</strong> ${custName}</div>
            <div><strong>Date:</strong> ${date}</div>
            <div><strong>Total Credit:</strong> Rs ${totalPay}</div>
          </div>
          <script>
            window.onload = function() { window.print(); window.close(); }
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  }

  return (
    <div className="flex h-full flex-col min-h-0 bg-canvas">
      {/* Header with Barcode Scanner Search */}
      <div className="flex items-center justify-between border-b border-border bg-surface px-6 py-3.5 gap-4">
        <div>
          <h1 className="text-lg font-bold text-ink">Installment Plans &amp; Physical Agreements</h1>
          <p className="text-xs text-muted">Scan agreement barcode stickers, track schedules, interest, and credit balances</p>
        </div>

        {/* Scan Agreement Barcode Input (Q10) */}
        <div className="flex items-center gap-2 max-w-sm flex-1">
          <div className="relative flex-1">
            <Input
              placeholder="Scan Agreement Barcode (AGR-…)"
              value={barcodeSearch}
              onChange={(e) => setBarcodeSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleBarcodeLookup();
              }}
              className="w-full text-xs py-1.5 font-mono"
            />
            {barcodeSearching ? (
              <span className="absolute right-2 top-2 text-[10px] text-muted">Searching…</span>
            ) : null}
          </div>
          <Button
            onClick={handleBarcodeLookup}
            variant="secondary"
            className="py-1 px-3 text-xs"
          >
            Lookup
          </Button>
        </div>

        <Button
          onClick={() => {
            setSelectedSale(null);
            setSalesSearch('');
            setShowCreateModal(true);
          }}
          className="text-xs font-bold"
        >
          + Create Installment Plan
        </Button>
      </div>

      {barcodeError ? (
        <div className="bg-rose-500/10 border-b border-rose-500/20 text-rose-600 px-6 py-2 text-xs font-medium">
          {barcodeError}
        </div>
      ) : null}

      {/* Grid container */}
      <div className="grid flex-1 grid-cols-[1fr_420px] min-h-0 gap-0">
        {/* Left Side: Plans list */}
        <div className="flex flex-col min-h-0 border-r border-border p-4">
          <div className="flex items-center justify-between pb-3">
            <select
              value={filters.status}
              onChange={(e) => handleFilterStatusChange(e.target.value)}
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
                        onClick={() => dispatch(planDetailRequested(item.id))}
                        className={`cursor-pointer hover:bg-canvas transition-colors ${
                          selectedPlan?.id === item.id ? 'bg-canvas font-semibold' : ''
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

        {/* Right Side: Detail Drawer */}
        <div className="flex flex-col min-h-0 bg-surface p-5 overflow-y-auto">
          {selectedPlan ? (
            <div className="space-y-4">
              {/* Header details & Barcode Sticker preview */}
              <div className="border-b border-border pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-sm font-bold text-ink">Agreement Record</h2>
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

                {/* Physical Agreement Barcode Sticker Banner (Q10) */}
                <div className="mt-3 rounded-xl border border-border bg-canvas p-3 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-semibold text-muted block">Physical Agreement Barcode</span>
                    <span className="text-sm font-mono font-extrabold text-ink tracking-wider block">
                      {selectedPlan.agreementBarcode || `AGR-${selectedPlan.id.slice(-8).toUpperCase()}`}
                    </span>
                    <span className="text-[10px] text-muted">Attach sticker to pre-printed physical agreement</span>
                  </div>
                  <Button
                    onClick={() => printAgreementSticker(selectedPlan)}
                    variant="secondary"
                    className="text-xs py-1 px-2.5 font-bold"
                  >
                    Print Sticker
                  </Button>
                </div>
              </div>

              {/* Customer and Guarantor Details */}
              <div className="grid grid-cols-2 gap-3">
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
                      {selectedPlan.guarantorConsentGiven ? (
                        <span className="text-[9px] text-emerald-600 font-semibold block mt-0.5">✓ Consent Verified</span>
                      ) : null}
                    </>
                  ) : (
                    <span className="text-xs text-muted italic block">No Guarantor Recorded</span>
                  )}
                </div>
              </div>

              {/* Financial Breakdown: Remaining Balance + Interest & Late Fees (Q7, Q8) */}
              <div className="rounded-xl bg-canvas border border-border p-3 space-y-1 text-xs">
                <div className="flex justify-between text-muted">
                  <span>Total Payable Credit:</span>
                  <span className="font-mono font-medium">
                    Rs {Number(selectedPlan.totalPayable || selectedPlan.remainingBalance).toFixed(2)}
                  </span>
                </div>
                {selectedPlan.interestAmount ? (
                  <div className="flex justify-between text-muted">
                    <span>Interest ({selectedPlan.interestValue || 0}%):</span>
                    <span className="font-mono">Rs {Number(selectedPlan.interestAmount).toFixed(2)}</span>
                  </div>
                ) : null}
                {selectedPlan.lateFeeAmount && Number(selectedPlan.lateFeeAmount) > 0 ? (
                  <div className="flex justify-between text-rose-500 font-bold">
                    <span>Late Fee Applied:</span>
                    <span className="font-mono">+ Rs {Number(selectedPlan.lateFeeAmount).toFixed(2)}</span>
                  </div>
                ) : null}
                <div className="border-t border-border pt-1.5 flex justify-between items-baseline font-bold text-ink">
                  <span>Remaining Balance:</span>
                  <span className="text-base font-mono font-extrabold text-primary">
                    Rs {Number(selectedPlan.remainingBalance).toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Installment Payment Schedule */}
              <div className="space-y-1.5">
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

              {/* Record Payment Form (STRICTLY Cash & Bank Transfer per Q12) */}
              {selectedPlan.status !== 'COMPLETE' ? (
                <form onSubmit={handleRecordPayment} className="space-y-2 border-t border-border pt-3">
                  <h3 className="text-xs font-bold text-ink uppercase tracking-wider">Record Payment (Cash / Bank Only)</h3>
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
                    {/* Only Cash and Bank Transfer (Q12) */}
                    <select
                      value={payMethod}
                      onChange={(e) => setPayMethod(e.target.value as any)}
                      className="rounded-lg border border-border bg-surface px-2.5 text-xs text-ink focus:border-primary focus:outline-none"
                    >
                      <option value="CASH">Cash</option>
                      <option value="BANK_TRANSFER">Bank Transfer</option>
                    </select>
                  </div>
                  <Button
                    type="submit"
                    loading={saving}
                    className="w-full py-2 text-xs font-bold"
                  >
                    Record Payment
                  </Button>
                </form>
              ) : null}

              {/* Close Button */}
              <div className="border-t border-border pt-3">
                <Button
                  onClick={() => dispatch(clearSelectedPlan())}
                  variant="secondary"
                  className="w-full text-xs"
                >
                  Close Plan Details
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex h-full flex-col items-center justify-center text-center p-4">
              <span className="text-3xl text-muted block mb-2">📄</span>
              <h3 className="text-sm font-semibold text-ink">No Plan Selected</h3>
              <p className="text-xs text-muted max-w-[220px] mt-1">
                Scan an agreement barcode or select from the list to view agreement sticker, guarantor info, and schedule.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Create Modal */}
      {showCreateModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-2xl border border-border bg-surface p-6 shadow-xl overflow-y-auto max-h-[90vh]">
            <h2 className="text-base font-bold text-ink mb-1">Create Installment Agreement</h2>
            <p className="text-xs text-muted mb-4">Set down payment, interest terms, and guarantor details.</p>

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
                  className="w-full text-xs"
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
                          // Set default 35% down payment (Q13)
                          const defaultDownPct = settings?.defaultDownPaymentPercent ? Number(settings.defaultDownPaymentPercent) : 35;
                          setDownPayment(((Number(s.total) * defaultDownPct) / 100).toFixed(2));
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

              {/* Schedule & Interest Config (Q7, Q13) */}
              <div className="grid grid-cols-2 gap-3">
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
                  <label className="text-[10px] font-semibold text-muted block mb-1">Installments (Months)</label>
                  <select
                    value={numberOfInstallments}
                    onChange={(e) => setNumberOfInstallments(e.target.value)}
                    className="w-full rounded-lg border border-border bg-surface px-2.5 py-1.5 text-xs text-ink"
                  >
                    <option value="3">3 Months</option>
                    <option value="6">6 Months</option>
                    <option value="12">12 Months</option>
                    <option value="4">4 Months</option>
                    <option value="24">24 Months</option>
                  </select>
                </div>
              </div>

              {/* Interest Method & Value (Q7) */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-semibold text-muted block mb-1">Interest Method</label>
                  <select
                    value={interestMethod}
                    onChange={(e) => setInterestMethod(e.target.value as any)}
                    className="w-full rounded-lg border border-border bg-surface px-2.5 py-1.5 text-xs text-ink"
                  >
                    <option value="PERCENTAGE">Percentage (%)</option>
                    <option value="FIXED_AMOUNT">Fixed Amount (Rs)</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-muted block mb-1">
                    {interestMethod === 'PERCENTAGE' ? 'Interest Rate (%)' : 'Interest Amount (Rs)'}
                  </label>
                  <Input
                    type="number"
                    min={0}
                    step="any"
                    placeholder="0.00"
                    value={interestValue === '0' ? '' : interestValue}
                    onChange={(e) => setInterestValue(e.target.value)}
                    className="w-full text-xs font-mono"
                  />
                </div>
              </div>

              {/* Live Preview of Calculations */}
              {selectedSale && downPayment ? (
                (() => {
                  const saleTotal = Number(selectedSale.total);
                  const dp = parseFloat(downPayment) || 0;
                  const principal = Math.max(0, saleTotal - dp);
                  const intVal = parseFloat(interestValue) || 0;
                  const intAmt = interestMethod === 'PERCENTAGE' ? (principal * intVal) / 100 : intVal;
                  const totalPay = principal + intAmt;
                  const count = parseInt(numberOfInstallments) || 1;
                  const monthly = totalPay / count;

                  return (
                    <div className="rounded-xl border border-border bg-canvas p-3 text-xs font-mono space-y-1">
                      <div className="flex justify-between text-muted">
                        <span>Principal Credit:</span>
                        <span>Rs {principal.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-muted">
                        <span>Interest Amount:</span>
                        <span>Rs {intAmt.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between font-bold text-ink border-t border-border pt-1">
                        <span>Total Payable:</span>
                        <span>Rs {totalPay.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between font-extrabold text-primary pt-0.5">
                        <span>Monthly Installment:</span>
                        <span>Rs {monthly.toFixed(2)} / month</span>
                      </div>
                    </div>
                  );
                })()
              ) : null}

              {/* Guarantor Details & Consent */}
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
                      placeholder="07XXXXXXXX"
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

                {/* Guarantor Photo URL and Consent Checkbox */}
                <div>
                  <label className="text-[10px] font-semibold text-muted block mb-1">Guarantor Photo (URL or Path)</label>
                  <Input
                    placeholder="https://... or path to photo"
                    value={guarantorPhotoUrl}
                    onChange={(e) => setGuarantorPhotoUrl(e.target.value)}
                    className="w-full text-xs"
                  />
                </div>

                <label className="flex items-center gap-2 text-xs text-muted cursor-pointer pt-1">
                  <input
                    type="checkbox"
                    checked={guarantorConsent}
                    onChange={(e) => setGuarantorConsent(e.target.checked)}
                    className="rounded border-border text-primary focus:ring-0"
                  />
                  <span>Guarantor consent &amp; agreement terms acknowledged</span>
                </label>
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
                  Create &amp; Generate Barcode
                </Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}

