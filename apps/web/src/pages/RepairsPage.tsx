import { useEffect, useState } from 'react';
import { FiTrash2, FiExternalLink, FiTool, FiDollarSign } from 'react-icons/fi';
import { useAppDispatch, useAppSelector } from '../app/hooks';
import {
  ticketsRequested,
  filtersChanged,
  ticketDetailRequested,
  ticketCreateRequested,
  ticketUpdateRequested,
  photoUploadRequested,
  photoDeleteRequested,
  clearSelectedTicket,
  recentSaleCheckRequested,
  clearRecentSaleCheck,
  uncollectedTicketsRequested,
  sendUncollectedSmsRequested,
} from '../features/repairs/repairsSlice';
import { PhotoCapture } from '../components/PhotoCapture';
import { Button } from '../components/Button';
import { A5RepairBill } from '../components/A5RepairBill';
import { Input } from '../components/Input';
import { REPAIR_STATUSES } from '@pos/shared';
import { api } from '../lib/api';

const STATUS_COLORS: Record<string, string> = {
  RECEIVED: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  DIAGNOSING: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
  AWAITING_PARTS: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
  REPAIRED: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
  DELIVERED: 'bg-slate-500/10 text-muted border-border',
  CANCELLED: 'bg-rose-500/10 text-rose-500 border-rose-500/20',
};

interface TechnicianItem {
  id: string;
  name: string;
  role: string;
}

interface WarrantyOption {
  id: string;
  label: string;
  durationDays: number;
}

interface InventoryProduct {
  id: string;
  name: string;
  costPrice: number;
  sellPrice: number;
  quantity: number;
}

