import { useEffect, useState } from 'react';
import { FiTrash2 } from 'react-icons/fi';
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
} from '../features/repairs/repairsSlice';
import { PhotoCapture } from '../components/PhotoCapture';
import { Button } from '../components/Button';
import { RepairSlip } from '../components/RepairSlip';
import { Input } from '../components/Input';
import { REPAIR_STATUSES } from '@pos/shared';

const STATUS_COLORS: Record<string, string> = {
  RECEIVED: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  DIAGNOSING: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
  AWAITING_PARTS: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
  REPAIRED: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
  DELIVERED: 'bg-slate-500/10 text-muted border-border',
  CANCELLED: 'bg-rose-500/10 text-rose-500 border-rose-500/20',
};

export function RepairsPage() {
  const dispatch = useAppDispatch();
  const { items, total, page, pages, selectedTicket, loading, saving, error, filters } =
    useAppSelector((s) => s.repairs);

  const [viewMode, setViewMode] = useState<'table' | 'kanban'>('table');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showPhotoCapture, setShowPhotoCapture] = useState(false);
  
  // Create ticket state
  const [phone, setPhone] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [deviceInfo, setDeviceInfo] = useState('');
  const [issue, setIssue] = useState('');
  const [pendingPhotos, setPendingPhotos] = useState<File[]>([]);

  // Update ticket state
  const [estimate, setEstimate] = useState<number>(0);
  const [parts, setParts] = useState<{ name: string; cost: number }[]>([]);
  const [newPartName, setNewPartName] = useState('');
  const [newPartCost, setNewPartCost] = useState('');

  useEffect(() => {
    dispatch(ticketsRequested(filters));
  }, [dispatch]);

  // Load estimate and parts when ticket selection changes
  useEffect(() => {
    if (selectedTicket) {
      setEstimate(selectedTicket.estimate ? Number(selectedTicket.estimate) : 0);
      try {
        const parsedParts = selectedTicket.partsJson
          ? (typeof selectedTicket.partsJson === 'string'
              ? JSON.parse(selectedTicket.partsJson)
              : selectedTicket.partsJson)
          : [];
        setParts(Array.isArray(parsedParts) ? parsedParts : []);
      } catch {
        setParts([]);
      }
    }
  }, [selectedTicket]);

  function handleFilterStatusChange(status: string) {
    dispatch(filtersChanged({ status, page: 1 }));
    dispatch(ticketsRequested({ ...filters, status, page: 1 }));
  }

  function handleSearchChange(search: string) {
    dispatch(filtersChanged({ search, page: 1 }));
    // Note: Sagas will debounce search changes automatically via filtersChanged
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
      })
    );

    // Reset form and close
    setPhone('');
    setCustomerName('');
    setDeviceInfo('');
    setIssue('');
    setShowCreateModal(false);
    setPendingPhotos([]);
  }

  function handleUpdateStatus(status: string) {
    if (!selectedTicket) return;
    dispatch(
      ticketUpdateRequested({
        id: selectedTicket.id,
        input: { status },
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
          partsJson: parts,
        },
      })
    );
  }

  function handleAddPart() {
    if (!newPartName || !newPartCost) return;
    const cost = parseFloat(newPartCost);
    if (isNaN(cost)) return;

    const newParts = [...parts, { name: newPartName, cost }];
    setParts(newParts);
    setNewPartName('');
    setNewPartCost('');
    
    // Auto-update estimate if estimate is 0 or sums parts
    const partsTotal = newParts.reduce((sum, p) => sum + p.cost, 0);
    if (estimate < partsTotal) {
      setEstimate(partsTotal);
    }
  }

  function handleRemovePart(index: number) {
    const newParts = parts.filter((_, i) => i !== index);
    setParts(newParts);
  }

  function handlePhotoCaptured(file: File) {
    if (selectedTicket) {
      // Upload immediately for existing ticket
      dispatch(photoUploadRequested({ id: selectedTicket.id, file }));
    } else {
      // Hold in state for new ticket creation (will be uploaded after ticket is created)
      setPendingPhotos((prev) => [...prev, file]);
    }
    setShowPhotoCapture(false);
  }

  function handleDeletePhoto(index: number) {
    if (!selectedTicket) return;
    if (window.confirm('Are you sure you want to delete this photo?')) {
      dispatch(photoDeleteRequested({ id: selectedTicket.id, index }));
    }
  }

  function handlePrintSlip() {
    if (!selectedTicket) return;
    window.print();
  }

  return (
    <div className="flex h-full flex-col min-h-0 bg-canvas">
      {/* Page Header */}
      <div className="flex items-center justify-between border-b border-border bg-surface px-6 py-4">
        <div>
          <h1 className="text-xl font-bold text-ink">Repair Ticketing</h1>
          <p className="text-xs text-muted">Intake devices, track statuses, attach photos and print slips</p>
        </div>
        <div className="flex gap-3">
          {/* Toggle Views */}
          <div className="flex rounded-lg border border-border bg-canvas p-0.5">
            <Button
              onClick={() => setViewMode('table')}
              variant={viewMode === 'table' ? 'primary' : 'secondary'}
              className="py-1 px-3 text-xs"
            >
              List View
            </Button>
            <Button
              onClick={() => setViewMode('kanban')}
              variant={viewMode === 'kanban' ? 'primary' : 'secondary'}
              className="py-1 px-3 text-xs"
            >
              Kanban Board
            </Button>
          </div>
          <Button
            onClick={() => setShowCreateModal(true)}
          >
            + Intake New Device
          </Button>
        </div>
      </div>

      {/* Main Content Pane */}
      <div className="grid flex-1 grid-cols-[1fr_380px] min-h-0 gap-0">
        {/* Left Side: Table or Kanban List */}
        <div className="flex flex-col min-h-0 border-r border-border p-4">
          {/* Filter Bar */}
          <div className="flex flex-wrap gap-3 pb-4">
            <div className="w-64">
              <Input
                placeholder="Search ticket number, customer, phone, device..."
                value={filters.search}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="w-full"
              />
            </div>
            <select
              value={filters.status}
              onChange={(e) => handleFilterStatusChange(e.target.value)}
              className="rounded-lg border border-border bg-surface px-3 py-2 text-xs text-ink focus:border-primary focus:outline-none"
            >
              <option value="ALL">All Statuses</option>
              {REPAIR_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </div>

          {loading && items.length === 0 ? (
            <div className="flex flex-1 items-center justify-center">
              <p className="text-sm text-muted">Loading repairs...</p>
            </div>
          ) : viewMode === 'table' ? (
            /* Table View */
            <div className="flex-1 overflow-y-auto rounded-xl border border-border bg-surface">
              <table className="w-full border-collapse text-left text-xs text-ink">
                <thead>
                  <tr className="border-b border-border bg-canvas text-xs font-bold text-muted uppercase">
                    <th className="px-4 py-3">Ticket</th>
                    <th className="px-4 py-3">Customer</th>
                    <th className="px-4 py-3">Device</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Estimate</th>
                    <th className="px-4 py-3">Date</th>
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
                    items.map((item) => (
                      <tr
                        key={item.id}
                        onClick={() => dispatch(ticketDetailRequested(item.id))}
                        className={`cursor-pointer hover:bg-canvas transition-colors ${
                          selectedTicket?.id === item.id ? 'bg-canvas font-semibold' : ''
                        }`}
                      >
                        <td className="px-4 py-3.5 font-bold text-primary">{item.ticketNumber}</td>
                        <td className="px-4 py-3.5">
                          <div>{item.customer?.name || 'Walk-in'}</div>
                          <div className="text-[10px] text-muted">{item.customer?.phone}</div>
                        </td>
                        <td className="px-4 py-3.5 max-w-[200px] truncate">{item.deviceInfo}</td>
                        <td className="px-4 py-3.5">
                          <span
                            className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase ${
                              STATUS_COLORS[item.status] || ''
                            }`}
                          >
                            {item.status}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 font-mono">
                          {item.estimate ? `Rs ${Number(item.estimate).toFixed(2)}` : '—'}
                        </td>
                        <td className="px-4 py-3.5 text-muted">
                          {new Date(item.createdAt).toLocaleDateString()}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          ) : (
            /* Kanban Board View */
            <div className="flex-1 overflow-x-auto min-h-0 flex gap-4 p-1">
              {REPAIR_STATUSES.map((colStatus) => {
                const colItems = items.filter((item) => item.status === colStatus);
                return (
                  <div
                    key={colStatus}
                    className="flex flex-col w-64 shrink-0 rounded-xl bg-canvas border border-border"
                  >
                    <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-surface rounded-t-xl">
                      <span className="text-xs font-bold text-ink uppercase tracking-wider">
                        {colStatus.replace('_', ' ')}
                      </span>
                      <span className="rounded-full bg-canvas px-2 py-0.5 text-[10px] border border-border text-muted font-bold">
                        {colItems.length}
                      </span>
                    </div>
                    <div className="flex-1 overflow-y-auto p-2 space-y-2">
                      {colItems.map((item) => (
                        <div
                          key={item.id}
                          onClick={() => dispatch(ticketDetailRequested(item.id))}
                          className={`rounded-lg border border-border bg-surface p-3 cursor-pointer hover:shadow-sm hover:border-primary/50 transition-all ${
                            selectedTicket?.id === item.id ? 'border-primary shadow-sm bg-primary/5' : ''
                          }`}
                        >
                          <div className="flex justify-between items-start gap-2">
                            <span className="font-bold text-xs text-primary">{item.ticketNumber}</span>
                            <span className="text-[9px] text-muted">
                              {new Date(item.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                          <div className="text-xs font-semibold text-ink mt-1 truncate">
                            {item.deviceInfo}
                          </div>
                          <div className="text-[10px] text-muted mt-0.5 line-clamp-2">
                            {item.issue}
                          </div>
                          <div className="flex justify-between items-center mt-2.5 pt-2 border-t border-border/50 text-[10px]">
                            <span className="text-muted truncate">
                              👤 {item.customer?.name || item.customer?.phone}
                            </span>
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
          )}

          {/* Pagination */}
          {pages > 1 ? (
            <div className="flex items-center justify-between border-t border-border pt-4 mt-3">
              <span className="text-xs text-muted">
                Showing page {page} of {pages} ({total} total tickets)
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

        {/* Right Side: Selected Ticket Detailed Editor */}
        <div className="flex flex-col min-h-0 bg-surface p-6 overflow-y-auto">
          {selectedTicket ? (
            <div className="space-y-6">
              {/* Detail Header */}
              <div className="flex items-start justify-between border-b border-border pb-4">
                <div>
                  <h2 className="text-base font-bold text-ink">{selectedTicket.ticketNumber}</h2>
                  <p className="text-[10px] text-muted">
                    Intake: {new Date(selectedTicket.createdAt).toLocaleString()}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1.5">
                  <span
                    className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                      STATUS_COLORS[selectedTicket.status] || ''
                    }`}
                  >
                    {selectedTicket.status}
                  </span>
                </div>
              </div>

              {/* Status Stepper */}
              <div>
                <label className="text-xs font-semibold text-muted block mb-2">Progress Status</label>
                <select
                  value={selectedTicket.status}
                  onChange={(e) => handleUpdateStatus(e.target.value)}
                  className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-xs text-ink focus:border-primary focus:outline-none"
                >
                  {REPAIR_STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {status.replace('_', ' ')}
                    </option>
                  ))}
                </select>
              </div>

              {/* Customer and Device Info */}
              <div className="rounded-xl border border-border bg-canvas p-4 space-y-3">
                <div>
                  <span className="text-[10px] font-bold uppercase text-muted block">Customer Details</span>
                  <span className="text-xs font-semibold text-ink block">
                    {selectedTicket.customer?.name || 'Walk-in Customer'}
                  </span>
                  <span className="text-xs text-muted font-mono block">
                    📞 {selectedTicket.customer?.phone}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase text-muted block">Device Info</span>
                  <span className="text-xs text-ink block break-words">{selectedTicket.deviceInfo}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase text-muted block">Reported Problem</span>
                  <span className="text-xs text-muted block break-words">{selectedTicket.issue}</span>
                </div>
              </div>

              {/* Estimate Cost & Parts JSON */}
              <div className="space-y-4 border-t border-border pt-4">
                <h3 className="text-xs font-bold text-ink uppercase tracking-wide">Costs & Parts</h3>
                
                <div>
                  <label className="text-xs text-muted block mb-1.5">Cost Estimate (Rs)</label>
                  <Input
                    type="number"
                    placeholder='0'
                    value={estimate}
                    onChange={(e) => setEstimate(Number(e.target.value))}
                    className="w-full font-mono text-sm"
                  />
                </div>

                {/* Parts Used List */}
                <div className="space-y-2">
                  <label className="text-xs text-muted block">Parts Used</label>
                  <div className="space-y-1.5 max-h-40 overflow-y-auto">
                    {parts.length === 0 ? (
                      <p className="text-[10px] text-muted italic">No parts recorded yet.</p>
                    ) : (
                      parts.map((part, index) => (
                        <div
                          key={index}
                          className="flex justify-between items-center rounded-lg border border-border bg-canvas px-3 py-1.5 text-xs text-ink"
                        >
                          <span className="truncate">{part.name}</span>
                          <div className="flex items-center gap-2 font-mono">
                            <span>Rs {part.cost.toFixed(2)}</span>
                            <button
                              type="button"
                              onClick={() => handleRemovePart(index)}
                              className="text-danger hover:text-danger-hover font-bold px-1"
                            >
                              ×
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Add Part Form */}
                  <div className="flex gap-1.5 mt-2">
                    <Input
                      placeholder="Part name"
                      value={newPartName}
                      onChange={(e) => setNewPartName(e.target.value)}
                      className="flex-1 text-xs"
                    />
                    <Input
                      placeholder="Cost"
                      type="number"
                      value={newPartCost}
                      onChange={(e) => setNewPartCost(e.target.value)}
                      className="w-20 font-mono text-xs"
                    />
                    <Button
                      type="button"
                      onClick={handleAddPart}
                      className="px-3"
                    >
                      +
                    </Button>
                  </div>
                </div>

                <Button
                  type="button"
                  onClick={handleSaveEstimateAndParts}
                  loading={saving}
                  className="w-full"
                >
                  Save Estimate &amp; Parts
                </Button>
              </div>

              {/* Photos Gallery */}
              <div className="space-y-3 border-t border-border pt-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-xs font-bold text-ink uppercase tracking-wide">Device Photos</h3>
                  <button
                    type="button"
                    onClick={() => setShowPhotoCapture(true)}
                    className="text-[10px] font-bold text-primary hover:text-primary-hover"
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
                  {selectedTicket.photos.length === 0 ? (
                    <div className="col-span-3 rounded-lg border border-dashed border-border p-4 text-center text-[10px] text-muted">
                      No photos attached. Click Add Photo to capture device condition.
                    </div>
                  ) : (
                    selectedTicket.photos.map((photo, index) => (
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
                          className="absolute right-1.5 top-1.5 rounded-full bg-white/95 p-1 text-rose-600 border border-border shadow-sm opacity-0 group-hover:opacity-100 hover:bg-rose-50 hover:text-rose-700 transition-opacity cursor-pointer focus:outline-none flex items-center justify-center"
                          title="Delete photo"
                        >
                          <FiTrash2 className="h-3.5 w-3.5" />
                        </button>

                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 border-t border-border pt-4">
                <Button
                  type="button"
                  onClick={handlePrintSlip}
                  variant="secondary"
                  className="flex-1 py-2 text-xs font-bold"
                >
                  Print Repair Slip
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
              <span className="text-3xl text-muted block mb-2">🔧</span>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-fade-in">
          <div className="w-full max-w-md rounded-xl border border-border bg-surface p-6 shadow-lg">
            <h2 className="text-base font-bold text-ink mb-4">New Device Repair Intake</h2>
            <form onSubmit={handleCreateTicket} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-muted block mb-1">
                  Customer Phone <span className="text-danger">*</span>
                </label>
                <Input
                  required
                  placeholder="e.g. 0771234567"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-muted block mb-1">Customer Name</label>
                <Input
                  placeholder="e.g. John Doe"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-muted block mb-1">
                  Device Model & Info <span className="text-danger">*</span>
                </label>
                <Input
                  required
                  placeholder="e.g. iPhone 13 Pro (Blue), Serial: XYZ..."
                  value={deviceInfo}
                  onChange={(e) => setDeviceInfo(e.target.value)}
                  className="w-full"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-muted block mb-1">
                  Problem Description <span className="text-danger">*</span>
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="e.g. Cracked screen, front camera blurry, battery health 72%..."
                  value={issue}
                  onChange={(e) => setIssue(e.target.value)}
                  className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-xs text-ink focus:border-primary focus:outline-none"
                />
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
                  className="px-4 py-2 text-xs font-bold"
                >
                  Create Intake Ticket
                </Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {/* Printable Area Slip */}
      <RepairSlip ticket={selectedTicket} />
    </div>
  );
}
