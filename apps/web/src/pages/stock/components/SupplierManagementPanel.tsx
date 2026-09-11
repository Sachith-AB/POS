import { useEffect, useRef, useState } from 'react';
import { api } from '../../../lib/api';
import { Input } from '../../../components/Input';
import { Button } from '../../../components/Button';
import { ConfirmModal } from '../../../components/ConfirmModal';
import { toast } from 'react-toastify';
import type { Product } from '../../../features/products/productsSlice';
import {
  FiSearch,
  FiEdit2,
  FiTrash2,
  FiAlertTriangle,
  FiPlus,
  FiX,
  FiCheckCircle,
  FiDollarSign,
  FiPhone,
  FiMail,
  FiMapPin,
  FiUser,
  FiClock,
  FiFileText,
  FiFilter,
  FiRotateCcw,
  FiTrendingUp,
  FiRefreshCw,
  FiBox,
} from 'react-icons/fi';
import type { SupplierItem } from './types';

export function SupplierManagementPanel() {
  const [suppliers, setSuppliers] = useState<SupplierItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showPayModal, setShowPayModal] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<SupplierItem | null>(null);

  // Profile Drawer / Modal state
  const [viewingProfileId, setViewingProfileId] = useState<string | null>(null);
  const [profileSupplier, setProfileSupplier] = useState<any | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [profileTab, setProfileTab] = useState<'returns' | 'ledger' | 'intakes'>('returns');

  // Return from profile state
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [returnSupplierId, setReturnSupplierId] = useState('');
  const [returnProductId, setReturnProductId] = useState('');
  const [returnQuantity, setReturnQuantity] = useState('1');
  const [returnReason, setReturnReason] = useState<'DEFECTIVE' | 'DAMAGED' | 'WRONG_ITEM' | 'OTHER'>('DEFECTIVE');
  const [returnCreditAmount, setReturnCreditAmount] = useState('');
  const [returnNotes, setReturnNotes] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [savingReturn, setSavingReturn] = useState(false);

  // Add form state
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [savingAdd, setSavingAdd] = useState(false);

  // Edit form state
  const [editingSupplier, setEditingSupplier] = useState<SupplierItem | null>(null);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  // Delete state
  const [supplierToDelete, setSupplierToDelete] = useState<SupplierItem | null>(null);
  const [deletingSupplier, setDeletingSupplier] = useState(false);

  // Payment form state
  const [payAmount, setPayAmount] = useState('');
  const [payRef, setPayRef] = useState('');

  const loadSuppliers = () => {
    setLoading(true);
    api.get<SupplierItem[]>('/suppliers')
      .then((data) => {
        setSuppliers(data || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  const loadProducts = () => {
    api.get<Product[]>('/products').then((data) => setProducts(data || [])).catch(() => {});
  };

  const loadSupplierProfile = async (id: string) => {
    setLoadingProfile(true);
    try {
      const data = await api.get<any>(`/suppliers/${id}`);
      setProfileSupplier(data);
    } catch (err: any) {
      toast.error('Failed to load supplier profile');
    } finally {
      setLoadingProfile(false);
    }
  };

  useEffect(() => {
    loadSuppliers();
    loadProducts();
  }, []);

  useEffect(() => {
    if (viewingProfileId) {
      loadSupplierProfile(viewingProfileId);
    } else {
      setProfileSupplier(null);
    }
  }, [viewingProfileId]);

  async function handleAddSupplier(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSavingAdd(true);
    try {
      await api.post('/suppliers', {
        name: name.trim(),
        phone: phone.trim() || null,
        email: email.trim() || null,
        address: address.trim() || null,
        notes: notes.trim() || null,
      });
      setShowAddModal(false);
      setName('');
      setPhone('');
      setEmail('');
      setAddress('');
      setNotes('');
      loadSuppliers();
      toast.success('Supplier added successfully');
    } catch (err: any) {
      toast.error(err.message || 'Failed to add supplier');
    } finally {
      setSavingAdd(false);
    }
  }

  function openEditSupplierModal(s: SupplierItem) {
    setEditingSupplier(s);
    setEditName(s.name || '');
    setEditPhone(s.phone || '');
    setEditEmail(s.email || '');
    setEditAddress(s.address || '');
    setEditNotes(s.notes || '');
  }

  async function handleEditSupplier(e: React.FormEvent) {
    e.preventDefault();
    if (!editingSupplier || !editName.trim()) return;
    setSavingEdit(true);
    try {
      await api.patch(`/suppliers/${editingSupplier.id}`, {
        name: editName.trim(),
        phone: editPhone.trim() || null,
        email: editEmail.trim() || null,
        address: editAddress.trim() || null,
        notes: editNotes.trim() || null,
      });
      setEditingSupplier(null);
      loadSuppliers();
      if (viewingProfileId === editingSupplier.id) {
        loadSupplierProfile(editingSupplier.id);
      }
      toast.success('Supplier updated successfully');
    } catch (err: any) {
      toast.error(err.message || 'Failed to update supplier');
    } finally {
      setSavingEdit(false);
    }
  }

  async function confirmDeleteSupplier() {
    if (!supplierToDelete) return;
    setDeletingSupplier(true);
    try {
      await api.delete(`/suppliers/${supplierToDelete.id}`);
      toast.success(`Supplier "${supplierToDelete.name}" deleted successfully`);
      if (viewingProfileId === supplierToDelete.id) {
        setViewingProfileId(null);
      }
      setSupplierToDelete(null);
      loadSuppliers();
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete supplier');
    } finally {
      setDeletingSupplier(false);
    }
  }

  async function handleRecordPayment(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedSupplier || !payAmount) return;
    try {
      await api.post(`/suppliers/${selectedSupplier.id}/payments`, {
        amount: parseFloat(payAmount),
        paymentMethod: 'BANK_TRANSFER',
        reference: payRef || undefined,
      });
      setShowPayModal(false);
      setPayAmount('');
      setPayRef('');
      loadSuppliers();
      if (viewingProfileId === selectedSupplier.id) {
        loadSupplierProfile(selectedSupplier.id);
      }
      toast.success('Payment recorded successfully');
    } catch (err: any) {
      toast.error(err.message || 'Failed to record payment');
    }
  }

  function openReturnModalForSupplier(suppId: string) {
    setReturnSupplierId(suppId);
    setReturnProductId('');
    setReturnQuantity('1');
    setReturnReason('DEFECTIVE');
    setReturnCreditAmount('');
    setReturnNotes('');
    setShowReturnModal(true);
  }

  function handleReturnProductChange(pId: string, qtyStr: string) {
    setReturnProductId(pId);
    const prod = products.find((p) => p.id === pId);
    const q = parseInt(qtyStr) || 1;
    if (prod) {
      setReturnCreditAmount((Number(prod.costPrice) * q).toFixed(2));
    }
  }

  function handleReturnQuantityChange(qtyStr: string) {
    setReturnQuantity(qtyStr);
    const prod = products.find((p) => p.id === returnProductId);
    const q = parseInt(qtyStr) || 1;
    if (prod) {
      setReturnCreditAmount((Number(prod.costPrice) * q).toFixed(2));
    }
  }

  async function handleProcessReturn(e: React.FormEvent) {
    e.preventDefault();
    if (!returnSupplierId || !returnProductId) return;
    setSavingReturn(true);
    try {
      await api.post('/supplier-returns', {
        supplierId: returnSupplierId,
        productId: returnProductId,
        quantity: parseInt(returnQuantity) || 1,
        reason: returnReason,
        refundOrCreditAmount: returnCreditAmount ? parseFloat(returnCreditAmount) : undefined,
        notes: returnNotes || undefined,
      });
      setShowReturnModal(false);
      loadSuppliers();
      if (viewingProfileId === returnSupplierId) {
        loadSupplierProfile(returnSupplierId);
      }
      toast.success('Return processed and credit reflected successfully');
    } catch (err: any) {
      toast.error(err.message || 'Failed to process return');
    } finally {
      setSavingReturn(false);
    }
  }

  // Filtered suppliers
  const filteredSuppliers = suppliers.filter((s) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      s.name.toLowerCase().includes(q) ||
      (s.phone && s.phone.toLowerCase().includes(q)) ||
      (s.email && s.email.toLowerCase().includes(q))
    );
  });

  // KPI calculations
  const totalSuppliersCount = suppliers.length;
  const totalCreditBalance = suppliers.reduce((sum, s) => sum + Number(s.outstandingBalance || 0), 0);
  const totalPurchasesValue = suppliers.reduce((sum, s) => sum + Number(s.totalPayable || 0), 0);
  const totalPaidValue = suppliers.reduce((sum, s) => sum + Number(s.paidAmount || 0), 0);

  // Profile return statistics
  const profileReturnsCount = profileSupplier?.returns?.length || 0;
  const profileTotalReturnCredit = (profileSupplier?.returns || []).reduce(
    (sum: number, r: any) => sum + Number(r.refundOrCreditAmount ?? (Number(r.product?.costPrice || 0) * r.quantity)),
    0
  );

  return (
    <div className="space-y-5">
      {/* Top Header & Action */}
      <div className="rounded-2xl border border-border bg-surface p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
          <div>
            <h3 className="font-bold text-base text-ink flex items-center gap-2">
              <span>Supplier Tracking &amp; Credit Balances</span>
              <span className="text-xs bg-brand/10 text-brand font-semibold px-2 py-0.5 rounded-full">
                {totalSuppliersCount} Suppliers
              </span>
            </h3>
            <p className="text-xs text-muted">
              Track credit purchases, outstanding balances, return credit slips, and complete supplier profiles
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={() => setShowAddModal(true)} className="text-xs font-bold flex items-center gap-1.5">
              <FiPlus className="w-3.5 h-3.5" />
              <span>Add Supplier</span>
            </Button>
          </div>
        </div>

        {/* KPI Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
          <div className="p-3.5 rounded-xl bg-canvas border border-border flex items-center justify-between">
            <div>
              <div className="text-[11px] text-muted font-medium">Total Suppliers</div>
              <div className="text-lg font-bold text-ink mt-0.5">{totalSuppliersCount}</div>
            </div>
            <div className="h-9 w-9 rounded-lg bg-surface border border-border flex items-center justify-center text-muted">
              <FiUser className="w-4 h-4" />
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-rose-500/5 border border-rose-500/20 flex items-center justify-between">
            <div>
              <div className="text-[11px] text-rose-600 dark:text-rose-400 font-semibold uppercase tracking-wider">
                Credit Balance (Payable)
              </div>
              <div className="text-lg font-bold font-mono text-rose-600 dark:text-rose-400 mt-0.5">
                Rs {totalCreditBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>
            <div className="h-9 w-9 rounded-lg bg-rose-500/10 flex items-center justify-center text-rose-600">
              <FiDollarSign className="w-4 h-4" />
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-canvas border border-border flex items-center justify-between">
            <div>
              <div className="text-[11px] text-muted font-medium">Total Purchased</div>
              <div className="text-lg font-bold font-mono text-ink mt-0.5">
                Rs {totalPurchasesValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>
            <div className="h-9 w-9 rounded-lg bg-surface border border-border flex items-center justify-center text-muted">
              <FiTrendingUp className="w-4 h-4" />
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-emerald-500/5 border border-emerald-500/20 flex items-center justify-between">
            <div>
              <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold uppercase tracking-wider">
                Total Paid
              </div>
              <div className="text-lg font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-0.5">
                Rs {totalPaidValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>
            <div className="h-9 w-9 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-600">
              <FiCheckCircle className="w-4 h-4" />
            </div>
          </div>
        </div>

        {/* Search Bar */}
        <div className="mb-4">
          <div className="relative max-w-sm">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-muted text-xs" />
            <input
              type="text"
              placeholder="Search suppliers by name, phone, or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl border border-border bg-canvas text-ink placeholder:text-muted focus:border-brand focus:outline-hidden"
            />
          </div>
        </div>

        {/* Suppliers Table */}
        {loading ? (
          <p className="text-xs text-muted p-8 text-center">Loading suppliers…</p>
        ) : filteredSuppliers.length === 0 ? (
          <p className="text-xs text-muted p-8 text-center bg-canvas rounded-xl">
            {searchQuery ? 'No suppliers match your search.' : 'No suppliers recorded yet.'}
          </p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full border-collapse text-left text-xs text-ink">
              <thead>
                <tr className="bg-canvas border-b border-border text-xs font-bold text-muted uppercase">
                  <th className="px-4 py-3">Supplier Name &amp; Profile</th>
                  <th className="px-4 py-3">Contact Details</th>
                  <th className="px-4 py-3 font-mono">Total Purchased</th>
                  <th className="px-4 py-3 font-mono">Paid Amount</th>
                  <th className="px-4 py-3 font-mono text-rose-600">Credit Balance (Payable)</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredSuppliers.map((s) => (
                  <tr key={s.id} className="hover:bg-canvas/70 transition-colors">
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => {
                          setViewingProfileId(s.id);
                          setProfileTab('returns');
                        }}
                        className="text-left font-bold text-ink hover:text-brand flex items-center gap-1.5 group cursor-pointer"
                        title="Click to view Supplier Profile & Return Records"
                      >
                        <span className="h-7 w-7 rounded-lg bg-brand/10 text-brand flex items-center justify-center font-bold text-xs group-hover:bg-brand group-hover:text-white transition-all">
                          {s.name.charAt(0).toUpperCase()}
                        </span>
                        <div>
                          <div className="group-hover:underline">{s.name}</div>
                          {s.address ? (
                            <div className="text-[11px] font-normal text-muted truncate max-w-[180px]">
                              {s.address}
                            </div>
                          ) : null}
                        </div>
                      </button>
                    </td>
                    <td className="px-4 py-3 text-muted">
                      {s.phone ? <div className="text-ink font-medium">{s.phone}</div> : <div className="text-muted">—</div>}
                      {s.email ? <div className="text-[11px] text-muted">{s.email}</div> : null}
                    </td>
                    <td className="px-4 py-3 font-mono">Rs {Number(s.totalPayable).toFixed(2)}</td>
                    <td className="px-4 py-3 font-mono text-emerald-600">Rs {Number(s.paidAmount).toFixed(2)}</td>
                    <td className="px-4 py-3 font-mono font-bold text-rose-600">
                      <span className="bg-rose-500/10 text-rose-600 px-2 py-0.5 rounded">
                        Rs {Number(s.outstandingBalance).toFixed(2)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          onClick={() => {
                            setViewingProfileId(s.id);
                            setProfileTab('returns');
                          }}
                          variant="secondary"
                          className="py-1 px-2.5 text-xs font-semibold flex items-center gap-1 text-brand border-brand/20 hover:bg-brand/10"
                          title="View supplier profile, return records, and ledger"
                        >
                          <FiUser className="h-3 w-3" />
                          <span>Profile</span>
                        </Button>
                        <Button
                          onClick={() => {
                            setSelectedSupplier(s);
                            setPayAmount('');
                            setPayRef(`PAY-${Date.now().toString().slice(-6)}-${Math.floor(1000 + Math.random() * 9000)}`);
                            setShowPayModal(true);
                          }}
                          variant="secondary"
                          className="text-[11px] py-1 px-2.5 font-bold"
                          title="Record supplier payment"
                        >
                          Record Payment
                        </Button>
                        <Button
                          onClick={() => openEditSupplierModal(s)}
                          variant="secondary"
                          className="py-1 px-2.5 text-xs font-semibold flex items-center gap-1"
                          title="Edit supplier"
                        >
                          <FiEdit2 className="h-3 w-3" />
                          <span>Edit</span>
                        </Button>
                        <Button
                          type="button"
                          variant="secondary"
                          onClick={() => setSupplierToDelete(s)}
                          className="py-1 px-2.5 text-xs font-semibold flex items-center gap-1 text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30 border-rose-200 dark:border-rose-900/50"
                          title="Delete supplier"
                        >
                          <FiTrash2 className="h-3 w-3" />
                          <span>Delete</span>
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* SUPPLIER PROFILE MODAL / DRAWER */}
      {viewingProfileId ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 sm:p-5 backdrop-blur-xs">
          <div className="w-full max-w-4xl max-h-[90vh] flex flex-col rounded-2xl border border-border bg-surface shadow-2xl overflow-hidden">
            {/* Profile Modal Header */}
            <div className="p-4 sm:p-5 border-b border-border bg-canvas/60 flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="h-11 w-11 rounded-xl bg-brand/10 text-brand flex items-center justify-center font-bold text-base shrink-0">
                  {profileSupplier ? profileSupplier.name.charAt(0).toUpperCase() : <FiUser className="w-5 h-5" />}
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-lg font-bold text-ink">
                      {profileSupplier?.name || 'Loading Supplier Profile...'}
                    </h2>
                    <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-surface border border-border text-muted">
                      Supplier Profile
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-muted mt-1">
                    {profileSupplier?.phone && (
                      <span className="flex items-center gap-1 text-brand font-medium">
                        <FiPhone className="w-3.5 h-3.5" /> {profileSupplier.phone}
                      </span>
                    )}
                    {profileSupplier?.email && (
                      <span className="flex items-center gap-1 text-muted">
                        <FiMail className="w-3.5 h-3.5" /> {profileSupplier.email}
                      </span>
                    )}
                    {profileSupplier?.address && (
                      <span className="flex items-center gap-1 text-muted">
                        <FiMapPin className="w-3.5 h-3.5" /> {profileSupplier.address}
                      </span>
                    )}
                  </div>
                  {profileSupplier?.notes && (
                    <p className="text-[11px] text-muted italic mt-1 bg-surface/50 border border-border/50 px-2 py-0.5 rounded">
                      Note: {profileSupplier.notes}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                {profileSupplier && (
                  <>
                    <Button
                      onClick={() => openReturnModalForSupplier(profileSupplier.id)}
                      variant="secondary"
                      className="text-xs font-bold text-rose-600 border-rose-300 hover:bg-rose-50 dark:hover:bg-rose-950/30 flex items-center gap-1 py-1 px-2.5"
                    >
                      <FiRotateCcw className="w-3 h-3" />
                      <span>+ Process Return</span>
                    </Button>
                    <Button
                      onClick={() => {
                        setSelectedSupplier(profileSupplier);
                        setPayAmount('');
                        setPayRef(`PAY-${Date.now().toString().slice(-6)}-${Math.floor(1000 + Math.random() * 9000)}`);
                        setShowPayModal(true);
                      }}
                      className="text-xs font-bold flex items-center gap-1 py-1 px-2.5"
                    >
                      <FiDollarSign className="w-3 h-3" />
                      <span>Record Payment</span>
                    </Button>
                  </>
                )}
                <button
                  type="button"
                  onClick={() => setViewingProfileId(null)}
                  className="p-1.5 rounded-lg text-muted hover:text-ink hover:bg-canvas transition-colors"
                >
                  <FiX className="w-5 h-5" />
                </button>
              </div>
            </div>

            {loadingProfile || !profileSupplier ? (
              <div className="p-12 text-center text-muted text-xs">Loading complete supplier profile data...</div>
            ) : (
              <div className="flex-1 flex flex-col overflow-hidden">
                {/* Profile Financial Statistics Bar */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-4 bg-surface border-b border-border">
                  <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20">
                    <div className="text-[10px] font-bold text-rose-600 uppercase tracking-wider">
                      Credit Amount (Payable)
                    </div>
                    <div className="text-base sm:text-lg font-bold font-mono text-rose-600 mt-0.5">
                      Rs {Number(profileSupplier.outstandingBalance).toFixed(2)}
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-canvas border border-border">
                    <div className="text-[10px] font-medium text-muted uppercase">Total Purchased</div>
                    <div className="text-sm sm:text-base font-bold font-mono text-ink mt-0.5">
                      Rs {Number(profileSupplier.totalPayable).toFixed(2)}
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-canvas border border-border">
                    <div className="text-[10px] font-medium text-muted uppercase">Total Paid</div>
                    <div className="text-sm sm:text-base font-bold font-mono text-emerald-600 mt-0.5">
                      Rs {Number(profileSupplier.paidAmount).toFixed(2)}
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-canvas border border-border">
                    <div className="text-[10px] font-medium text-muted uppercase">Return Claims</div>
                    <div className="text-sm sm:text-base font-bold text-ink mt-0.5 flex items-center justify-between">
                      <span>{profileReturnsCount} Returns</span>
                      <span className="text-xs font-mono text-emerald-600">
                        Rs {profileTotalReturnCredit.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Profile Navigation Tabs */}
                <div className="flex border-b border-border bg-canvas px-4 gap-1 text-xs font-medium">
                  <button
                    type="button"
                    onClick={() => setProfileTab('returns')}
                    className={`py-2.5 px-3 border-b-2 font-bold cursor-pointer transition-all flex items-center gap-1.5 ${
                      profileTab === 'returns'
                        ? 'border-brand text-brand bg-surface'
                        : 'border-transparent text-muted hover:text-ink'
                    }`}
                  >
                    <FiRotateCcw className="w-3.5 h-3.5" />
                    <span>Return Records</span>
                    <span className="ml-1 text-[10px] px-1.5 py-0.2 rounded-full bg-brand/10 text-brand">
                      {profileReturnsCount}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setProfileTab('ledger')}
                    className={`py-2.5 px-3 border-b-2 font-bold cursor-pointer transition-all flex items-center gap-1.5 ${
                      profileTab === 'ledger'
                        ? 'border-brand text-brand bg-surface'
                        : 'border-transparent text-muted hover:text-ink'
                    }`}
                  >
                    <FiFileText className="w-3.5 h-3.5" />
                    <span>Transactions &amp; Ledger</span>
                    <span className="ml-1 text-[10px] px-1.5 py-0.2 rounded-full bg-muted/20 text-muted">
                      {profileSupplier.transactions?.length || 0}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setProfileTab('intakes')}
                    className={`py-2.5 px-3 border-b-2 font-bold cursor-pointer transition-all flex items-center gap-1.5 ${
                      profileTab === 'intakes'
                        ? 'border-brand text-brand bg-surface'
                        : 'border-transparent text-muted hover:text-ink'
                    }`}
                  >
                    <FiBox className="w-3.5 h-3.5" />
                    <span>Stock Received</span>
                    <span className="ml-1 text-[10px] px-1.5 py-0.2 rounded-full bg-muted/20 text-muted">
                      {profileSupplier.stockMovements?.length || 0}
                    </span>
                  </button>
                </div>

                {/* Profile Tab Contents */}
                <div className="p-4 flex-1 overflow-y-auto">
                  {/* TAB 1: RETURN RECORDS */}
                  {profileTab === 'returns' && (
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <div>
                          <h4 className="font-bold text-xs text-ink uppercase tracking-wider">
                            Supplier Return Records &amp; Credit Slips
                          </h4>
                          <p className="text-[11px] text-muted">
                            Defective or damaged items returned to {profileSupplier.name} with auto-credited balances
                          </p>
                        </div>
                        <Button
                          onClick={() => openReturnModalForSupplier(profileSupplier.id)}
                          className="text-xs font-bold py-1 px-3"
                        >
                          + Return Item
                        </Button>
                      </div>

                      {profileSupplier.returns?.length === 0 ? (
                        <div className="p-8 text-center bg-canvas rounded-xl border border-border">
                          <p className="text-xs text-muted mb-2">
                            No return records found for this supplier.
                          </p>
                          <Button
                            onClick={() => openReturnModalForSupplier(profileSupplier.id)}
                            variant="secondary"
                            className="text-xs font-bold"
                          >
                            + Process Return to {profileSupplier.name}
                          </Button>
                        </div>
                      ) : (
                        <div className="overflow-x-auto rounded-xl border border-border">
                          <table className="w-full border-collapse text-left text-xs text-ink">
                            <thead>
                              <tr className="bg-canvas border-b border-border font-bold text-muted uppercase text-[10px]">
                                <th className="px-3.5 py-2.5">Date</th>
                                <th className="px-3.5 py-2.5">Product</th>
                                <th className="px-3.5 py-2.5">Qty Deducted</th>
                                <th className="px-3.5 py-2.5">Reason</th>
                                <th className="px-3.5 py-2.5 font-mono text-emerald-600">Credit Amount</th>
                                <th className="px-3.5 py-2.5">Notes</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                              {profileSupplier.returns.map((ret: any) => {
                                const creditVal = Number(
                                  ret.refundOrCreditAmount ?? (Number(ret.product?.costPrice || 0) * ret.quantity)
                                );
                                return (
                                  <tr key={ret.id} className="hover:bg-canvas">
                                    <td className="px-3.5 py-2.5 text-muted whitespace-nowrap">
                                      {new Date(ret.createdAt).toLocaleDateString()}
                                    </td>
                                    <td className="px-3.5 py-2.5 font-semibold text-ink">
                                      <div>{ret.product?.name || 'Product'}</div>
                                      {ret.product?.sku ? (
                                        <div className="text-[10px] text-muted font-mono font-normal">
                                          SKU: {ret.product.sku}
                                        </div>
                                      ) : null}
                                    </td>
                                    <td className="px-3.5 py-2.5 font-bold">{ret.quantity}</td>
                                    <td className="px-3.5 py-2.5">
                                      <span className="bg-rose-500/10 text-rose-600 px-2 py-0.5 rounded font-bold text-[10px]">
                                        {ret.reason}
                                      </span>
                                    </td>
                                    <td className="px-3.5 py-2.5 font-mono font-bold text-emerald-600 whitespace-nowrap">
                                      Rs {creditVal.toFixed(2)}
                                    </td>
                                    <td className="px-3.5 py-2.5 text-muted max-w-[200px] truncate">
                                      {ret.notes || '—'}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                            <tfoot>
                              <tr className="bg-canvas border-t border-border font-bold text-xs">
                                <td colSpan={4} className="px-3.5 py-2.5 text-right text-muted">
                                  Total Return Credit Claimed:
                                </td>
                                <td className="px-3.5 py-2.5 font-mono text-emerald-600 whitespace-nowrap">
                                  Rs {profileTotalReturnCredit.toFixed(2)}
                                </td>
                                <td></td>
                              </tr>
                            </tfoot>
                          </table>
                        </div>
                      )}
                    </div>
                  )}

                  {/* TAB 2: TRANSACTIONS & LEDGER */}
                  {profileTab === 'ledger' && (
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <h4 className="font-bold text-xs text-ink uppercase tracking-wider">
                          Financial Transactions &amp; Payment Ledger
                        </h4>
                        <span className="text-xs text-muted">
                          Balance: <strong className="text-rose-600 font-mono">Rs {Number(profileSupplier.outstandingBalance).toFixed(2)}</strong>
                        </span>
                      </div>

                      {profileSupplier.transactions?.length === 0 ? (
                        <p className="text-xs text-muted p-8 text-center bg-canvas rounded-xl">
                          No transactions recorded yet.
                        </p>
                      ) : (
                        <div className="overflow-x-auto rounded-xl border border-border">
                          <table className="w-full border-collapse text-left text-xs text-ink">
                            <thead>
                              <tr className="bg-canvas border-b border-border font-bold text-muted uppercase text-[10px]">
                                <th className="px-3.5 py-2.5">Date</th>
                                <th className="px-3.5 py-2.5">Type</th>
                                <th className="px-3.5 py-2.5">Reference</th>
                                <th className="px-3.5 py-2.5 font-mono">Amount</th>
                                <th className="px-3.5 py-2.5">Description / Notes</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                              {profileSupplier.transactions.map((t: any) => (
                                <tr key={t.id} className="hover:bg-canvas">
                                  <td className="px-3.5 py-2.5 text-muted whitespace-nowrap">
                                    {new Date(t.createdAt).toLocaleDateString()}
                                  </td>
                                  <td className="px-3.5 py-2.5">
                                    <span
                                      className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                                        t.type === 'PURCHASE'
                                          ? 'bg-blue-500/10 text-blue-600'
                                          : t.type === 'PAYMENT'
                                          ? 'bg-emerald-500/10 text-emerald-600'
                                          : 'bg-purple-500/10 text-purple-600'
                                      }`}
                                    >
                                      {t.type}
                                    </span>
                                  </td>
                                  <td className="px-3.5 py-2.5 font-mono text-muted">{t.reference || '—'}</td>
                                  <td
                                    className={`px-3.5 py-2.5 font-mono font-bold ${
                                      t.type === 'PAYMENT' || t.type === 'RETURN_CREDIT'
                                        ? 'text-emerald-600'
                                        : 'text-rose-600'
                                    }`}
                                  >
                                    {t.type === 'PAYMENT' || t.type === 'RETURN_CREDIT' ? '-' : '+'}Rs{' '}
                                    {Number(t.amount).toFixed(2)}
                                  </td>
                                  <td className="px-3.5 py-2.5 text-muted">{t.notes || '—'}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}

                  {/* TAB 3: STOCK INTAKES */}
                  {profileTab === 'intakes' && (
                    <div className="space-y-3">
                      <h4 className="font-bold text-xs text-ink uppercase tracking-wider">
                        Recent Stock Intake Deliveries
                      </h4>

                      {profileSupplier.stockMovements?.length === 0 ? (
                        <p className="text-xs text-muted p-8 text-center bg-canvas rounded-xl">
                          No stock movements recorded for this supplier.
                        </p>
                      ) : (
                        <div className="overflow-x-auto rounded-xl border border-border">
                          <table className="w-full border-collapse text-left text-xs text-ink">
                            <thead>
                              <tr className="bg-canvas border-b border-border font-bold text-muted uppercase text-[10px]">
                                <th className="px-3.5 py-2.5">Date</th>
                                <th className="px-3.5 py-2.5">Product</th>
                                <th className="px-3.5 py-2.5">Quantity</th>
                                <th className="px-3.5 py-2.5">Invoice / Movement Ref</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-border">
                              {profileSupplier.stockMovements.map((sm: any) => (
                                <tr key={sm.id} className="hover:bg-canvas">
                                  <td className="px-3.5 py-2.5 text-muted whitespace-nowrap">
                                    {new Date(sm.createdAt).toLocaleDateString()}
                                  </td>
                                  <td className="px-3.5 py-2.5 font-semibold text-ink">
                                    {sm.product?.name || 'Item'}
                                  </td>
                                  <td className="px-3.5 py-2.5 font-bold font-mono">
                                    {sm.quantityDelta > 0 ? `+${sm.quantityDelta}` : sm.quantityDelta}
                                  </td>
                                  <td className="px-3.5 py-2.5 font-mono text-muted">{sm.invoiceRef || '—'}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      ) : null}

      {/* Add Supplier Modal */}
      {showAddModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl border border-border bg-surface p-5 shadow-xl">
            <h3 className="font-bold text-base text-ink mb-3">Add Supplier</h3>
            <form onSubmit={handleAddSupplier} className="space-y-3 text-xs">
              <div>
                <label className="text-muted block mb-0.5">Supplier Name *</label>
                <Input required value={name} onChange={(e) => setName(e.target.value)} className="w-full" placeholder="e.g. Abans PLC" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-muted block mb-0.5">Phone</label>
                  <Input value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full" placeholder="e.g. 0771234567" />
                </div>
                <div>
                  <label className="text-muted block mb-0.5">Email</label>
                  <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full" placeholder="supplier@example.com" />
                </div>
              </div>
              <div>
                <label className="text-muted block mb-0.5">Address</label>
                <Input value={address} onChange={(e) => setAddress(e.target.value)} className="w-full" placeholder="Colombo 03, Sri Lanka" />
              </div>
              <div>
                <label className="text-muted block mb-0.5">Notes</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  className="w-full rounded-xl border border-border bg-surface p-2.5 text-xs text-ink focus:border-brand focus:outline-hidden resize-none"
                  placeholder="Additional supplier notes or contact info..."
                />
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-border">
                <Button type="button" onClick={() => setShowAddModal(false)} variant="secondary" disabled={savingAdd}>
                  Cancel
                </Button>
                <Button type="submit" className="font-bold" disabled={savingAdd}>
                  {savingAdd ? 'Saving…' : 'Save Supplier'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {/* Edit Supplier Modal */}
      {editingSupplier ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl border border-border bg-surface p-5 shadow-xl">
            <h3 className="font-bold text-base text-ink mb-3">Edit Supplier</h3>
            <form onSubmit={handleEditSupplier} className="space-y-3 text-xs">
              <div>
                <label className="text-muted block mb-0.5">Supplier Name *</label>
                <Input
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-muted block mb-0.5">Phone</label>
                  <Input
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    className="w-full"
                  />
                </div>
                <div>
                  <label className="text-muted block mb-0.5">Email</label>
                  <Input
                    type="email"
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    className="w-full"
                  />
                </div>
              </div>
              <div>
                <label className="text-muted block mb-0.5">Address</label>
                <Input
                  value={editAddress}
                  onChange={(e) => setEditAddress(e.target.value)}
                  className="w-full"
                />
              </div>
              <div>
                <label className="text-muted block mb-0.5">Notes</label>
                <textarea
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  rows={2}
                  className="w-full rounded-xl border border-border bg-surface p-2.5 text-xs text-ink focus:border-brand focus:outline-hidden resize-none"
                  placeholder="Additional supplier notes..."
                />
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-border">
                <Button
                  type="button"
                  onClick={() => setEditingSupplier(null)}
                  variant="secondary"
                  disabled={savingEdit}
                >
                  Cancel
                </Button>
                <Button type="submit" className="font-bold" disabled={savingEdit}>
                  {savingEdit ? 'Saving…' : 'Save Changes'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {/* Record Payment Modal */}
      {showPayModal && selectedSupplier ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-2xl border border-border bg-surface p-5 shadow-xl">
            <h3 className="font-bold text-base text-ink mb-1">Record Supplier Payment</h3>
            <p className="text-xs text-muted mb-3">
              Supplier: <strong>{selectedSupplier.name}</strong> | Credit Payable: Rs {Number(selectedSupplier.outstandingBalance).toFixed(2)}
            </p>
            <form onSubmit={handleRecordPayment} className="space-y-3 text-xs">
              <div>
                <label className="text-muted block mb-0.5">Payment Amount (Rs) *</label>
                <Input
                  required
                  type="number"
                  min={1}
                  step="any"
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                  className="w-full font-mono text-sm font-bold"
                />
              </div>
              <div>
                <div className="flex justify-between items-center mb-0.5">
                  <label className="text-muted block font-medium">Reference / Bank Slip #</label>
                  <button
                    type="button"
                    onClick={() => setPayRef(`PAY-${Date.now().toString().slice(-6)}-${Math.floor(1000 + Math.random() * 9000)}`)}
                    className="text-[10px] text-primary hover:underline font-semibold cursor-pointer"
                  >
                    Random Ref
                  </button>
                </div>
                <Input value={payRef} onChange={(e) => setPayRef(e.target.value)} className="w-full font-mono" />
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-border">
                <Button type="button" onClick={() => setShowPayModal(false)} variant="secondary">Cancel</Button>
                <Button type="submit" className="font-bold">Confirm Payment</Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {/* Return Modal (usable from supplier profile as well) */}
      {showReturnModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl border border-border bg-surface p-5 shadow-xl">
            <h3 className="font-bold text-base text-ink mb-1">Return Items to Supplier</h3>
            <p className="text-xs text-muted mb-3">
              Inventory will be automatically deducted, and return credit will reduce supplier payable.
            </p>

            <form onSubmit={handleProcessReturn} className="space-y-3 text-xs">
              <div>
                <label className="text-muted block mb-0.5">Supplier *</label>
                <select
                  required
                  value={returnSupplierId}
                  onChange={(e) => setReturnSupplierId(e.target.value)}
                  className="w-full rounded border border-border bg-canvas px-2.5 py-1.5"
                >
                  <option value="">-- Choose Supplier --</option>
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-muted block mb-0.5">Product to Return *</label>
                <select
                  required
                  value={returnProductId}
                  onChange={(e) => handleReturnProductChange(e.target.value, returnQuantity)}
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
                    value={returnQuantity}
                    onChange={(e) => handleReturnQuantityChange(e.target.value)}
                    className="w-full"
                  />
                </div>
                <div>
                  <label className="text-muted block mb-0.5">Return Reason</label>
                  <select
                    value={returnReason}
                    onChange={(e) => setReturnReason(e.target.value as any)}
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
                  value={returnCreditAmount}
                  onChange={(e) => setReturnCreditAmount(e.target.value)}
                  className="w-full font-mono text-emerald-600 font-bold"
                />
              </div>

              <div>
                <label className="text-muted block mb-0.5">Notes / Defect Details</label>
                <Input
                  placeholder="e.g. Broken screen out of box"
                  value={returnNotes}
                  onChange={(e) => setReturnNotes(e.target.value)}
                  className="w-full"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-border">
                <Button
                  type="button"
                  onClick={() => setShowReturnModal(false)}
                  variant="secondary"
                  disabled={savingReturn}
                >
                  Cancel
                </Button>
                <Button type="submit" className="font-bold" disabled={savingReturn}>
                  {savingReturn ? 'Processing…' : 'Deduct Stock & Process Return'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {/* Delete Supplier Confirmation Modal */}
      <ConfirmModal
        isOpen={Boolean(supplierToDelete)}
        title="Delete Supplier?"
        message={`Are you sure you want to delete supplier "${supplierToDelete?.name}"? This will permanently remove the supplier and any associated transaction records.`}
        confirmLabel="Delete Supplier"
        loading={deletingSupplier}
        onConfirm={confirmDeleteSupplier}
        onCancel={() => setSupplierToDelete(null)}
      />
    </div>
  );
}

// Sub-component 3: Supplier Returns Panel (Q19)