export function RepairsPage() {
  const dispatch = useAppDispatch();
  const {
    items,
    total,
    page,
    pages,
    selectedTicket,
    loading,
    saving,
    error,
    filters,
    recentSaleCheck,
    uncollectedTickets,
    uncollectedTotal,
    uncollectedThresholdDays,
    uncollectedLoading,
    sendingSms,
  } = useAppSelector((s) => s.repairs);
  const settings = useAppSelector((s) => s.settings.data);

  const [viewMode, setViewMode] = useState<'table' | 'kanban' | 'uncollected'>('table');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showPhotoCapture, setShowPhotoCapture] = useState(false);
  const [showOutsourceModal, setShowOutsourceModal] = useState(false);

  // Aux state
  const [technicians, setTechnicians] = useState<TechnicianItem[]>([]);
  const [warranties, setWarranties] = useState<WarrantyOption[]>([]);
  const [inventoryProducts, setInventoryProducts] = useState<InventoryProduct[]>([]);

  // Create ticket state
  const [phone, setPhone] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [deviceInfo, setDeviceInfo] = useState('');
  const [issue, setIssue] = useState('');
  const [technicianId, setTechnicianId] = useState('');
  const [advancePayment, setAdvancePayment] = useState('');
  const [warrantyPeriodId, setWarrantyPeriodId] = useState('');
  const [isThreeDayWarranty, setIsThreeDayWarranty] = useState(false);
  const [commissionMethod, setCommissionMethod] = useState<'PERCENTAGE' | 'FIXED_AMOUNT'>('PERCENTAGE');
  const [commissionValue, setCommissionValue] = useState('0');

  // Update ticket state
  const [estimate, setEstimate] = useState<number>(0);
  const [editAdvance, setEditAdvance] = useState<number>(0);
  const [editTechId, setEditTechId] = useState('');
  const [parts, setParts] = useState<{ productId?: string; name: string; cost: number; quantity?: number }[]>([]);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [newPartName, setNewPartName] = useState('');
  const [newPartCost, setNewPartCost] = useState('');

  // Outsourced repair form state (Q22)
  const [outPersonPlace, setOutPersonPlace] = useState('');
  const [outSentDate, setOutSentDate] = useState(new Date().toISOString().split('T')[0]);
  const [outExpectedDate, setOutExpectedDate] = useState('');
  const [outNotes, setOutNotes] = useState('');
  const [outsourcedList, setOutsourcedList] = useState<any[]>([]);

  useEffect(() => {
    dispatch(ticketsRequested(filters));

    // Load technicians
    api.get<TechnicianItem[]>('/employees').then((res) => {
      setTechnicians(res || []);
    }).catch(() => { });

    // Load repair warranties
    api.get<WarrantyOption[]>('/warranties?repairs=true').then((res) => {
      setWarranties(res || []);
    }).catch(() => { });

    // Load spare products
    api.get<InventoryProduct[]>('/products').then((res) => {
      setInventoryProducts(res || []);
    }).catch(() => { });
  }, [dispatch]);

  // Load uncollected tickets when switching viewMode to uncollected
  useEffect(() => {
    if (viewMode === 'uncollected') {
      dispatch(uncollectedTicketsRequested());
    }
  }, [viewMode, dispatch]);

  // Check recent sale when phone number changes in create modal
  useEffect(() => {
    if (showCreateModal && phone.trim().length >= 7) {
      dispatch(recentSaleCheckRequested(phone.trim()));
    } else if (!phone.trim()) {
      dispatch(clearRecentSaleCheck());
      setIsThreeDayWarranty(false);
    }
  }, [phone, showCreateModal, dispatch]);

  // Auto-check 3-day warranty if recent sale found
  useEffect(() => {
    if (recentSaleCheck.hasRecentSale) {
      setIsThreeDayWarranty(true);
    }
  }, [recentSaleCheck.hasRecentSale]);

  // Load estimate and parts when ticket selection changes
  useEffect(() => {
    if (selectedTicket) {
      setEstimate(selectedTicket.estimate ? Number(selectedTicket.estimate) : 0);
      setEditAdvance(selectedTicket.advancePayment ? Number(selectedTicket.advancePayment) : 0);
      setEditTechId(selectedTicket.technicianId || settings?.defaultTechnicianId || '');
      try {
        const parsedParts = selectedTicket.partsJson
          ? typeof selectedTicket.partsJson === 'string'
            ? JSON.parse(selectedTicket.partsJson)
            : selectedTicket.partsJson
          : [];
        setParts(Array.isArray(parsedParts) ? parsedParts : []);
      } catch {
        setParts([]);
      }

      // Load outsourced repairs for ticket
      api.get<any[]>(`/outsourced-repairs?repairTicketId=${selectedTicket.id}`)
        .then((data) => setOutsourcedList(data || []))
        .catch(() => setOutsourcedList([]));
    }
  }, [selectedTicket, settings]);

  function handleFilterStatusChange(status: string) {
    dispatch(filtersChanged({ status, page: 1 }));
    dispatch(ticketsRequested({ ...filters, status, page: 1 }));
  }

  function handleSearchChange(search: string) {
    dispatch(filtersChanged({ search, page: 1 }));
  }

  function handlePageChange(nextPage: number) {
    dispatch(filtersChanged({ page: nextPage }));
    dispatch(ticketsRequested({ ...filters, page: nextPage }));
  }

  function handleCreateTicket(e: React.FormEvent) {
    e.preventDefault();
    if (!phone || !deviceInfo || !issue) return;

    dispatch(
      ticketCreateRequested({
        phone,
        customerName: customerName || undefined,
        deviceInfo,
        issue,
        technicianId: technicianId || settings?.defaultTechnicianId || undefined,
        advancePayment: advancePayment ? parseFloat(advancePayment) : 0,
        warrantyPeriodId: warrantyPeriodId || undefined,
        commissionMethod,
        commissionValue: parseFloat(commissionValue) || 0,
        isThreeDayWarranty,
        warrantySaleId: recentSaleCheck.sale?.id || undefined,
      })
    );

    // Reset form and close
    setPhone('');
    setCustomerName('');
    setDeviceInfo('');
    setIssue('');
    setAdvancePayment('');
    setIsThreeDayWarranty(false);
    dispatch(clearRecentSaleCheck());
    setShowCreateModal(false);
  }

  function handleUpdateStatus(newStatus: string) {
    if (!selectedTicket) return;
    dispatch(
      ticketUpdateRequested({
        id: selectedTicket.id,
        input: { status: newStatus },
      })
    );
  }

  function handleSaveEstimateAndParts() {
    if (!selectedTicket) return;
    dispatch(
      ticketUpdateRequested({
        id: selectedTicket.id,
        input: {
          estimate,
          advancePayment: editAdvance,
          technicianId: editTechId || undefined,
          partsJson: parts,
        },
      })
    );
  }

  function handleAddPart() {
    if (selectedProductId) {
      const prod = inventoryProducts.find((p) => p.id === selectedProductId);
      if (prod) {
        setParts([
          ...parts,
          {
            productId: prod.id,
            name: prod.name,
            cost: Number(prod.sellPrice),
            quantity: 1,
          },
        ]);
        setSelectedProductId('');
        return;
      }
    }

    if (!newPartName.trim()) return;
    setParts([
      ...parts,
      {
        name: newPartName.trim(),
        cost: parseFloat(newPartCost) || 0,
        quantity: 1,
      },
    ]);
    setNewPartName('');
    setNewPartCost('');
  }

  function handleRemovePart(index: number) {
    setParts(parts.filter((_, i) => i !== index));
  }

  function handlePhotoCaptured(file: File) {
    if (!selectedTicket) return;
    dispatch(photoUploadRequested({ id: selectedTicket.id, file }));
    setShowPhotoCapture(false);
  }

  function handleDeletePhoto(index: number) {
    if (!selectedTicket) return;
    dispatch(photoDeleteRequested({ id: selectedTicket.id, index }));
  }

  async function handleCreateOutsourced(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedTicket || !outPersonPlace || !outSentDate) return;

    try {
      const created = await api.post('/outsourced-repairs', {
        repairTicketId: selectedTicket.id,
        personOrPlace: outPersonPlace,
        sentDate: new Date(outSentDate).toISOString(),
        expectedReturnDate: outExpectedDate ? new Date(outExpectedDate).toISOString() : null,
        reminderNotes: outNotes || null,
      });
      setOutsourcedList([created, ...outsourcedList]);
      setShowOutsourceModal(false);
      setOutPersonPlace('');
      setOutNotes('');
    } catch (err: any) {
      alert(err.message || 'Failed to create outsourced repair');
    }
  }

  function handlePrintSlip() {
    window.print();
  }

  const remainingBalance = Math.max(0, estimate - editAdvance);

  return (
    <div className="flex h-full flex-col min-h-0 bg-canvas">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border bg-surface px-6 py-3.5">
        <div>
          <h1 className="text-lg font-bold text-ink">Repairs &amp; Service Management</h1>
          <p className="text-xs text-muted">A5 Bill Book, spare parts deduction, technician commissions, and outsourced repairs</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Table / Kanban / Uncollected view toggle */}
          <div className="flex rounded-lg border border-border bg-canvas p-0.5">
            <button
              onClick={() => setViewMode('table')}
              className={`rounded-md px-2.5 py-1 text-xs font-semibold cursor-pointer ${viewMode === 'table' ? 'bg-surface text-ink shadow-xs' : 'text-muted'
                }`}
            >
              List
            </button>
            <button
              onClick={() => setViewMode('kanban')}
              className={`rounded-md px-2.5 py-1 text-xs font-semibold cursor-pointer ${viewMode === 'kanban' ? 'bg-surface text-ink shadow-xs' : 'text-muted'
                }`}
            >
              Board
            </button>
            <button
              onClick={() => setViewMode('uncollected')}
              className={`rounded-md px-2.5 py-1 text-xs font-semibold cursor-pointer flex items-center gap-1.5 ${viewMode === 'uncollected' ? 'bg-amber-500/10 text-amber-500 font-bold border border-amber-500/20' : 'text-muted'
                }`}
            >
              <span>Uncollected (&gt;30 Days)</span>
              {uncollectedTotal > 0 ? (
                <span className="rounded-full bg-amber-500 text-white px-1.5 py-0.2 text-[9px] font-bold">
                  {uncollectedTotal}
                </span>
              ) : null}
            </button>
          </div>

          <Button
            onClick={() => {
              setTechnicianId(settings?.defaultTechnicianId || '');
              setShowCreateModal(true);
            }}
            className="text-xs font-bold"
          >
            + New Intake Ticket
          </Button>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid flex-1 grid-cols-[1fr_440px] min-h-0 gap-0">
        {/* Left Side: Ticket List / Kanban */}
        <div className="flex flex-col min-h-0 border-r border-border p-4">
          <div className="flex gap-3 pb-3">
            <Input
              placeholder="Search by ticket #, customer, phone, device…"
              value={filters.search}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="flex-1 text-xs"
            />
            <select
              value={filters.status}
              onChange={(e) => handleFilterStatusChange(e.target.value)}
              className="rounded-lg border border-border bg-surface px-3 py-1.5 text-xs text-ink focus:border-primary focus:outline-none cursor-pointer"
            >
              <option value="ALL">All Statuses</option>
              {REPAIR_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {status.replace('_', ' ')}
                </option>
              ))}
            </select>
          </div>

          {loading && items.length === 0 ? (
            <div className="flex flex-1 items-center justify-center">
              <p className="text-sm text-muted">Loading repair tickets...</p>
            </div>
          ) : viewMode === 'table' ? (
            <div className="flex-1 overflow-y-auto rounded-xl border border-border bg-surface">
              <table className="w-full border-collapse text-left text-xs text-ink">
                <thead>
                  <tr className="border-b border-border bg-canvas text-xs font-bold text-muted uppercase">
                    <th className="px-3.5 py-2.5">Ticket #</th>
                    <th className="px-3.5 py-2.5">Device &amp; Issue</th>
                    <th className="px-3.5 py-2.5">Customer</th>
                    <th className="px-3.5 py-2.5">Estimate / Balance</th>
                    <th className="px-3.5 py-2.5">Status</th>
                    <th className="px-3.5 py-2.5">Intake Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {items.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-muted">
                        No repair tickets found.
                      </td>
                    </tr>
                  ) : (
                    items.map((item) => {
                      const est = item.estimate ? Number(item.estimate) : 0;
                      const adv = item.advancePayment ? Number(item.advancePayment) : 0;
                      const bal = Math.max(0, est - adv);

                      return (
                        <tr
                          key={item.id}
                          onClick={() => dispatch(ticketDetailRequested(item.id))}
                          className={`cursor-pointer hover:bg-canvas transition-colors ${selectedTicket?.id === item.id ? 'bg-canvas font-semibold' : ''
                            }`}
                        >
                          <td className="px-3.5 py-3 font-mono">
                            <div className="font-bold text-primary">{item.ticketNumber}</div>
                            {item.isThreeDayWarranty ? (
                              <span className="inline-block mt-0.5 rounded bg-amber-500/10 px-1.5 py-0.2 text-[9px] font-bold text-amber-500 border border-amber-500/20">
                                3-Day Claim
                              </span>
                            ) : null}
                          </td>
                          <td className="px-3.5 py-3 max-w-[160px]">
                            <div className="font-semibold truncate">{item.deviceInfo}</div>
                            <div className="text-[10px] text-muted truncate">{item.issue}</div>
                          </td>
                          <td className="px-3.5 py-3">
                            <div className="font-medium">{item.customer?.name || 'Walk-in'}</div>
                            <div className="text-[10px] text-muted">{item.customer?.phone}</div>
                          </td>
                          <td className="px-3.5 py-3 font-mono">
                            <div>Rs {est.toFixed(0)}</div>
                            {adv > 0 ? (
                              <div className="text-[10px] text-rose-600 font-semibold">
                                Bal: Rs {bal.toFixed(0)}
                              </div>
                            ) : null}
                          </td>
                          <td className="px-3.5 py-3">
                            <span
                              className={`rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${STATUS_COLORS[item.status] || ''
                                }`}
                            >
                              {item.status.replace('_', ' ')}
                            </span>
                          </td>
                          <td className="px-3.5 py-3 text-muted text-[11px]">
                            {new Date(item.createdAt).toLocaleDateString()}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          ) : viewMode === 'kanban' ? (
            /* Kanban Board View */
            <div className="flex-1 overflow-x-auto min-h-0 flex gap-3 p-1">
              {REPAIR_STATUSES.map((colStatus) => {
                const colItems = items.filter((item) => item.status === colStatus);
                return (
                  <div
                    key={colStatus}
                    className="flex flex-col w-60 shrink-0 rounded-xl bg-canvas border border-border"
                  >
                    <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-surface rounded-t-xl">
                      <span className="text-[11px] font-bold text-ink uppercase tracking-wider">
                        {colStatus.replace('_', ' ')}
                      </span>
                      <span className="rounded-full bg-canvas px-1.5 py-0.2 text-[10px] border border-border text-muted font-bold">
                        {colItems.length}
                      </span>
                    </div>
                    <div className="flex-1 overflow-y-auto p-2 space-y-2">
                      {colItems.map((item) => (
                        <div
                          key={item.id}
                          onClick={() => dispatch(ticketDetailRequested(item.id))}
                          className={`rounded-xl border border-border bg-surface p-2.5 cursor-pointer hover:shadow-xs transition-all ${selectedTicket?.id === item.id ? 'border-primary shadow-xs bg-primary/5' : ''
                            }`}
                        >
                          <div className="flex justify-between items-start">
                            <span className="font-bold text-xs font-mono text-primary">{item.ticketNumber}</span>
                            <span className="text-[9px] text-muted">
                              {new Date(item.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                          <div className="text-xs font-semibold text-ink mt-1 truncate">{item.deviceInfo}</div>
                          <div className="text-[10px] text-muted mt-0.5 line-clamp-2">{item.issue}</div>
                          <div className="flex justify-between items-center mt-2 pt-1.5 border-t border-border/50 text-[10px]">
                            <span className="text-muted truncate">{item.customer?.phone}</span>
                            {item.estimate ? (
                              <span className="font-mono font-bold text-ink">
                                Rs {Number(item.estimate).toFixed(0)}
                              </span>
                            ) : null}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex-1 flex flex-col min-h-0 space-y-3">
              {/* Uncollected Header Banner */}
              <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3.5 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-base font-bold text-amber-500">Uncollected Repairs ({uncollectedTotal})</span>
                    <span className="rounded bg-amber-500/20 px-2 py-0.5 text-[10px] font-bold text-amber-600">
                      Overdue &gt; {uncollectedThresholdDays} Days
                    </span>
                  </div>
                  <p className="text-xs text-muted mt-0.5">
                    Repairs completed and ready for pickup for over {uncollectedThresholdDays} days. Send SMS reminders to prompt customer pickup.
                  </p>
                </div>
                <Button
                  disabled={uncollectedTickets.length === 0 || sendingSms}
                  onClick={() => dispatch(sendUncollectedSmsRequested(undefined))}
                  className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold px-3.5 py-2 shrink-0 cursor-pointer"
                >
                  {sendingSms ? 'Sending SMS...' : `Send Bulk SMS to All (${uncollectedTotal})`}
                </Button>
              </div>

              {/* Uncollected Table */}
              <div className="flex-1 overflow-y-auto rounded-xl border border-border bg-surface">
                <table className="w-full border-collapse text-left text-xs text-ink">
                  <thead>
                    <tr className="border-b border-border bg-canvas text-xs font-bold text-muted uppercase">
                      <th className="px-3.5 py-2.5">Ticket #</th>
                      <th className="px-3.5 py-2.5">Customer &amp; Phone</th>
                      <th className="px-3.5 py-2.5">Device</th>
                      <th className="px-3.5 py-2.5">Ready Since</th>
                      <th className="px-3.5 py-2.5">Uncollected Days</th>
                      <th className="px-3.5 py-2.5">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {uncollectedLoading ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-8 text-center text-muted">
                          Loading uncollected repairs...
                        </td>
                      </tr>
                    ) : uncollectedTickets.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-8 text-center text-muted">
                          No uncollected repairs past {uncollectedThresholdDays} days!
                        </td>
                      </tr>
                    ) : (
                      uncollectedTickets.map((item) => (
                        <tr
                          key={item.id}
                          onClick={() => dispatch(ticketDetailRequested(item.id))}
                          className={`cursor-pointer hover:bg-canvas transition-colors ${selectedTicket?.id === item.id ? 'bg-canvas font-semibold' : ''
                            }`}
                        >
                          <td className="px-3.5 py-3 font-mono font-bold text-primary">
                            {item.ticketNumber}
                          </td>
                          <td className="px-3.5 py-3">
                            <div className="font-semibold">{item.customer?.name || 'Walk-in'}</div>
                            <div className="text-[10px] font-mono text-muted">{item.customer?.phone}</div>
                          </td>
                          <td className="px-3.5 py-3 font-medium">{item.deviceInfo}</td>
                          <td className="px-3.5 py-3 text-muted text-[11px]">
                            {new Date(item.updatedAt).toLocaleDateString()}
                          </td>
                          <td className="px-3.5 py-3 font-mono">
                            <span className="inline-flex items-center rounded-full bg-rose-500/10 px-2 py-0.5 text-xs font-bold text-rose-500 border border-rose-500/20">
                              {item.uncollectedDays} Days Overdue
                            </span>
                          </td>
                          <td className="px-3.5 py-3" onClick={(e) => e.stopPropagation()}>
                            <Button
                              disabled={sendingSms}
                              onClick={() => dispatch(sendUncollectedSmsRequested([item.id]))}
                              variant="secondary"
                              className="text-[11px] py-1 px-2.5 font-semibold cursor-pointer"
                            >
                              Send SMS Reminder
                            </Button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Pagination */}
          {pages > 1 ? (
            <div className="flex items-center justify-between border-t border-border pt-3 mt-2">
              <span className="text-xs text-muted">
                Page {page} of {pages} ({total} tickets)
              </span>
              <div className="flex gap-1.5">
                <Button
                  disabled={page === 1}
                  onClick={() => handlePageChange(page - 1)}
                  variant="secondary"
                  className="py-1 px-3 text-xs"
                >
                  Prev
                </Button>
                <Button
                  disabled={page === pages}
                  onClick={() => handlePageChange(page + 1)}
                  variant="secondary"
                  className="py-1 px-3 text-xs"
                >
                  Next
                </Button>
              </div>
            </div>
          ) : null}
        </div>

        {/* Right Side: Selected Ticket Detailed Editor */}
        <div className="flex flex-col min-h-0 bg-surface p-5 overflow-y-auto">
          {selectedTicket ? (
            <div className="space-y-4">
              {/* Detail Header */}
              <div className="flex items-start justify-between border-b border-border pb-3">
                <div>
                  <h2 className="text-base font-extrabold text-ink font-mono">{selectedTicket.ticketNumber}</h2>
                  <p className="text-[10px] text-muted">
                    Intake: {new Date(selectedTicket.createdAt).toLocaleString()}
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  {selectedTicket.isThreeDayWarranty ? (
                    <span className="rounded bg-amber-500/10 px-2 py-0.5 text-[9px] font-bold text-amber-500 border border-amber-500/20">
                      3-Day Warranty Claim
                    </span>
                  ) : null}
                  <span
                    className={`rounded-full border px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wide ${STATUS_COLORS[selectedTicket.status] || ''
                      }`}
                  >
                    {selectedTicket.status.replace('_', ' ')}
                  </span>
                </div>
              </div>

              {/* Status Update Stepper */}
              <div>
                <label className="text-[10px] font-bold text-muted uppercase tracking-wider block mb-1">
                  Update Repair Status
                </label>
                <select
                  value={selectedTicket.status}
                  onChange={(e) => handleUpdateStatus(e.target.value)}
                  className="w-full rounded-lg border border-border bg-canvas px-3 py-1.5 text-xs text-ink focus:border-primary focus:outline-none cursor-pointer font-medium"
                >
                  {REPAIR_STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {status.replace('_', ' ')}
                    </option>
                  ))}
                </select>
              </div>

              {/* Customer and Device Info */}
              <div className="rounded-xl border border-border bg-canvas p-3 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="font-semibold text-ink">
                    {selectedTicket.customer?.name || 'Walk-in Customer'}
                  </span>
                  <span className="font-mono text-muted">Phone: {selectedTicket.customer?.phone}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase text-muted block">Device</span>
                  <span className="text-ink font-medium">{selectedTicket.deviceInfo}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase text-muted block">Reported Problem</span>
                  <span className="text-muted italic">{selectedTicket.issue}</span>
                </div>
              </div>

              {/* Technician Assignment & Financial Summary (Q23, Q24) */}
              <div className="rounded-xl border border-border bg-canvas p-3 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase text-muted flex items-center gap-1">
                    <FiTool className="h-3 w-3" /> Technician &amp; Billing
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-muted block mb-0.5">Assigned Technician</label>
                    <select
                      value={editTechId}
                      onChange={(e) => setEditTechId(e.target.value)}
                      className="w-full rounded border border-border bg-surface px-2 py-1 text-xs text-ink"
                    >
                      <option value="">Default Technician</option>
                      {technicians.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] text-muted block mb-0.5">Advance Paid</label>
                    <Input
                      type="number"
                      min={0}
                      placeholder="0.00"
                      value={editAdvance === 0 ? '' : editAdvance}
                      onChange={(e) => setEditAdvance(e.target.value === '' ? 0 : Number(e.target.value))}
                      className="py-1 text-xs font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] text-muted block mb-0.5">Cost Estimate (Rs)</label>
                  <Input
                    type="number"
                    min={0}
                    placeholder="0.00"
                    value={estimate === 0 ? '' : estimate}
                    onChange={(e) => setEstimate(e.target.value === '' ? 0 : Number(e.target.value))}
                    className="w-full font-mono text-sm py-1 font-bold"
                  />
                </div>

                {/* Remaining Balance Display (Q23) */}
                <div className="rounded-lg bg-surface border border-border p-2 flex justify-between items-center text-xs font-mono">
                  <span className="text-muted">Remaining Balance:</span>
                  <span className="font-bold text-rose-600 text-sm">
                    Rs {remainingBalance.toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Spare Parts Linking & Inventory Stock Deduction (Q21) */}
              <div className="space-y-2 border-t border-border pt-3">
                <div className="flex justify-between items-center">
                  <h3 className="text-[10px] font-bold text-ink uppercase tracking-wider">
                    Spare Parts (Auto Stock Deduction)
                  </h3>
                </div>

                {/* Pick from Inventory */}
                <div className="space-y-1">
                  <label className="text-[10px] text-muted block">Select from Parts Inventory</label>
                  <select
                    value={selectedProductId}
                    onChange={(e) => setSelectedProductId(e.target.value)}
                    className="w-full rounded border border-border bg-canvas px-2 py-1 text-xs text-ink"
                  >
                    <option value="">-- Choose Inventory Spare Part --</option>
                    {inventoryProducts.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} (Stock: {p.quantity}) - Rs {Number(p.sellPrice).toFixed(2)}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Custom Part Name / Cost Input */}
                <div className="flex gap-1.5 mt-1">
                  <Input
                    placeholder="Or custom part name"
                    value={newPartName}
                    onChange={(e) => setNewPartName(e.target.value)}
                    className="flex-1 text-xs py-1"
                  />
                  <Input
                    placeholder="Cost"
                    type="number"
                    value={newPartCost}
                    onChange={(e) => setNewPartCost(e.target.value)}
                    className="w-20 font-mono text-xs py-1"
                  />
                  <Button
                    type="button"
                    onClick={handleAddPart}
                    className="px-2.5 py-1 text-xs font-bold"
                  >
                    + Add
                  </Button>
                </div>

                {/* Parts Used List */}
                <div className="space-y-1 max-h-32 overflow-y-auto mt-2">
                  {parts.length === 0 ? (
                    <p className="text-[10px] text-muted italic">No parts recorded yet.</p>
                  ) : (
                    parts.map((part, index) => (
                      <div
                        key={index}
                        className="flex justify-between items-center rounded-lg border border-border bg-canvas px-2.5 py-1 text-xs text-ink"
                      >
                        <span className="truncate text-[11px]">{part.name}</span>
                        <div className="flex items-center gap-2 font-mono text-[11px]">
                          <span>Rs {part.cost.toFixed(2)}</span>
                          <button
                            type="button"
                            onClick={() => handleRemovePart(index)}
                            className="text-rose-500 font-bold px-1 hover:text-rose-700 cursor-pointer"
                          >
                            ×
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <Button
                  type="button"
                  onClick={handleSaveEstimateAndParts}
                  loading={saving}
                  className="w-full py-1.5 text-xs font-bold mt-2"
                >
                  Save Charges &amp; Parts
                </Button>
              </div>

              {/* Outsourced Repair Section (Q22) */}
              <div className="space-y-2 border-t border-border pt-3">
                <div className="flex justify-between items-center">
                  <h3 className="text-[10px] font-bold text-ink uppercase tracking-wider">
                    Outsourced Repairs
                  </h3>
                  <button
                    type="button"
                    onClick={() => setShowOutsourceModal(true)}
                    className="text-[10px] font-bold text-primary hover:underline cursor-pointer"
                  >
                    + Log Outsourced
                  </button>
                </div>

                {outsourcedList.length === 0 ? (
                  <p className="text-[10px] text-muted italic">Device is repaired in-house.</p>
                ) : (
                  <div className="space-y-1.5">
                    {outsourcedList.map((o) => (
                      <div
                        key={o.id}
                        className="rounded-lg border border-border bg-canvas p-2 text-xs space-y-0.5"
                      >
                        <div className="flex justify-between font-semibold">
                          <span>{o.personOrPlace}</span>
                          <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.2 rounded font-mono">
                            {o.status}
                          </span>
                        </div>
                        <div className="flex justify-between text-[10px] text-muted">
                          <span>Sent: {new Date(o.sentDate).toLocaleDateString()}</span>
                          {o.expectedReturnDate ? (
                            <span>Exp: {new Date(o.expectedReturnDate).toLocaleDateString()}</span>
                          ) : null}
                        </div>
                        {o.reminderNotes ? (
                          <p className="text-[10px] text-muted italic">{o.reminderNotes}</p>
                        ) : null}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Device Photos (Q26) */}
              <div className="space-y-2 border-t border-border pt-3">
                <div className="flex justify-between items-center">
                  <h3 className="text-[10px] font-bold text-ink uppercase tracking-wide">
                    Device Photos ({selectedTicket.photos.length})
                  </h3>
                  <button
                    type="button"
                    onClick={() => setShowPhotoCapture(true)}
                    className="text-[10px] font-bold text-primary hover:underline cursor-pointer"
                  >
                    + Add Photo
                  </button>
                </div>

                {showPhotoCapture ? (
                  <PhotoCapture
                    onCapture={handlePhotoCaptured}
                    onCancel={() => setShowPhotoCapture(false)}
                  />
                ) : null}

                <div className="grid grid-cols-3 gap-2">
                  {selectedTicket.photos.map((photo, index) => (
                    <div
                      key={index}
                      className="group relative aspect-square overflow-hidden rounded-lg border border-border bg-canvas"
                    >
                      <img
                        src={`http://localhost:4000${photo}`}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => handleDeletePhoto(index)}
                        className="absolute right-1 top-1 rounded bg-black/60 p-1 text-white hover:bg-rose-600 transition-colors cursor-pointer"
                        title="Delete photo"
                      >
                        <FiTrash2 className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Buttons: A5 Bill Book Print (Q28) */}
              <div className="flex gap-2 border-t border-border pt-3">
                <Button
                  type="button"
                  onClick={handlePrintSlip}
                  className="flex-1 py-2 text-xs font-bold"
                >
                  Print A5 Bill Book (2 Copies)
                </Button>
                <Button
                  type="button"
                  onClick={() => dispatch(clearSelectedTicket())}
                  variant="secondary"
                  className="px-4 py-2 text-xs font-bold"
                >
                  Close
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex h-full flex-col items-center justify-center text-center p-4">
              <FiTool className="text-3xl text-muted block mb-2 mx-auto" />
              <h3 className="text-sm font-semibold text-ink">No Ticket Selected</h3>
              <p className="text-xs text-muted max-w-[200px] mt-1">
                Select a repair ticket from the list or intake a new device to get started.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Intake / Create Modal */}
      {showCreateModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-2xl border border-border bg-surface p-6 shadow-xl overflow-y-auto max-h-[90vh]">
            <h2 className="text-base font-bold text-ink mb-1">New Device Repair Intake</h2>
            <p className="text-xs text-muted mb-4">Record customer details, assign technician, and record advance payment.</p>

            <form onSubmit={handleCreateTicket} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-semibold text-muted block mb-0.5">
                    Customer Phone <span className="text-rose-500">*</span>
                  </label>
                  <Input
                    required
                    placeholder="07XXXXXXXX"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full text-xs"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-muted block mb-0.5">Customer Name</label>
                  <Input
                    placeholder="e.g. John Doe"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full text-xs"
                  />
                </div>
              </div>

              {/* Q4 3-Day Warranty Recent Purchase Alert Banner */}
              {recentSaleCheck.loading ? (
                <p className="text-[10px] text-muted italic">Checking purchase history for 3-day warranty...</p>
              ) : recentSaleCheck.hasRecentSale ? (
                <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-2.5 text-xs text-amber-500 font-medium space-y-1">
                  <div className="flex items-center gap-1 font-bold">
                    <span>Recent Purchase Found!</span>
                    <span className="text-[10px] bg-amber-500/20 px-1.5 py-0.5 rounded font-mono">
                      Within {recentSaleCheck.firstDaysRule ?? 3} Days
                    </span>
                  </div>
                  <p className="text-[11px] text-amber-600 leading-tight">
                    Customer purchased item on {new Date(recentSaleCheck.sale?.createdAt).toLocaleDateString()}. Auto-flagged as 3-Day Warranty Claim (No Charge Support Repair).
                  </p>
                </div>
              ) : null}

              <div>
                <label className="text-[10px] font-semibold text-muted block mb-0.5">
                  Device Model &amp; Info <span className="text-rose-500">*</span>
                </label>
                <Input
                  required
                  placeholder="e.g. iPhone 14 Pro Max 256GB Deep Purple (IMEI: 35...)"
                  value={deviceInfo}
                  onChange={(e) => setDeviceInfo(e.target.value)}
                  className="w-full text-xs"
                />
              </div>

              <div>
                <label className="text-[10px] font-semibold text-muted block mb-0.5">
                  Reported Problem Description <span className="text-rose-500">*</span>
                </label>
                <textarea
                  required
                  rows={2}
                  placeholder="e.g. Display blank, touch working, physical drop..."
                  value={issue}
                  onChange={(e) => setIssue(e.target.value)}
                  className="w-full rounded-lg border border-border bg-surface px-3 py-1.5 text-xs text-ink focus:border-primary focus:outline-none"
                />
              </div>

              {/* Technician, Advance Payment, Warranty (Q20, Q23, Q24) */}
              <div className="grid grid-cols-2 gap-3 border-t border-border pt-2">
                <div>
                  <label className="text-[10px] font-semibold text-muted block mb-0.5">Assigned Technician</label>
                  <select
                    value={technicianId}
                    onChange={(e) => setTechnicianId(e.target.value)}
                    className="w-full rounded-lg border border-border bg-surface px-2 py-1.5 text-xs text-ink"
                  >
                    <option value="">Default Technician</option>
                    {technicians.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-muted block mb-0.5">Advance Payment (Rs)</label>
                  <Input
                    type="number"
                    min={0}
                    placeholder="0.00"
                    value={advancePayment}
                    onChange={(e) => setAdvancePayment(e.target.value)}
                    className="w-full text-xs font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-semibold text-muted block mb-0.5">Repair Warranty</label>
                  <select
                    value={warrantyPeriodId}
                    onChange={(e) => setWarrantyPeriodId(e.target.value)}
                    className="w-full rounded-lg border border-border bg-surface px-2 py-1.5 text-xs text-ink"
                  >
                    <option value="">Default (First 3 Days Warranty Support)</option>
                    {warranties.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.label} ({w.durationDays} days)
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-muted block mb-0.5">Technician Commission</label>
                  <div className="flex gap-1">
                    <select
                      value={commissionMethod}
                      onChange={(e) => setCommissionMethod(e.target.value as any)}
                      className="rounded border border-border bg-surface px-1.5 py-1 text-xs text-ink"
                    >
                      <option value="PERCENTAGE">%</option>
                      <option value="FIXED_AMOUNT">Rs</option>
                    </select>
                    <Input
                      type="number"
                      min={0}
                      value={commissionValue}
                      onChange={(e) => setCommissionValue(e.target.value)}
                      className="w-20 text-xs font-mono py-1"
                    />
                  </div>
                </div>
              </div>

              {/* Q4 3-Day Support Warranty Claim Checkbox */}
              <div className="rounded-lg border border-border bg-canvas p-2.5 space-y-1">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-ink">
                  <input
                    type="checkbox"
                    checked={isThreeDayWarranty}
                    onChange={(e) => setIsThreeDayWarranty(e.target.checked)}
                    className="h-4 w-4 rounded border-border text-primary focus:ring-primary cursor-pointer"
                  />
                  <span>3-Day Support Warranty Claim (No Charge Repair)</span>
                </label>
                <p className="text-[10px] text-muted pl-6">
                  Flag this repair ticket under the First 3-Day Return Support Rule for zero/free repair charge.
                </p>
              </div>

              <div className="flex justify-end gap-2 border-t border-border pt-3">
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
                  className="px-4 py-2 text-xs font-bold"
                >
                  Create Intake Ticket
                </Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {/* Log Outsourced Repair Modal (Q22) */}
      {showOutsourceModal && selectedTicket ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl border border-border bg-surface p-5 shadow-xl">
            <h3 className="text-sm font-bold text-ink mb-1">Outsource Repair Job</h3>
            <p className="text-xs text-muted mb-3">Track outsourced technician/lab, return expectations, and reminders.</p>

            <form onSubmit={handleCreateOutsourced} className="space-y-3">
              <div>
                <label className="text-[10px] font-semibold text-muted block mb-0.5">Outsourced Person / Center</label>
                <Input
                  required
                  placeholder="e.g. Master Chip Tech / Repair Lab Majestic"
                  value={outPersonPlace}
                  onChange={(e) => setOutPersonPlace(e.target.value)}
                  className="w-full text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-semibold text-muted block mb-0.5">Sent Date</label>
                  <Input
                    required
                    type="date"
                    value={outSentDate}
                    onChange={(e) => setOutSentDate(e.target.value)}
                    className="w-full text-xs"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-muted block mb-0.5">Expected Return Date</label>
                  <Input
                    type="date"
                    value={outExpectedDate}
                    onChange={(e) => setOutExpectedDate(e.target.value)}
                    className="w-full text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-semibold text-muted block mb-0.5">Reminder / Job Notes</label>
                <textarea
                  rows={2}
                  placeholder="e.g. Needs CPU reballing, follow up on Friday..."
                  value={outNotes}
                  onChange={(e) => setOutNotes(e.target.value)}
                  className="w-full rounded-lg border border-border bg-canvas px-3 py-1.5 text-xs text-ink focus:border-primary focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 border-t border-border pt-3">
                <Button
                  type="button"
                  onClick={() => setShowOutsourceModal(false)}
                  variant="secondary"
                  className="text-xs"
                >
                  Cancel
                </Button>
                <Button type="submit" className="text-xs font-bold">
                  Save Outsourced Record
                </Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {/* A5 2-Copy Bill Book Format Print View (Q28) */}
      <A5RepairBill ticket={selectedTicket} />
    </div>
  );
}
