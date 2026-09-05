import { useEffect, useState } from 'react';
import {
  FiSearch,
  FiUserPlus,
  FiFilter,
  FiUser,
  FiPhone,
  FiCreditCard,
  FiAlertTriangle,
  FiCheckCircle,
  FiSlash,
  FiEdit,
  FiX,
  FiChevronRight,
  FiClock,
  FiDollarSign,
  FiShoppingBag,
  FiTool,
  FiRefreshCw,
  FiSmartphone,
  FiFileText,
  FiStar,
} from 'react-icons/fi';
import { useAppDispatch, useAppSelector } from '../app/hooks';
import {
  customersRequested,
  overviewRequested,
  categoriesRequested,
  filtersChanged,
  customerProfileRequested,
  clearSelectedCustomer,
  customerSaveRequested,
  type CustomerListItem,
} from '../features/customers/customersSlice';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { Overlay } from '../components/Overlay';

export function CustomersPage() {
  const dispatch = useAppDispatch();
  const {
    items,
    total,
    page,
    pages,
    loading,
    selectedCustomer,
    profileLoading,
    overview,
    categories,
    saving,
    filters,
  } = useAppSelector((s) => s.customers);

  const [search, setSearch] = useState(filters.search);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<CustomerListItem | null>(null);

  // Modal form states
  const [formPhone, setFormPhone] = useState('');
  const [formName, setFormName] = useState('');
  const [formNic, setFormNic] = useState('');
  const [formAddress, setFormAddress] = useState('');
  const [formNotes, setFormNotes] = useState('');
  const [formIsBlocked, setFormIsBlocked] = useState(false);
  const [formIsSuspended, setFormIsSuspended] = useState(false);
  const [formCategoryIds, setFormCategoryIds] = useState<string[]>([]);

  // Profile Drawer tab state
  const [activeTab, setActiveTab] = useState<
    'sales' | 'payments' | 'installments' | 'repairs' | 'tradeins' | 'imei' | 'notes'
  >('sales');

  useEffect(() => {
    dispatch(customersRequested());
    dispatch(overviewRequested());
    dispatch(categoriesRequested());
  }, [dispatch]);

  // Debounced search trigger
  useEffect(() => {
    const timer = setTimeout(() => {
      if (search !== filters.search) {
        dispatch(filtersChanged({ search, page: 1 }));
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [search, filters.search, dispatch]);

  const openCreateModal = () => {
    setEditingCustomer(null);
    setFormPhone('');
    setFormName('');
    setFormNic('');
    setFormAddress('');
    setFormNotes('');
    setFormIsBlocked(false);
    setFormIsSuspended(false);
    setFormCategoryIds([]);
    setIsEditModalOpen(true);
  };

  const openEditModal = (c: CustomerListItem) => {
    setEditingCustomer(c);
    setFormPhone(c.phone || '');
    setFormName(c.name || '');
    setFormNic(c.nic || '');
    setFormAddress(c.address || '');
    setFormNotes(c.notes || '');
    setFormIsBlocked(c.isBlocked);
    setFormIsSuspended(c.isSuspended);
    setFormCategoryIds(c.categories.map((cat) => cat.id));
    setIsEditModalOpen(true);
  };

  const handleSaveCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formPhone.trim()) return;

    dispatch(
      customerSaveRequested({
        id: editingCustomer?.id,
        phone: formPhone.trim(),
        name: formName.trim() || null,
        nic: formNic.trim() || null,
        address: formAddress.trim() || null,
        notes: formNotes.trim() || null,
        isBlocked: formIsBlocked,
        isSuspended: formIsSuspended,
        categoryIds: formCategoryIds,
      })
    );
    setIsEditModalOpen(false);
  };

  const handleCategoryFilter = (catId: string) => {
    dispatch(filtersChanged({ categoryId: catId, page: 1 }));
  };

  const handlePaymentStatusFilter = (status: string) => {
    dispatch(filtersChanged({ paymentStatus: status, page: 1 }));
  };

  const handleSortChange = (sortBy: string) => {
    const isSame = filters.sortBy === sortBy;
    const sortDir = isSame && filters.sortDir === 'desc' ? 'asc' : 'desc';
    dispatch(filtersChanged({ sortBy, sortDir, page: 1 }));
  };

  const handleSelectCustomer = (id: string) => {
    dispatch(customerProfileRequested(id));
  };

  return (
    <div className="flex flex-col flex-1 h-[calc(100vh-57px)] overflow-hidden bg-canvas text-ink">
      {/* 1. Overview Dashboard Header Cards */}
      <div className="bg-surface border-b border-border p-4 shadow-xs overflow-x-auto">
        <div className="flex items-center justify-between mb-3 min-w-[768px]">
          <div>
            <h1 className="text-xl font-bold tracking-tight">Customer Management</h1>
            <p className="text-xs text-muted">Classify, filter, review and inspect customer history</p>
          </div>
          <Button onClick={openCreateModal} variant="primary" className="flex items-center gap-2">
            <FiUserPlus className="w-4 h-4" /> Add New Customer
          </Button>
        </div>

        {/* Dashboard Metric Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3 min-w-[768px]">
          <button
            onClick={() => {
              dispatch(filtersChanged({ categoryId: 'ALL', paymentStatus: 'ALL', search: '', page: 1 }));
              setSearch('');
            }}
            className={`p-3 rounded-xl border text-left transition-all ${
              filters.categoryId === 'ALL' && filters.paymentStatus === 'ALL'
                ? 'border-accent bg-accent/5 ring-1 ring-accent'
                : 'border-border bg-surface hover:bg-canvas'
            }`}
          >
            <div className="flex items-center justify-between text-muted mb-1">
              <span className="text-xs font-medium">Total Customers</span>
              <FiUser className="w-4 h-4 text-accent" />
            </div>
            <div className="text-xl font-bold">{overview?.totalCustomers ?? 0}</div>
          </button>

          <button
            onClick={() => handleSortChange('totalPurchaseValue')}
            className="p-3 rounded-xl border border-border bg-surface hover:bg-canvas text-left transition-all"
          >
            <div className="flex items-center justify-between text-muted mb-1">
              <span className="text-xs font-medium">Best Buyers</span>
              <FiStar className="w-4 h-4 text-amber-500" />
            </div>
            <div className="text-xl font-bold text-amber-600">{overview?.bestCustomers ?? 0}</div>
          </button>

          <button
            onClick={() => handleSortChange('totalPurchases')}
            className="p-3 rounded-xl border border-border bg-surface hover:bg-canvas text-left transition-all"
          >
            <div className="flex items-center justify-between text-muted mb-1">
              <span className="text-xs font-medium">Regular Buyers</span>
              <FiShoppingBag className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="text-xl font-bold text-emerald-600">{overview?.regularCustomers ?? 0}</div>
          </button>

          <button
            onClick={() => handlePaymentStatusFilter('HAS_OUTSTANDING')}
            className={`p-3 rounded-xl border text-left transition-all ${
              filters.paymentStatus === 'HAS_OUTSTANDING'
                ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/30'
                : 'border-border bg-surface hover:bg-canvas'
            }`}
          >
            <div className="flex items-center justify-between text-muted mb-1">
              <span className="text-xs font-medium">Installment</span>
              <FiCreditCard className="w-4 h-4 text-blue-500" />
            </div>
            <div className="text-xl font-bold text-blue-600">{overview?.installmentCustomers ?? 0}</div>
          </button>

          <button
            onClick={() => handlePaymentStatusFilter('OVERDUE')}
            className={`p-3 rounded-xl border text-left transition-all ${
              filters.paymentStatus === 'OVERDUE'
                ? 'border-orange-500 bg-orange-50/50 dark:bg-orange-950/30'
                : 'border-border bg-surface hover:bg-canvas'
            }`}
          >
            <div className="flex items-center justify-between text-muted mb-1">
              <span className="text-xs font-medium">Overdue</span>
              <FiClock className="w-4 h-4 text-orange-500" />
            </div>
            <div className="text-xl font-bold text-orange-600">{overview?.overdueCustomers ?? 0}</div>
          </button>

          <button
            onClick={() => handlePaymentStatusFilter('OVERDUE')}
            className="p-3 rounded-xl border border-border bg-surface hover:bg-canvas text-left transition-all"
          >
            <div className="flex items-center justify-between text-muted mb-1">
              <span className="text-xs font-medium">Problem / Risk</span>
              <FiAlertTriangle className="w-4 h-4 text-red-500" />
            </div>
            <div className="text-xl font-bold text-red-600">{overview?.problemRiskCustomers ?? 0}</div>
          </button>

          <button
            onClick={() => handlePaymentStatusFilter('BLOCKED')}
            className={`p-3 rounded-xl border text-left transition-all ${
              filters.paymentStatus === 'BLOCKED'
                ? 'border-gray-500 bg-gray-50/50 dark:bg-gray-900/30'
                : 'border-border bg-surface hover:bg-canvas'
            }`}
          >
            <div className="flex items-center justify-between text-muted mb-1">
              <span className="text-xs font-medium">Blocked</span>
              <FiSlash className="w-4 h-4 text-gray-500" />
            </div>
            <div className="text-xl font-bold text-gray-600">{overview?.blockedCustomers ?? 0}</div>
          </button>
        </div>
      </div>

      {/* 2. Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Side: Filter Bar + Customer List Table */}
        <div className="flex-1 flex flex-col min-w-0 border-r border-border">
          {/* Controls Bar */}
          <div className="p-3 bg-surface border-b border-border flex flex-wrap items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative flex-1 min-w-[220px]">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-muted w-4 h-4" />
              <input
                type="text"
                placeholder="Search by Name, Phone, or NIC..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-sm bg-canvas border border-border rounded-lg focus:outline-none focus:border-accent"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted hover:text-ink"
                >
                  <FiX className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Filter Dropdowns */}
            <div className="flex items-center gap-2 flex-wrap">
              {/* Category Filter */}
              <div className="flex items-center gap-1.5 text-xs text-muted">
                <FiFilter className="w-3.5 h-3.5" />
                <select
                  value={filters.categoryId}
                  onChange={(e) => handleCategoryFilter(e.target.value)}
                  className="px-2 py-1.5 text-xs bg-canvas border border-border rounded-lg text-ink focus:outline-none"
                >
                  <option value="ALL">All Categories</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.emoji || ''} {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Payment Status Filter */}
              <select
                value={filters.paymentStatus}
                onChange={(e) => handlePaymentStatusFilter(e.target.value)}
                className="px-2 py-1.5 text-xs bg-canvas border border-border rounded-lg text-ink focus:outline-none"
              >
                <option value="ALL">All Statuses</option>
                <option value="PAID_UP">Fully Paid Up</option>
                <option value="HAS_OUTSTANDING">Has Outstanding Credit</option>
                <option value="OVERDUE">Overdue Installments</option>
                <option value="BLOCKED">Blocked / Suspended</option>
              </select>

              {/* Sort By Dropdown */}
              <select
                value={filters.sortBy}
                onChange={(e) => handleSortChange(e.target.value)}
                className="px-2 py-1.5 text-xs bg-canvas border border-border rounded-lg text-ink focus:outline-none"
              >
                <option value="createdAt">Sort: Latest Created</option>
                <option value="name">Sort: Name (A-Z)</option>
                <option value="totalPurchases">Sort: Most Purchases</option>
                <option value="totalPurchaseValue">Sort: Highest Total Spend</option>
                <option value="outstandingAmount">Sort: Highest Outstanding</option>
                <option value="lastTransactionDate">Sort: Recent Transaction</option>
              </select>
            </div>
          </div>

          {/* Customer Table */}
          <div className="flex-1 overflow-auto">
            {loading ? (
              <div className="flex items-center justify-center h-48 text-muted text-sm gap-2">
                <FiRefreshCw className="w-4 h-4 animate-spin text-accent" /> Loading customers...
              </div>
            ) : items.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 text-muted text-sm">
                <p>No customers found matching the search/filters.</p>
                <Button variant="secondary" className="mt-2 text-xs" onClick={openCreateModal}>
                  Create New Customer
                </Button>
              </div>
            ) : (
              <table className="w-full text-left text-xs border-collapse">
                <thead className="sticky top-0 bg-surface border-b border-border text-muted font-medium">
                  <tr>
                    <th className="p-3">Customer Details</th>
                    <th className="p-3">Categories</th>
                    <th className="p-3 text-right">Purchases</th>
                    <th className="p-3 text-right">Total Spent</th>
                    <th className="p-3 text-right">Outstanding</th>
                    <th className="p-3">Status</th>
                    <th className="p-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {items.map((customer) => {
                    const isSelected = selectedCustomer?.id === customer.id;
                    return (
                      <tr
                        key={customer.id}
                        onClick={() => handleSelectCustomer(customer.id)}
                        className={`cursor-pointer transition-colors hover:bg-canvas ${
                          isSelected ? 'bg-accent/10 border-l-4 border-l-accent' : ''
                        }`}
                      >
                        <td className="p-3">
                          <div className="font-semibold text-sm text-ink">{customer.name || 'Unnamed Customer'}</div>
                          <div className="flex items-center gap-2 text-muted text-[11px] mt-0.5">
                            <span className="flex items-center gap-1">
                              <FiPhone className="w-3 h-3 text-accent" /> {customer.phone}
                            </span>
                            {customer.nic && <span className="text-muted/70">• NIC: {customer.nic}</span>}
                          </div>
                        </td>

                        <td className="p-3">
                          <div className="flex flex-wrap gap-1">
                            {customer.categories.length > 0 ? (
                              customer.categories.map((cat) => (
                                <span
                                  key={cat.id}
                                  className="px-2 py-0.5 rounded-full text-[10px] font-medium border"
                                  style={{
                                    borderColor: cat.color || '#3B82F6',
                                    color: cat.color || '#3B82F6',
                                    backgroundColor: `${cat.color || '#3B82F6'}15`,
                                  }}
                                >
                                  {cat.emoji || ''} {cat.name}
                                </span>
                              ))
                            ) : (
                              <span className="text-muted text-[10px] italic">Unclassified</span>
                            )}
                          </div>
                        </td>

                        <td className="p-3 text-right font-medium">{customer.totalPurchases} orders</td>

                        <td className="p-3 text-right font-bold text-emerald-600">
                          Rs. {customer.totalPurchaseValue.toLocaleString('en-US')}
                        </td>

                        <td className="p-3 text-right font-bold">
                          {customer.outstandingAmount > 0 ? (
                            <span className="text-red-600">
                              Rs. {customer.outstandingAmount.toLocaleString('en-US')}
                            </span>
                          ) : (
                            <span className="text-muted">Rs. 0</span>
                          )}
                        </td>

                        <td className="p-3">
                          {customer.isBlocked ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300">
                              <FiSlash className="w-3 h-3" /> BLOCKED
                            </span>
                          ) : customer.isSuspended ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-orange-100 dark:bg-orange-950 text-orange-700 dark:text-orange-300">
                              <FiAlertTriangle className="w-3 h-3" /> SUSPENDED
                            </span>
                          ) : customer.hasOverdue ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300">
                              <FiClock className="w-3 h-3" /> OVERDUE
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                              <FiCheckCircle className="w-3 h-3" /> ACTIVE
                            </span>
                          )}
                        </td>

                        <td className="p-3 text-right">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              openEditModal(customer);
                            }}
                            className="p-1 text-muted hover:text-accent rounded-md hover:bg-surface border border-transparent hover:border-border"
                            title="Edit Customer"
                          >
                            <FiEdit className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {/* Pagination Footer */}
          {pages > 1 && (
            <div className="p-3 bg-surface border-t border-border flex items-center justify-between text-xs text-muted">
              <span>
                Showing page {page} of {pages} ({total} total customers)
              </span>
              <div className="flex items-center gap-1">
                <Button
                  variant="secondary"
                  disabled={page <= 1}
                  onClick={() => dispatch(filtersChanged({ page: page - 1 }))}
                  className="px-2 py-1 text-xs"
                >
                  Previous
                </Button>
                <Button
                  variant="secondary"
                  disabled={page >= pages}
                  onClick={() => dispatch(filtersChanged({ page: page + 1 }))}
                  className="px-2 py-1 text-xs"
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Right Side: Detailed Customer Profile Panel Drawer */}
        {selectedCustomer ? (
          <div className="w-[480px] lg:w-[560px] bg-surface flex flex-col border-l border-border shadow-xl h-full overflow-hidden">
            {/* Profile Panel Header */}
            <div className="p-4 border-b border-border bg-canvas/50 flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold text-ink">
                    {selectedCustomer.name || 'Unnamed Customer'}
                  </h2>
                  <button
                    onClick={() => openEditModal(selectedCustomer)}
                    className="text-muted hover:text-accent text-xs flex items-center gap-1 border border-border rounded px-1.5 py-0.5"
                  >
                    <FiEdit className="w-3 h-3" /> Edit Profile
                  </button>
                </div>
                <div className="flex flex-wrap items-center gap-3 text-xs text-muted mt-1">
                  <span className="flex items-center gap-1 text-accent font-medium">
                    <FiPhone className="w-3.5 h-3.5" /> {selectedCustomer.phone}
                  </span>
                  {selectedCustomer.nic && <span>NIC: {selectedCustomer.nic}</span>}
                </div>
                {selectedCustomer.address && (
                  <p className="text-xs text-muted mt-1 truncate max-w-md">{selectedCustomer.address}</p>
                )}

                {/* Category Badges */}
                <div className="flex flex-wrap gap-1 mt-2">
                  {selectedCustomer.categories.map((cat) => (
                    <span
                      key={cat.id}
                      className="px-2 py-0.5 rounded-full text-[11px] font-semibold border"
                      style={{
                        borderColor: cat.color || '#3B82F6',
                        color: cat.color || '#3B82F6',
                        backgroundColor: `${cat.color || '#3B82F6'}18`,
                      }}
                    >
                      {cat.name}
                    </span>
                  ))}
                </div>
              </div>

              <button
                onClick={() => dispatch(clearSelectedCustomer())}
                className="text-muted hover:text-ink p-1 rounded-md hover:bg-canvas"
              >
                <FiX className="w-5 h-5" />
              </button>
            </div>

            {/* Profile Statistics Header */}
            <div className="grid grid-cols-4 gap-2 p-3 bg-surface border-b border-border text-center">
              <div className="p-2 rounded-lg bg-canvas border border-border">
                <div className="text-[10px] text-muted font-medium">Purchases</div>
                <div className="text-sm font-bold text-ink">{selectedCustomer.stats.totalPurchases}</div>
              </div>
              <div className="p-2 rounded-lg bg-canvas border border-border">
                <div className="text-[10px] text-muted font-medium">Total Spent</div>
                <div className="text-xs font-bold text-emerald-600">
                  Rs. {selectedCustomer.stats.totalPurchaseValue.toLocaleString()}
                </div>
              </div>
              <div className="p-2 rounded-lg bg-canvas border border-border">
                <div className="text-[10px] text-muted font-medium">Total Paid</div>
                <div className="text-xs font-bold text-blue-600">
                  Rs. {selectedCustomer.stats.totalPaidAmount.toLocaleString()}
                </div>
              </div>
              <div className="p-2 rounded-lg bg-canvas border border-border">
                <div className="text-[10px] text-muted font-medium">Outstanding</div>
                <div className="text-xs font-bold text-red-600">
                  Rs. {selectedCustomer.stats.outstandingAmount.toLocaleString()}
                </div>
              </div>
            </div>

            {/* Profile Tabs Navigation */}
            <div className="flex border-b border-border bg-canvas overflow-x-auto text-xs font-medium">
              {[
                { id: 'sales', label: `Sales (${selectedCustomer.sales.length})`, icon: FiShoppingBag },
                { id: 'installments', label: 'Installments', icon: FiCreditCard },
                { id: 'repairs', label: `Repairs (${selectedCustomer.repairTickets.length})`, icon: FiTool },
                { id: 'tradeins', label: `Trade-Ins (${selectedCustomer.tradeIns.length})`, icon: FiRefreshCw },
                { id: 'imei', label: `IMEI History (${selectedCustomer.imeiHistory.length})`, icon: FiSmartphone },
                { id: 'notes', label: 'Notes', icon: FiFileText },
              ].map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`flex items-center gap-1.5 px-3 py-2.5 whitespace-nowrap border-b-2 transition-all ${
                      isActive
                        ? 'border-accent text-accent font-bold bg-surface'
                        : 'border-transparent text-muted hover:text-ink'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {/* Profile Tab Content Area */}
            <div className="flex-1 overflow-auto p-4">
              {profileLoading ? (
                <div className="flex items-center justify-center h-32 text-muted text-sm gap-2">
                  <FiRefreshCw className="w-4 h-4 animate-spin text-accent" /> Loading details...
                </div>
              ) : activeTab === 'sales' ? (
                /* Sales Tab */
                <div className="space-y-3">
                  {selectedCustomer.sales.length === 0 ? (
                    <p className="text-xs text-muted italic">No sales history found for this customer.</p>
                  ) : (
                    selectedCustomer.sales.map((sale) => (
                      <div key={sale.id} className="p-3 rounded-lg border border-border bg-canvas space-y-2 text-xs">
                        <div className="flex items-center justify-between font-medium">
                          <span className="font-mono text-muted">Sale ID: {sale.id.slice(0, 8)}...</span>
                          <span className="font-bold text-ink">Rs. {Number(sale.total).toLocaleString()}</span>
                        </div>
                        <div className="flex items-center justify-between text-muted text-[11px]">
                          <span>Date: {new Date(sale.createdAt).toLocaleDateString()}</span>
                          <span className="px-1.5 py-0.5 rounded bg-surface border border-border font-semibold">
                            {sale.status}
                          </span>
                        </div>

                        {/* Items list */}
                        <div className="border-t border-border/60 pt-2 space-y-1">
                          {sale.items.map((item: any) => (
                            <div key={item.id} className="flex items-center justify-between text-muted">
                              <span>
                                {item.quantity}x {item.product.name}
                              </span>
                              <span>Rs. {Number(item.lineTotal).toLocaleString()}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              ) : activeTab === 'installments' ? (
                /* Installments Tab */
                <div className="space-y-3">
                  {selectedCustomer.sales.filter((s) => s.installmentPlan).length === 0 ? (
                    <p className="text-xs text-muted italic">No installment plans found for this customer.</p>
                  ) : (
                    selectedCustomer.sales
                      .filter((s) => s.installmentPlan)
                      .map((sale) => {
                        const plan = sale.installmentPlan!;
                        return (
                          <div key={plan.id} className="p-3 rounded-lg border border-border bg-canvas space-y-2 text-xs">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-ink">
                                Installment Status:{' '}
                                <span
                                  className={
                                    plan.status === 'OVERDUE'
                                      ? 'text-red-600 font-bold'
                                      : plan.status === 'COMPLETE'
                                      ? 'text-emerald-600'
                                      : 'text-blue-600'
                                  }
                                >
                                  {plan.status}
                                </span>
                              </span>
                              <span className="font-bold text-red-600">
                                Remaining: Rs. {Number(plan.remainingBalance).toLocaleString()}
                              </span>
                            </div>
                            {plan.guarantorName && (
                              <div className="text-[11px] text-muted">
                                Guarantor: {plan.guarantorName} ({plan.guarantorPhone || 'N/A'})
                              </div>
                            )}
                          </div>
                        );
                      })
                  )}
                </div>
              ) : activeTab === 'repairs' ? (
                /* Repairs Tab */
                <div className="space-y-3">
                  {selectedCustomer.repairTickets.length === 0 ? (
                    <p className="text-xs text-muted italic">No repair tickets found for this customer.</p>
                  ) : (
                    selectedCustomer.repairTickets.map((repair: any) => (
                      <div key={repair.id} className="p-3 rounded-lg border border-border bg-canvas space-y-1 text-xs">
                        <div className="flex items-center justify-between font-semibold">
                          <span>
                            #{repair.ticketNumber} - {repair.deviceInfo}
                          </span>
                          <span className="text-accent">{repair.status}</span>
                        </div>
                        <p className="text-muted text-[11px]">Issue: {repair.issue}</p>
                        <div className="flex items-center justify-between text-muted text-[11px] pt-1 border-t border-border/60">
                          <span>Technician: {repair.technician?.name || 'Unassigned'}</span>
                          <span>Estimate: Rs. {repair.estimate ? Number(repair.estimate).toLocaleString() : 'N/A'}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              ) : activeTab === 'tradeins' ? (
                /* Trade-Ins Tab */
                <div className="space-y-3">
                  {selectedCustomer.tradeIns.length === 0 ? (
                    <p className="text-xs text-muted italic">No trade-in records found for this customer.</p>
                  ) : (
                    selectedCustomer.tradeIns.map((trade: any) => (
                      <div key={trade.id} className="p-3 rounded-lg border border-border bg-canvas space-y-1 text-xs">
                        <div className="flex items-center justify-between font-semibold">
                          <span>{trade.deviceInfo}</span>
                          <span className="text-emerald-600">
                            Value: Rs. {Number(trade.tradeInValue).toLocaleString()}
                          </span>
                        </div>
                        {trade.imei && <p className="text-muted text-[11px]">IMEI: {trade.imei}</p>}
                        <p className="text-muted text-[11px]">Condition: {trade.condition}</p>
                      </div>
                    ))
                  )}
                </div>
              ) : activeTab === 'imei' ? (
                /* IMEI / Device History Tab */
                <div className="space-y-2">
                  {selectedCustomer.imeiHistory.length === 0 ? (
                    <p className="text-xs text-muted italic">No serialized IMEI device records purchased.</p>
                  ) : (
                    selectedCustomer.imeiHistory.map((item, idx) => (
                      <div
                        key={idx}
                        className="p-2.5 rounded-lg border border-border bg-canvas flex items-center justify-between text-xs"
                      >
                        <div>
                          <div className="font-semibold text-ink">{item.productName}</div>
                          <div className="font-mono text-muted text-[11px]">IMEI: {item.imei}</div>
                        </div>
                        <div className="text-muted text-[11px] text-right">
                          {new Date(item.date).toLocaleDateString()}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              ) : (
                /* Notes Tab */
                <div className="space-y-3">
                  <div className="p-3 rounded-lg border border-border bg-canvas text-xs leading-relaxed text-ink min-h-[100px]">
                    {selectedCustomer.notes || 'No notes or remarks saved for this customer.'}
                  </div>
                  <Button
                    onClick={() => openEditModal(selectedCustomer)}
                    variant="secondary"
                    className="w-full text-xs"
                  >
                    Edit Notes & Remarks
                  </Button>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="hidden lg:flex flex-1 items-center justify-center text-muted text-sm p-6 text-center border-l border-border bg-surface">
            <div>
              <FiUser className="w-12 h-12 text-muted/30 mx-auto mb-2" />
              <p>Select any customer row from the list to view full profile history</p>
            </div>
          </div>
        )}
      </div>

      {/* 3. Create / Edit Customer Modal */}
      {isEditModalOpen && (
        <Overlay onClose={() => setIsEditModalOpen(false)}>
          <div className="space-y-4 max-h-[80vh] overflow-y-auto pr-1">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-base font-bold text-ink">
                {editingCustomer ? 'Edit Customer Profile' : 'Add New Customer'}
              </h3>
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="text-muted hover:text-ink p-1 rounded"
              >
                <FiX className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCustomer} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-muted mb-1">Phone Number *</label>
                  <Input
                    type="text"
                    required
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    placeholder="e.g. 0771234567"
                    className="w-full text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-muted mb-1">Customer Name</label>
                  <Input
                    type="text"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="Full Name"
                    className="w-full text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-muted mb-1">NIC Number</label>
                  <Input
                    type="text"
                    value={formNic}
                    onChange={(e) => setFormNic(e.target.value)}
                    placeholder="e.g. 199012345V"
                    className="w-full text-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-muted mb-1">Address</label>
                  <Input
                    type="text"
                    value={formAddress}
                    onChange={(e) => setFormAddress(e.target.value)}
                    placeholder="Address"
                    className="w-full text-xs"
                  />
                </div>
              </div>

              {/* Customer Category Multi-Select */}
              <div>
                <label className="block text-xs font-medium text-muted mb-1.5">
                  Assigned Categories / Groups
                </label>
                <div className="flex flex-wrap gap-1.5 p-2 bg-canvas border border-border rounded-lg max-h-36 overflow-y-auto">
                  {categories.map((cat) => {
                    const isChecked = formCategoryIds.includes(cat.id);
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => {
                          if (isChecked) {
                            setFormCategoryIds(formCategoryIds.filter((id) => id !== cat.id));
                          } else {
                            setFormCategoryIds([...formCategoryIds, cat.id]);
                          }
                        }}
                        className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-all flex items-center gap-1 ${
                          isChecked
                            ? 'bg-accent/20 border-accent text-accent font-semibold'
                            : 'bg-surface border-border text-muted hover:border-ink'
                        }`}
                      >
                        <span>{cat.emoji}</span>
                        <span>{cat.name}</span>
                        {isChecked && <FiCheckCircle className="w-3 h-3 text-accent" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Status Flags */}
              <div className="flex items-center gap-6 p-3 bg-canvas border border-border rounded-lg">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-medium">
                  <input
                    type="checkbox"
                    checked={formIsBlocked}
                    onChange={(e) => setFormIsBlocked(e.target.checked)}
                    className="rounded border-border text-red-600 focus:ring-red-500"
                  />
                  <span className={formIsBlocked ? 'text-red-600 font-bold' : ''}>Block Customer</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-xs font-medium">
                  <input
                    type="checkbox"
                    checked={formIsSuspended}
                    onChange={(e) => setFormIsSuspended(e.target.checked)}
                    className="rounded border-border text-orange-600 focus:ring-orange-500"
                  />
                  <span className={formIsSuspended ? 'text-orange-600 font-bold' : ''}>
                    Suspend Account
                  </span>
                </label>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-medium text-muted mb-1">
                  Notes & Remarks
                </label>
                <textarea
                  rows={3}
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  placeholder="Special instructions, payment behavior notes, remarks..."
                  className="w-full p-2.5 text-xs bg-canvas border border-border rounded-lg focus:outline-none focus:border-accent text-ink"
                />
              </div>

              {/* Submit / Cancel Buttons */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setIsEditModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" variant="primary" disabled={saving}>
                  {saving ? 'Saving...' : editingCustomer ? 'Update Customer' : 'Create Customer'}
                </Button>
              </div>
            </form>
          </div>
        </Overlay>
      )}
    </div>
  );
}
