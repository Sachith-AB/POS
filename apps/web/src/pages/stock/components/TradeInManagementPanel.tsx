import { useEffect, useRef, useState } from 'react';
import { api } from '../../../lib/api';
import { Input } from '../../../components/Input';
import { Button } from '../../../components/Button';
import { toast } from 'react-toastify';
import {
  FiSearch,
  FiPlus,
  FiX,
  FiAlertTriangle,
  FiCheckCircle,
  FiDollarSign,
  FiRefreshCw,
  FiBox,
  FiUser,
  FiPhone,
  FiClock,
  FiFilter,
} from 'react-icons/fi';
import type { TradeInItem, CategoryItem, WarrantyOption } from './types';

export function TradeInManagementPanel() {
  const [tradeIns, setTradeIns] = useState<TradeInItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [searchFilter, setSearchFilter] = useState('');

  // Customers & Customer Devices
  const [customers, setCustomers] = useState<any[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [customerDevices, setCustomerDevices] = useState<any[]>([]);
  const [loadingCustomerDevices, setLoadingCustomerDevices] = useState(false);

  // Form state
  const [deviceInfo, setDeviceInfo] = useState('');
  const [imei, setImei] = useState('');
  const [condition, setCondition] = useState('GOOD');
  const [tradeInValue, setTradeInValue] = useState('');
  const [custName, setCustName] = useState('');
  const [custPhone, setCustPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [savingTradeIn, setSavingTradeIn] = useState(false);

  // Convert to Resale Modal state
  const [showConvertModal, setShowConvertModal] = useState(false);
  const [tradeInToConvert, setTradeInToConvert] = useState<TradeInItem | null>(null);
  const [convertResalePrice, setConvertResalePrice] = useState('');
  const [convertWholesalePrice, setConvertWholesalePrice] = useState('');
  const [convertName, setConvertName] = useState('');
  const [convertCategory, setConvertCategory] = useState('Used Phones');
  const [converting, setConverting] = useState(false);

  const loadTradeIns = () => {
    setLoading(true);
    api.get<TradeInItem[]>('/trade-ins')
      .then((data) => {
        setTradeIns(data || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  const loadCustomers = () => {
    api.get<any>('/customers?limit=100')
      .then((res) => {
        setCustomers(res.items || res || []);
      })
      .catch(() => {});
  };

  useEffect(() => {
    loadTradeIns();
    loadCustomers();
  }, []);

  // When selectedCustomerId changes, fetch their profile to load their registered devices
  useEffect(() => {
    if (!selectedCustomerId) {
      setCustomerDevices([]);
      return;
    }
    setLoadingCustomerDevices(true);
    api.get<any>(`/customers/${selectedCustomerId}`)
      .then((profile) => {
        if (profile) {
          setCustName(profile.name || '');
          setCustPhone(profile.phone || '');
          setCustomerDevices(profile.imeiHistory || []);
        }
      })
      .catch(() => setCustomerDevices([]))
      .finally(() => setLoadingCustomerDevices(false));
  }, [selectedCustomerId]);

  function openIntakeModal() {
    setSelectedCustomerId('');
    setCustomerDevices([]);
    setDeviceInfo('');
    setImei('');
    setCondition('GOOD');
    setTradeInValue('');
    setCustName('');
    setCustPhone('');
    setNotes('');
    setShowModal(true);
  }

  function handleSelectCustomerDevice(devStr: string) {
    if (!devStr) return;
    const [pName, devImei] = devStr.split('|||');
    setDeviceInfo(pName || '');
    setImei(devImei || '');
  }

  async function handleCreateTradeIn(e: React.FormEvent) {
    e.preventDefault();
    if (!deviceInfo.trim() || !tradeInValue) return;
    setSavingTradeIn(true);

    try {
      await api.post('/trade-ins', {
        customerId: selectedCustomerId || undefined,
        deviceInfo: deviceInfo.trim(),
        imei: imei.trim() || undefined,
        condition,
        tradeInValue: parseFloat(tradeInValue),
        customerName: custName.trim() || undefined,
        customerPhone: custPhone.trim() || undefined,
        notes: notes.trim() || undefined,
      });
      setShowModal(false);
      loadTradeIns();
      toast.success('Customer device recorded as trade-in successfully!');
    } catch (err: any) {
      toast.error(err.message || 'Failed to record trade-in device');
    } finally {
      setSavingTradeIn(false);
    }
  }

  function openConvertModal(t: TradeInItem) {
    setTradeInToConvert(t);
    setConvertName(t.deviceInfo);
    setConvertResalePrice((Number(t.tradeInValue) * 1.25).toFixed(2));
    setConvertWholesalePrice('');
    setConvertCategory('Used Phones');
    setShowConvertModal(true);
  }

  async function handleConfirmConvert(e: React.FormEvent) {
    e.preventDefault();
    if (!tradeInToConvert || !convertResalePrice) return;
    setConverting(true);

    try {
      await api.post(`/trade-ins/${tradeInToConvert.id}/convert-to-stock`, {
        name: convertName.trim() || tradeInToConvert.deviceInfo,
        sellPrice: parseFloat(convertResalePrice),
        wholesalePrice: convertWholesalePrice ? parseFloat(convertWholesalePrice) : undefined,
        category: convertCategory,
      });
      setShowConvertModal(false);
      setTradeInToConvert(null);
      loadTradeIns();
      toast.success('Device successfully converted to inventory for resale!');
    } catch (err: any) {
      toast.error(err.message || 'Failed to convert to resale');
    } finally {
      setConverting(false);
    }
  }

  // Filtered trade ins
  const filteredTradeIns = tradeIns.filter((t) => {
    if (!searchFilter.trim()) return true;
    const q = searchFilter.toLowerCase();
    return (
      t.deviceInfo.toLowerCase().includes(q) ||
      (t.imei && t.imei.toLowerCase().includes(q)) ||
      (t.customerName && t.customerName.toLowerCase().includes(q)) ||
      (t.customerPhone && t.customerPhone.toLowerCase().includes(q))
    );
  });

  // KPI Calculations
  const totalCount = tradeIns.length;
  const totalValue = tradeIns.reduce((sum, t) => sum + Number(t.tradeInValue || 0), 0);
  const pendingCount = tradeIns.filter((t) => t.status === 'PENDING').length;
  const inStockCount = tradeIns.filter((t) => t.status === 'IN_STOCK').length;

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-border bg-surface p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
          <div>
            <h3 className="font-bold text-base text-ink flex items-center gap-2">
              <span>Trade-In Devices &amp; Used Device Resale</span>
              <span className="text-xs bg-brand/10 text-brand font-semibold px-2 py-0.5 rounded-full">
                {totalCount} Total Devices
              </span>
            </h3>
            <p className="text-xs text-muted">
              Intake customer devices as trade-ins, track IMEIs, and convert them to resale stock
            </p>
          </div>
          <Button onClick={openIntakeModal} className="text-xs font-bold flex items-center gap-1.5">
            <FiPlus className="w-3.5 h-3.5" />
            <span>+ Intake Customer Device</span>
          </Button>
        </div>

        {/* Summary KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
          <div className="p-3.5 rounded-xl bg-canvas border border-border flex items-center justify-between">
            <div>
              <div className="text-[11px] text-muted font-medium uppercase">Total Trade-Ins</div>
              <div className="text-lg font-bold text-ink mt-0.5">{totalCount} Devices</div>
            </div>
            <div className="h-9 w-9 rounded-lg bg-surface border border-border flex items-center justify-center text-muted">
              <FiRefreshCw className="w-4 h-4" />
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-emerald-500/5 border border-emerald-500/20 flex items-center justify-between">
            <div>
              <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold uppercase">
                Total Trade-In Value
              </div>
              <div className="text-lg font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-0.5">
                Rs {totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>
            <div className="h-9 w-9 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-600">
              <FiDollarSign className="w-4 h-4" />
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-amber-500/5 border border-amber-500/20 flex items-center justify-between">
            <div>
              <div className="text-[11px] text-amber-600 dark:text-amber-400 font-semibold uppercase">
                Pending / Available
              </div>
              <div className="text-lg font-bold text-amber-600 dark:text-amber-400 mt-0.5">
                {pendingCount} Pending
              </div>
            </div>
            <div className="h-9 w-9 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-600">
              <FiClock className="w-4 h-4" />
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-blue-500/5 border border-blue-500/20 flex items-center justify-between">
            <div>
              <div className="text-[11px] text-blue-600 dark:text-blue-400 font-semibold uppercase">
                Converted to Stock
              </div>
              <div className="text-lg font-bold text-blue-600 dark:text-blue-400 mt-0.5">
                {inStockCount} In Inventory
              </div>
            </div>
            <div className="h-9 w-9 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-600">
              <FiBox className="w-4 h-4" />
            </div>
          </div>
        </div>

        {/* Search Bar */}
        <div className="mb-4">
          <div className="relative max-w-sm">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-muted text-xs" />
            <input
              type="text"
              placeholder="Search trade-ins by model, IMEI, or customer..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-border bg-canvas text-ink placeholder:text-muted focus:border-brand focus:outline-hidden"
            />
          </div>
        </div>

        {loading ? (
          <p className="text-xs text-muted p-8 text-center">Loading trade-in devices…</p>
        ) : filteredTradeIns.length === 0 ? (
          <p className="text-xs text-muted p-8 text-center bg-canvas rounded-xl">
            {searchFilter ? 'No trade-ins match your search.' : 'No trade-in devices recorded yet.'}
          </p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full border-collapse text-left text-xs text-ink">
              <thead>
                <tr className="bg-canvas border-b border-border font-bold text-muted uppercase text-[10px]">
                  <th className="px-4 py-3">Device &amp; IMEI</th>
                  <th className="px-4 py-3">Condition</th>
                  <th className="px-4 py-3 font-mono">Trade-In Value</th>
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredTradeIns.map((t) => (
                  <tr key={t.id} className="hover:bg-canvas">
                    <td className="px-4 py-3">
                      <p className="font-semibold text-ink">{t.deviceInfo}</p>
                      <p className="text-[10px] text-muted font-mono">{t.imei ? `IMEI: ${t.imei}` : 'No IMEI'}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded bg-surface border border-border font-medium text-[11px]">
                        {t.condition}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono font-bold text-emerald-600">
                      Rs {Number(t.tradeInValue).toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-muted">
                      <div className="font-medium text-ink">{t.customerName || 'Walk-in'}</div>
                      <div className="text-[11px]">{t.customerPhone || 'No Phone'}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                          t.status === 'IN_STOCK'
                            ? 'bg-blue-500/10 text-blue-600'
                            : t.status === 'ADJUSTED' || t.status === 'SOLD'
                            ? 'bg-purple-500/10 text-purple-600'
                            : 'bg-amber-500/10 text-amber-600'
                        }`}
                      >
                        {t.status === 'IN_STOCK' ? 'ADDED TO RESALE' : t.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {t.status === 'PENDING' ? (
                        <Button
                          onClick={() => openConvertModal(t)}
                          variant="secondary"
                          className="text-[11px] py-1 px-2.5 font-bold text-brand border-brand/30 hover:bg-brand/10"
                          title="Convert this trade-in device to inventory for resale"
                        >
                          Convert to Resale
                        </Button>
                      ) : (
                        <span className="text-[11px] text-muted italic">Processed</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Intake Modal */}
        {showModal ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-lg rounded-2xl border border-border bg-surface p-5 shadow-xl">
              <h3 className="font-bold text-base text-ink mb-1">Intake Customer Trade-In Device</h3>
              <p className="text-xs text-muted mb-4">
                Record device details, select from customer's previous devices, and assign agreed trade-in value.
              </p>

              <form onSubmit={handleCreateTradeIn} className="space-y-3 text-xs">
                {/* Customer Selector */}
                <div>
                  <label className="text-muted block mb-0.5 font-medium">Select Existing Customer (Optional)</label>
                  <select
                    value={selectedCustomerId}
                    onChange={(e) => setSelectedCustomerId(e.target.value)}
                    className="w-full rounded border border-border bg-canvas px-2.5 py-1.5"
                  >
                    <option value="">-- Walk-in / Enter New Customer --</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name || 'Unnamed'} ({c.phone})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Customer Device Dropdown (if existing customer chosen) */}
                {selectedCustomerId && (
                  <div className="p-2.5 rounded-xl bg-canvas border border-border space-y-1.5">
                    <label className="text-ink block font-bold text-[11px]">
                      Select from Customer's Registered Devices (Purchased in Store)
                    </label>
                    {loadingCustomerDevices ? (
                      <p className="text-[11px] text-muted">Loading customer's devices...</p>
                    ) : customerDevices.length === 0 ? (
                      <p className="text-[11px] text-muted italic">
                        No previous device purchases on file for this customer. Enter device details below.
                      </p>
                    ) : (
                      <select
                        onChange={(e) => handleSelectCustomerDevice(e.target.value)}
                        className="w-full rounded border border-border bg-surface px-2.5 py-1.5 text-ink font-medium"
                      >
                        <option value="">-- Choose one of customer's purchased devices --</option>
                        {customerDevices.map((dev, idx) => (
                          <option key={idx} value={`${dev.productName}|||${dev.imei}`}>
                            {dev.productName} (IMEI: {dev.imei}) - Purchased {new Date(dev.date).toLocaleDateString()}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                )}

                <div>
                  <label className="text-muted block mb-0.5 font-medium">Device Model &amp; Specs *</label>
                  <Input
                    required
                    placeholder="e.g. Samsung Galaxy S21 128GB Black"
                    value={deviceInfo}
                    onChange={(e) => setDeviceInfo(e.target.value)}
                    className="w-full"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-muted block mb-0.5 font-medium">IMEI Number</label>
                    <Input
                      placeholder="35..."
                      value={imei}
                      onChange={(e) => setImei(e.target.value)}
                      className="w-full font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-muted block mb-0.5 font-medium">Condition</label>
                    <select
                      value={condition}
                      onChange={(e) => setCondition(e.target.value)}
                      className="w-full rounded border border-border bg-canvas px-2 py-1.5"
                    >
                      <option value="LIKE_NEW">Like New / Mint</option>
                      <option value="GOOD">Good / Minor Scratches</option>
                      <option value="FAIR">Fair / Visible Wear</option>
                      <option value="DEFECTIVE">Needs Repair</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-muted block mb-0.5 font-medium">Agreed Trade-In Value (Rs) *</label>
                  <Input
                    required
                    type="number"
                    min={1}
                    step="any"
                    placeholder="0.00"
                    value={tradeInValue}
                    onChange={(e) => setTradeInValue(e.target.value)}
                    className="w-full font-mono text-sm font-bold text-emerald-600"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-muted block mb-0.5 font-medium">Customer Name</label>
                    <Input
                      placeholder="Customer name"
                      value={custName}
                      onChange={(e) => setCustName(e.target.value)}
                      className="w-full"
                    />
                  </div>
                  <div>
                    <label className="text-muted block mb-0.5 font-medium">Customer Phone</label>
                    <Input
                      placeholder="e.g. 0771234567"
                      value={custPhone}
                      onChange={(e) => setCustPhone(e.target.value)}
                      className="w-full"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-muted block mb-0.5 font-medium">Notes / Diagnostic Remarks</label>
                  <Input
                    placeholder="e.g. Battery health 86%, accessories included"
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
                    disabled={savingTradeIn}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" className="font-bold" disabled={savingTradeIn}>
                    {savingTradeIn ? 'Saving…' : 'Record Trade-In Device'}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        ) : null}

        {/* Convert to Resale Stock Modal */}
        {showConvertModal && tradeInToConvert ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-md rounded-2xl border border-border bg-surface p-5 shadow-xl">
              <h3 className="font-bold text-base text-ink mb-1">Convert to Resale Inventory</h3>
              <p className="text-xs text-muted mb-3">
                This will add the device to inventory as a used product with barcode/serial tracking.
              </p>

              <form onSubmit={handleConfirmConvert} className="space-y-3 text-xs">
                <div>
                  <label className="text-muted block mb-0.5 font-medium">Product Name *</label>
                  <Input
                    required
                    value={convertName}
                    onChange={(e) => setConvertName(e.target.value)}
                    className="w-full"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-muted block mb-0.5 font-medium">Resale Sell Price (Rs) *</label>
                    <Input
                      required
                      type="number"
                      min={1}
                      step="any"
                      placeholder="0.00"
                      value={convertResalePrice}
                      onChange={(e) => setConvertResalePrice(e.target.value)}
                      className="w-full font-mono text-emerald-600 font-bold"
                    />
                  </div>
                  <div>
                    <label className="text-muted block mb-0.5 font-medium">Wholesale Price (Optional)</label>
                    <Input
                      type="number"
                      min={1}
                      step="any"
                      placeholder="0.00"
                      value={convertWholesalePrice}
                      onChange={(e) => setConvertWholesalePrice(e.target.value)}
                      className="w-full font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-muted block mb-0.5 font-medium">Category</label>
                    <Input
                      value={convertCategory}
                      onChange={(e) => setConvertCategory(e.target.value)}
                      className="w-full"
                    />
                  </div>
                  <div>
                    <label className="text-muted block mb-0.5 font-medium">Cost Price (Trade-in Value)</label>
                    <div className="py-2 px-2.5 rounded bg-canvas border border-border font-mono font-bold text-muted">
                      Rs {Number(tradeInToConvert.tradeInValue).toFixed(2)}
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-border">
                  <Button
                    type="button"
                    onClick={() => setShowConvertModal(false)}
                    variant="secondary"
                    disabled={converting}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" className="font-bold" disabled={converting}>
                    {converting ? 'Converting…' : 'Add to Resale Inventory'}
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

// Sub-component 5: Label Printer Panel