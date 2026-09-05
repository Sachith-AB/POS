import { useEffect, useRef, useState, type FormEvent } from 'react';
import { PIN_LENGTH } from '@pos/shared';
import { useAppDispatch, useAppSelector } from '../app/hooks';
import { settingsUpdateRequested, settingsUpdated, type ShopSettings } from '../features/settings/settingsSlice';
import { employeeCreateRequested, employeesRequested, type Employee } from '../features/auth/authSlice';
import { Input } from '../components/Input';
import { Button } from '../components/Button';
import { PinInput } from '../components/PinInput';
import { Overlay } from '../components/Overlay';
import { UndoToast } from '../components/UndoToast';
import { api } from '../lib/api';

const selectClass = 'w-full rounded-lg border border-border bg-canvas px-3 py-2 text-xs text-ink focus:border-primary focus:outline-none';
const labelClass = 'mt-3 block text-xs font-semibold text-muted';

interface CategoryItem {
  id: string;
  name: string;
  description: string | null;
}

interface WarrantyItem {
  id: string;
  label: string;
  durationDays: number;
  appliesToSales: boolean;
  appliesToRepairs: boolean;
}

interface DefaultActionItem {
  id: string;
  triggerDaysOverdue: number;
  actionType: 'WARNING' | 'SUSPEND' | 'BLOCK';
  description: string;
  isActive: boolean;
}

function AddEmployeeModal({ onClose }: { onClose: () => void }) {
  const dispatch = useAppDispatch();
  const addingEmployee = useAppSelector((s) => s.auth.addingEmployee);
  const addEmployeeError = useAppSelector((s) => s.auth.addEmployeeError);

  const [newName, setNewName] = useState('');
  const [newPin, setNewPin] = useState('');
  const [newRole, setNewRole] = useState<Employee['role']>('EMPLOYEE');

  const wasAddingRef = useRef(false);
  useEffect(() => {
    if (wasAddingRef.current && !addingEmployee && !addEmployeeError) {
      onClose();
    }
    wasAddingRef.current = addingEmployee;
  }, [addingEmployee, addEmployeeError, onClose]);

  function submit() {
    if (!newName.trim() || newPin.length !== PIN_LENGTH) return;
    dispatch(employeeCreateRequested({ name: newName.trim(), pin: newPin, role: newRole }));
  }

  return (
    <Overlay onClose={onClose}>
      <h3 className="text-base font-bold text-ink">Add Employee</h3>

      <label className={labelClass}>Name</label>
      <Input autoFocus value={newName} onChange={(e) => setNewName(e.target.value)} className="w-full text-xs" />

      <label className={labelClass}>PIN</label>
      <PinInput length={PIN_LENGTH} value={newPin} onChange={setNewPin} />

      <label className={labelClass}>Role</label>
      <select value={newRole} onChange={(e) => setNewRole(e.target.value as Employee['role'])} className={selectClass}>
        <option value="EMPLOYEE">Employee</option>
        <option value="TECHNICIAN">Technician</option>
        <option value="OWNER">Owner</option>
      </select>

      {addEmployeeError ? <p className="mt-2 text-rose-500 text-xs">{addEmployeeError}</p> : null}

      <div className="mt-4 flex justify-end gap-2">
        <Button onClick={onClose} variant="secondary" className="text-xs">
          Cancel
        </Button>
        <Button
          onClick={submit}
          disabled={!newName.trim() || newPin.length !== PIN_LENGTH}
          loading={addingEmployee}
          className="text-xs font-bold"
        >
          Add Employee
        </Button>
      </div>
    </Overlay>
  );
}

export function SettingsPage() {
  const dispatch = useAppDispatch();
  const settings = useAppSelector((s) => s.settings.data);
  const saving = useAppSelector((s) => s.settings.saving);
  const employees = useAppSelector((s) => s.auth.employees);

  const [activeTab, setActiveTab] = useState<'branding' | 'hardware' | 'defaults' | 'categories' | 'customer-categories' | 'warranties' | 'overdue'>('branding');
  const [logoUploading, setLogoUploading] = useState(false);
  const [showAddEmployee, setShowAddEmployee] = useState(false);

  // Draft form states
  const [draftSettings, setDraftSettings] = useState<Partial<ShopSettings>>({});

  // Management lists
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [newCatName, setNewCatName] = useState('');
  const [customerCategories, setCustomerCategories] = useState<Array<{ id: string; name: string; emoji: string | null; color: string | null; description: string | null }>>([]);
  const [newCustCatName, setNewCustCatName] = useState('');
  const [newCustCatEmoji, setNewCustCatEmoji] = useState('');
  const [newCustCatColor, setNewCustCatColor] = useState('#3B82F6');
  const [warranties, setWarranties] = useState<WarrantyItem[]>([]);
  const [newWarrantyLabel, setNewWarrantyLabel] = useState('');
  const [newWarrantyDays, setNewWarrantyDays] = useState('30');
  const [actions, setActions] = useState<DefaultActionItem[]>([]);

  // Test SMS states
  const [testPhone, setTestPhone] = useState('');
  const [testSmsLoading, setTestSmsLoading] = useState(false);
  const [testSmsResult, setTestSmsResult] = useState<string | null>(null);

  // 5-Second Undo Toast State using shared UndoToast component
  const [undoToast, setUndoToast] = useState<{
    message: string;
    onUndo: () => void;
  } | null>(null);

  function triggerUndoToast(message: string, onUndoCallback: () => void) {
    setUndoToast({
      message,
      onUndo: onUndoCallback,
    });
  }

  const initialized = useRef(false);
  useEffect(() => {
    if (!settings || initialized.current) return;
    initialized.current = true;
    setDraftSettings({
      companyName: settings.companyName,
      primaryColor: settings.primaryColor,
      themeMode: settings.themeMode,
      discountLimitPercent: Number(settings.discountLimitPercent),
      receiptWidth: settings.receiptWidth,
      barcodeScannerMode: settings.barcodeScannerMode,
      cashDrawerEnabled: settings.cashDrawerEnabled,
      defaultDiscountPercent: Number(settings.defaultDiscountPercent || 10),
      defaultDownPaymentPercent: Number(settings.defaultDownPaymentPercent || 35),
      defaultInterestMethod: settings.defaultInterestMethod || 'PERCENTAGE',
      defaultInterestValue: Number(settings.defaultInterestValue || 12),
      defaultLateFeeMethod: settings.defaultLateFeeMethod || 'FIXED_AMOUNT',
      defaultLateFeeValue: Number(settings.defaultLateFeeValue || 500),
      defaultCommissionMethod: settings.defaultCommissionMethod || 'PERCENTAGE',
      defaultCommissionValue: Number(settings.defaultCommissionValue || 10),
      defaultTechnicianId: settings.defaultTechnicianId || '',
      uncollectedRepairDays: Number(settings.uncollectedRepairDays || 30),
      firstDaysWarrantyDays: Number(settings.firstDaysWarrantyDays || 3),
      textlkApiToken: settings.textlkApiToken || '',
      textlkSenderId: settings.textlkSenderId || '',
    });
  }, [settings]);

  useEffect(() => {
    dispatch(employeesRequested());
    loadCategories();
    loadCustomerCategories();
    loadWarranties();
    loadActions();
  }, [dispatch]);

  const loadCategories = () => {
    api.get<CategoryItem[]>('/categories').then((d) => setCategories(d || [])).catch(() => { });
  };

  const loadCustomerCategories = () => {
    api.get<any[]>('/customer-categories').then((d) => setCustomerCategories(d || [])).catch(() => { });
  };

  async function handleAddCustomerCategory(e: React.FormEvent) {
    e.preventDefault();
    if (!newCustCatName.trim()) return;
    try {
      await api.post('/customer-categories', {
        name: newCustCatName.trim(),
        emoji: newCustCatEmoji,
        color: newCustCatColor,
      });
      setNewCustCatName('');
      loadCustomerCategories();
    } catch (err: any) {
      alert(err.message || 'Failed to add customer category');
    }
  }

  async function handleDeleteCustomerCategory(id: string) {
    const itemToDelete = customerCategories.find((c) => c.id === id);
    if (!itemToDelete) return;

    // Immediately remove from UI state without confirm popup
    setCustomerCategories((prev) => prev.filter((c) => c.id !== id));

    try {
      await api.delete(`/customer-categories/${id}`);
    } catch (err: any) {
      alert(err.message || 'Failed to delete customer category');
      loadCustomerCategories();
      return;
    }

    triggerUndoToast(`Customer Group "${itemToDelete.name}" deleted`, async () => {
      try {
        await api.post('/customer-categories', {
          name: itemToDelete.name,
          emoji: itemToDelete.emoji,
          color: itemToDelete.color,
          description: itemToDelete.description,
        });
        loadCustomerCategories();
      } catch (err: any) {
        alert(err.message || 'Failed to restore customer group');
      }
    });
  }

  const loadWarranties = () => {
    api.get<WarrantyItem[]>('/warranties').then((d) => setWarranties(d || [])).catch(() => { });
  };

  const loadActions = () => {
    api.get<DefaultActionItem[]>('/default-actions').then((d) => setActions(d || [])).catch(() => { });
  };

  async function handleAddCategory(e: React.FormEvent) {
    e.preventDefault();
    if (!newCatName.trim()) return;
    try {
      await api.post('/categories', { name: newCatName.trim() });
      setNewCatName('');
      loadCategories();
    } catch (err: any) {
      alert(err.message || 'Failed to add category');
    }
  }

  async function handleDeleteCategory(id: string) {
    const itemToDelete = categories.find((c) => c.id === id);
    if (!itemToDelete) return;

    // Immediately remove from UI state without confirm popup
    setCategories((prev) => prev.filter((c) => c.id !== id));

    try {
      await api.delete(`/categories/${id}`);
    } catch (err: any) {
      alert(err.message || 'Failed to delete category');
      loadCategories();
      return;
    }

    triggerUndoToast(`Product Category "${itemToDelete.name}" deleted`, async () => {
      try {
        await api.post('/categories', { name: itemToDelete.name });
        loadCategories();
      } catch (err: any) {
        alert(err.message || 'Failed to restore category');
      }
    });
  }

  async function handleAddWarranty(e: React.FormEvent) {
    e.preventDefault();
    if (!newWarrantyLabel.trim() || !newWarrantyDays) return;
    try {
      await api.post('/warranties', {
        label: newWarrantyLabel.trim(),
        durationDays: parseInt(newWarrantyDays),
        appliesToSales: true,
        appliesToRepairs: true,
      });
      setNewWarrantyLabel('');
      setNewWarrantyDays('30');
      loadWarranties();
    } catch (err: any) {
      alert(err.message || 'Failed to add warranty period');
    }
  }

  async function uploadLogo(e: FormEvent<HTMLInputElement>) {
    const file = e.currentTarget.files?.[0];
    if (!file) return;
    setLogoUploading(true);
    try {
      const form = new FormData();
      form.append('logo', file);
      const updated = await api.upload<ShopSettings>('/settings/logo', form);
      dispatch(settingsUpdated(updated));
    } catch (err: any) {
      alert(err.message || 'Failed to upload logo');
    } finally {
      setLogoUploading(false);
      e.currentTarget.value = '';
    }
  }

  async function handleRemoveLogo() {
    const previousLogoUrl = settings?.logoUrl;
    if (!previousLogoUrl) return;

    try {
      const updated = await api.patch<ShopSettings>('/settings', { logoUrl: null });
      dispatch(settingsUpdated(updated));
    } catch (err: any) {
      alert(err.message || 'Failed to remove logo');
      return;
    }

    triggerUndoToast('Store logo removed', async () => {
      try {
        const restored = await api.patch<ShopSettings>('/settings', { logoUrl: previousLogoUrl });
        dispatch(settingsUpdated(restored));
      } catch (err: any) {
        alert(err.message || 'Failed to restore logo');
      }
    });
  }

  function handleSaveSettings() {
    dispatch(settingsUpdateRequested(draftSettings));
  }

  async function handleSendTestSms() {
    if (!testPhone.trim()) {
      alert('Please enter a mobile phone number to test (e.g. 0771234567)');
      return;
    }
    setTestSmsLoading(true);
    setTestSmsResult(null);
    try {
      const res = await api.post<{ success: boolean; mode: string; message: string }>('/settings/test-sms', {
        phone: testPhone.trim(),
      });
      setTestSmsResult(res.message);
    } catch (err: any) {
      setTestSmsResult(`Failed: ${err.message || 'Error sending test SMS'}`);
    } finally {
      setTestSmsLoading(false);
    }
  }


  if (!settings) return <p className="p-4 text-xs text-muted">Loading settings…</p>;

  return (
    <div className="flex h-full flex-col min-h-0 bg-canvas p-4 space-y-4 overflow-y-auto">
      {/* Header & Tab Selector */}
      <div className="flex items-center justify-between border-b border-border bg-surface p-4 rounded-2xl shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-ink">System Settings</h2>
            <span className="bg-primary/10 text-primary border border-primary/20 text-[10px] font-mono font-bold px-2 py-0.5 rounded-full">v1.0.0</span>
          </div>
          <p className="text-xs text-muted">Store branding, hardware setup, defaults, product categories, and warranty terms</p>
        </div>

        <div className="flex bg-canvas p-1 rounded-xl border border-border gap-1 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('branding')}
            className={`px-3 py-1.5 rounded-lg cursor-pointer transition-all ${activeTab === 'branding' ? 'bg-surface text-ink shadow-xs' : 'text-muted hover:text-ink'
              }`}
          >
            Store Branding
          </button>
          <button
            onClick={() => setActiveTab('hardware')}
            className={`px-3 py-1.5 rounded-lg cursor-pointer transition-all ${activeTab === 'hardware' ? 'bg-surface text-ink shadow-xs' : 'text-muted hover:text-ink'
              }`}
          >
            Hardware &amp; Employees
          </button>
          <button
            onClick={() => setActiveTab('defaults')}
            className={`px-3 py-1.5 rounded-lg cursor-pointer transition-all ${activeTab === 'defaults' ? 'bg-surface text-ink shadow-xs' : 'text-muted hover:text-ink'
              }`}
          >
            POS Defaults
          </button>
          <button
            onClick={() => setActiveTab('categories')}
            className={`px-3 py-1.5 rounded-lg cursor-pointer transition-all ${activeTab === 'categories' ? 'bg-surface text-ink shadow-xs' : 'text-muted hover:text-ink'
              }`}
          >
            Product Categories
          </button>
          <button
            onClick={() => setActiveTab('customer-categories')}
            className={`px-3 py-1.5 rounded-lg cursor-pointer transition-all ${activeTab === 'customer-categories' ? 'bg-surface text-ink shadow-xs' : 'text-muted hover:text-ink'
              }`}
          >
            Customer Groups
          </button>
          <button
            onClick={() => setActiveTab('warranties')}
            className={`px-3 py-1.5 rounded-lg cursor-pointer transition-all ${activeTab === 'warranties' ? 'bg-surface text-ink shadow-xs' : 'text-muted hover:text-ink'
              }`}
          >
            Warranty Periods
          </button>
          <button
            onClick={() => setActiveTab('overdue')}
            className={`px-3 py-1.5 rounded-lg cursor-pointer transition-all ${activeTab === 'overdue' ? 'bg-surface text-ink shadow-xs' : 'text-muted hover:text-ink'
              }`}
          >
            Overdue Rules
          </button>
        </div>
      </div>

      {/* Tab 1: Store Branding (Full Width) */}
      {activeTab === 'branding' && (
        <section className="w-full rounded-2xl border border-border bg-surface p-6 shadow-xs space-y-4">
          <div>
            <h3 className="font-bold text-base text-ink">Store Branding</h3>
            <p className="text-xs text-muted">Customize company name, brand colors, visual theme, and store logo.</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Company Name</label>
              <Input
                value={draftSettings.companyName || ''}
                onChange={(e) => setDraftSettings({ ...draftSettings, companyName: e.target.value })}
                className="w-full text-xs"
              />
            </div>

            <div>
              <label className={labelClass}>Discount Limit Flag (%)</label>
              <Input
                type="number"
                min={0}
                max={100}
                value={draftSettings.discountLimitPercent === 0 ? '' : draftSettings.discountLimitPercent}
                onChange={(e) =>
                  setDraftSettings({
                    ...draftSettings,
                    discountLimitPercent: e.target.value === '' ? 0 : Number(e.target.value),
                  })
                }
                className="w-full text-xs font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Primary Brand Color</label>
              <div className="flex items-center gap-3 mt-1.5">
                <input
                  type="color"
                  value={draftSettings.primaryColor || '#1e40af'}
                  onChange={(e) => setDraftSettings({ ...draftSettings, primaryColor: e.target.value })}
                  className="h-9 w-14 rounded-lg cursor-pointer border border-border"
                />
                <span className="text-xs font-mono text-muted">{draftSettings.primaryColor}</span>
              </div>
            </div>

            <div>
              <label className={labelClass}>Theme Mode</label>
              <select
                value={draftSettings.themeMode || 'system'}
                onChange={(e) => setDraftSettings({ ...draftSettings, themeMode: e.target.value as any })}
                className={selectClass}
              >
                <option value="light">Light</option>
                <option value="dark">Dark</option>
                <option value="system">Follow System</option>
              </select>
            </div>
          </div>

          <div>
            <label className={labelClass}>Store Logo</label>
            <div className="mt-2 flex items-center gap-4">
              {settings.logoUrl ? (
                <div className="relative group">
                  <img
                    src={settings.logoUrl.startsWith('http') ? settings.logoUrl : `http://localhost:4000${settings.logoUrl}`}
                    alt="Logo"
                    className="h-14 max-w-[200px] object-contain rounded-lg border border-border p-1.5 bg-canvas shadow-xs"
                  />
                </div>
              ) : (
                <div className="h-14 w-28 flex items-center justify-center rounded-lg border border-dashed border-border bg-canvas text-muted text-[11px]">
                  No Logo
                </div>
              )}
              <div className="space-y-1">
                <input
                  type="file"
                  accept="image/*"
                  onChange={uploadLogo}
                  disabled={logoUploading}
                  className="text-xs text-muted block file:mr-2 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-primary file:text-on-primary hover:file:opacity-90 cursor-pointer"
                />
                {logoUploading && <p className="text-[11px] text-primary font-medium animate-pulse">Uploading logo...</p>}
                {settings.logoUrl && (
                  <button
                    type="button"
                    onClick={handleRemoveLogo}
                    className="text-xs text-rose-500 hover:text-rose-700 font-medium cursor-pointer underline block"
                  >
                    Remove Logo
                  </button>
                )}
              </div>
            </div>
          </div>


          <div className="pt-3 border-t border-border flex justify-end">
            <Button onClick={handleSaveSettings} loading={saving} className="px-6 py-2 text-xs font-bold">
              Save Branding Settings
            </Button>
          </div>
        </section>
      )}

      {/* Tab 2: Hardware & Employees (Full Width) */}
      {activeTab === 'hardware' && (
        <section className="w-full rounded-2xl border border-border bg-surface p-6 shadow-xs space-y-5">
          <div>
            <h3 className="font-bold text-base text-ink">Hardware &amp; Employees</h3>
            <p className="text-xs text-muted">Configure receipt printing width, barcode scanning mode, cash drawer kick-out, and manage employee accounts.</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Receipt Paper Width</label>
              <select
                value={draftSettings.receiptWidth || '80mm'}
                onChange={(e) => setDraftSettings({ ...draftSettings, receiptWidth: e.target.value })}
                className={selectClass}
              >
                <option value="80mm">80mm (Standard POS Thermal)</option>
                <option value="58mm">58mm (Compact Thermal)</option>
              </select>
            </div>

            <div>
              <label className={labelClass}>Barcode Scanner Mode</label>
              <select
                value={draftSettings.barcodeScannerMode || 'USB_HID'}
                onChange={(e) => setDraftSettings({ ...draftSettings, barcodeScannerMode: e.target.value as any })}
                className={selectClass}
              >
                <option value="USB_HID">USB Scanner (Keyboard-Wedge)</option>
                <option value="CAMERA">Camera Scanner (Fallback)</option>
              </select>
            </div>
          </div>

          <label className="flex items-center gap-2 text-xs text-ink cursor-pointer pt-1">
            <input
              type="checkbox"
              checked={draftSettings.cashDrawerEnabled || false}
              onChange={(e) => setDraftSettings({ ...draftSettings, cashDrawerEnabled: e.target.checked })}
              className="rounded border-border text-primary"
            />
            <span>Cash Drawer Kick-Out via Receipt Printer</span>
          </label>

          {/* Employees Section */}
          <div className="border-t border-border pt-4">
            <div className="flex justify-between items-center mb-3">
              <div>
                <h4 className="text-sm font-bold text-ink">Employees &amp; Staff Logins</h4>
                <p className="text-xs text-muted">Each employee logs in using their unique {PIN_LENGTH}-digit PIN.</p>
              </div>
              <Button onClick={() => setShowAddEmployee(true)} variant="secondary" className="text-xs py-1.5 px-3 font-semibold">
                + Add Employee
              </Button>
            </div>

            <div className="grid grid-cols-2 gap-3 max-h-60 overflow-y-auto">
              {employees.map((emp) => (
                <div key={emp.id} className="flex justify-between items-center p-3 rounded-xl bg-canvas border border-border text-xs">
                  <div>
                    <span className="font-bold text-ink block">{emp.name}</span>
                    <span className="text-[11px] text-muted">Role: {emp.role}</span>
                  </div>
                  <span className="text-[10px] text-emerald-600 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full font-bold">
                    Active
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-3 border-t border-border flex justify-end">
            <Button onClick={handleSaveSettings} loading={saving} className="px-6 py-2 text-xs font-bold">
              Save Hardware Settings
            </Button>
          </div>
        </section>
      )}

      {/* Tab 3: Configurable POS Defaults (Full Width) */}
      {activeTab === 'defaults' && (
        <div className="w-full rounded-2xl border border-border bg-surface p-6 shadow-xs space-y-5">
          <div>
            <h3 className="font-bold text-base text-ink">POS &amp; Business Defaults</h3>
            <p className="text-xs text-muted">
              Configure system-wide defaults for discounts, down payments, interest, technician commissions, and SMS.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Sales & Discounts */}
            <div className="rounded-xl border border-border bg-canvas p-4 space-y-3">
              <h4 className="text-xs font-bold uppercase text-ink tracking-wider">Sales &amp; Discount Defaults</h4>
              <div>
                <label className="text-[10px] text-muted block mb-0.5">Default Discount % (Default: 10%)</label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={draftSettings.defaultDiscountPercent ?? 10}
                  onChange={(e) => setDraftSettings({ ...draftSettings, defaultDiscountPercent: Number(e.target.value) })}
                  className="w-full text-xs font-mono"
                />
              </div>
              <div>
                <label className="text-[10px] text-muted block mb-0.5">Initial Return / Support Period (Days)</label>
                <Input
                  type="number"
                  min={1}
                  value={draftSettings.firstDaysWarrantyDays ?? 3}
                  onChange={(e) => setDraftSettings({ ...draftSettings, firstDaysWarrantyDays: parseInt(e.target.value) })}
                  className="w-full text-xs"
                />
              </div>
            </div>

            {/* Installments Defaults */}
            <div className="rounded-xl border border-border bg-canvas p-4 space-y-3">
              <h4 className="text-xs font-bold uppercase text-ink tracking-wider">Installment Defaults</h4>
              <div>
                <label className="text-[10px] text-muted block mb-0.5">Default Down Payment % (Default: 35%)</label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={draftSettings.defaultDownPaymentPercent ?? 35}
                  onChange={(e) => setDraftSettings({ ...draftSettings, defaultDownPaymentPercent: Number(e.target.value) })}
                  className="w-full text-xs font-mono"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-muted block mb-0.5">Default Interest Method</label>
                  <select
                    value={draftSettings.defaultInterestMethod || 'PERCENTAGE'}
                    onChange={(e) => setDraftSettings({ ...draftSettings, defaultInterestMethod: e.target.value as any })}
                    className={selectClass}
                  >
                    <option value="PERCENTAGE">Percent (%)</option>
                    <option value="FIXED_AMOUNT">Fixed (Rs)</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-muted block mb-0.5">Default Interest Value</label>
                  <Input
                    type="number"
                    min={0}
                    value={draftSettings.defaultInterestValue ?? 12}
                    onChange={(e) => setDraftSettings({ ...draftSettings, defaultInterestValue: Number(e.target.value) })}
                    className="w-full text-xs font-mono"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Technician & Repairs Defaults */}
            <div className="rounded-xl border border-border bg-canvas p-4 space-y-3">
              <h4 className="text-xs font-bold uppercase text-ink tracking-wider">Repair &amp; Technician Defaults</h4>
              <div>
                <label className="text-[10px] text-muted block mb-0.5">Default Technician</label>
                <select
                  value={draftSettings.defaultTechnicianId || ''}
                  onChange={(e) => setDraftSettings({ ...draftSettings, defaultTechnicianId: e.target.value })}
                  className={selectClass}
                >
                  <option value="">-- No Default Technician --</option>
                  {employees.map((emp) => (
                    <option key={emp.id} value={emp.id}>
                      {emp.name} ({emp.role})
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-muted block mb-0.5">Commission Method</label>
                  <select
                    value={draftSettings.defaultCommissionMethod || 'PERCENTAGE'}
                    onChange={(e) => setDraftSettings({ ...draftSettings, defaultCommissionMethod: e.target.value as any })}
                    className={selectClass}
                  >
                    <option value="PERCENTAGE">Percent (%)</option>
                    <option value="FIXED_AMOUNT">Fixed (Rs)</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-muted block mb-0.5">Commission Value</label>
                  <Input
                    type="number"
                    min={0}
                    value={draftSettings.defaultCommissionValue ?? 0}
                    onChange={(e) => setDraftSettings({ ...draftSettings, defaultCommissionValue: Number(e.target.value) })}
                    className="w-full text-xs font-mono"
                  />
                </div>
              </div>
              <div>
                <label className="text-[10px] text-muted block mb-0.5">Uncollected Repair Reminder Threshold (Days)</label>
                <Input
                  type="number"
                  min={1}
                  value={draftSettings.uncollectedRepairDays ?? 30}
                  onChange={(e) => setDraftSettings({ ...draftSettings, uncollectedRepairDays: parseInt(e.target.value) })}
                  className="w-full text-xs"
                />
              </div>
            </div>

            {/* text.lk SMS Gateway Config */}
            <div className="rounded-xl border border-border bg-canvas p-4 space-y-3">
              <h4 className="text-xs font-bold uppercase text-ink tracking-wider">text.lk SMS Gateway Integration</h4>
              <p className="text-[10px] text-muted leading-relaxed">
                Automated SMS alerts for completed repairs and uncollected device reminders sent via text.lk v3 API.
              </p>
              <div>
                <label className="text-[10px] text-muted block mb-0.5">text.lk API Token</label>
                <Input
                  type="password"
                  placeholder="Paste your text.lk API Bearer token"
                  value={draftSettings.textlkApiToken || ''}
                  onChange={(e) => setDraftSettings({ ...draftSettings, textlkApiToken: e.target.value })}
                  className="w-full text-xs font-mono"
                />
              </div>
              <div>
                <label className="text-[10px] text-muted block mb-0.5">text.lk Sender ID (Mask)</label>
                <Input
                  placeholder="e.g. TextLKDemo or NotifyLK"
                  value={draftSettings.textlkSenderId || ''}
                  onChange={(e) => setDraftSettings({ ...draftSettings, textlkSenderId: e.target.value })}
                  className="w-full text-xs"
                />
              </div>

              {/* Test SMS Box */}
              <div className="border-t border-border pt-2.5 mt-2 space-y-2">
                <span className="text-[10px] font-bold text-ink uppercase tracking-wide block">Test SMS Dispatch</span>
                <div className="flex gap-2">
                  <Input
                    placeholder="Enter phone (e.g. 0771234567)"
                    value={testPhone}
                    onChange={(e) => setTestPhone(e.target.value)}
                    className="flex-1 text-xs font-mono"
                  />
                  <Button
                    type="button"
                    onClick={handleSendTestSms}
                    loading={testSmsLoading}
                    variant="secondary"
                    className="text-xs font-bold px-3"
                  >
                    Send Test SMS
                  </Button>
                </div>
                {testSmsResult && (
                  <p className="text-[11px] p-2 rounded-lg bg-surface border border-border text-ink font-mono mt-1">
                    {testSmsResult}
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-3 border-t border-border">
            <Button onClick={handleSaveSettings} loading={saving} className="px-6 py-2.5 text-xs font-bold">
              Save All Business Defaults
            </Button>
          </div>
        </div>
      )}

      {/* Tab 4: Category Management (Full Width) */}
      {activeTab === 'categories' && (
        <div className="w-full rounded-2xl border border-border bg-surface p-6 shadow-xs space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="font-bold text-base text-ink">Product Categories</h3>
              <p className="text-xs text-muted">Manage categories for products, mobile phones, accessories, and spare parts.</p>
            </div>
            <span className="text-xs bg-canvas border border-border px-3 py-1 rounded-full font-bold">
              {categories.length} Categories Available
            </span>
          </div>

          {/* Add Category Form */}
          <form onSubmit={handleAddCategory} className="flex gap-2">
            <Input
              required
              placeholder="Enter new category name..."
              value={newCatName}
              onChange={(e) => setNewCatName(e.target.value)}
              className="flex-1 text-xs py-2"
            />
            <Button type="submit" className="text-xs font-bold px-4">
              + Add Category
            </Button>
          </form>

          {/* Category List */}
          <div className="max-h-[500px] overflow-y-auto rounded-xl border border-border divide-y divide-border bg-canvas">
            {categories.map((c) => (
              <div key={c.id} className="p-3 flex justify-between items-center text-xs hover:bg-surface transition-colors">
                <span className="font-semibold text-ink">{c.name}</span>
                <button
                  type="button"
                  onClick={() => handleDeleteCategory(c.id)}
                  className="text-rose-500 hover:text-rose-700 font-bold px-2 py-0.5 text-sm cursor-pointer"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 4b: Customer Groups / Categories (Full Width) */}
      {activeTab === 'customer-categories' && (
        <div className="w-full rounded-2xl border border-border bg-surface p-6 shadow-xs space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="font-bold text-base text-ink">Customer Classification Groups</h3>
              <p className="text-xs text-muted">Manage dynamic categories and groups for customer classification and segmentation.</p>
            </div>
            <span className="text-xs bg-canvas border border-border px-3 py-1 rounded-full font-bold">
              {customerCategories.length} Customer Groups
            </span>
          </div>

          {/* Add Customer Category Form */}
          <form onSubmit={handleAddCustomerCategory} className="flex gap-2 items-center">
            <Input
              required
              placeholder="Group Name (e.g. VIP Buyers)..."
              value={newCustCatName}
              onChange={(e) => setNewCustCatName(e.target.value)}
              className="flex-1 text-xs py-2"
            />
            <Input
              placeholder="Badge (optional)"
              value={newCustCatEmoji}
              onChange={(e) => setNewCustCatEmoji(e.target.value)}
              className="w-20 text-xs text-center py-2"
            />
            <input
              type="color"
              value={newCustCatColor}
              onChange={(e) => setNewCustCatColor(e.target.value)}
              className="w-10 h-8 rounded border border-border cursor-pointer p-0.5"
              title="Pick Badge Color"
            />
            <Button type="submit" className="text-xs font-bold px-4">
              + Add Group
            </Button>
          </form>

          {/* Customer Categories List */}
          <div className="max-h-[500px] overflow-y-auto rounded-xl border border-border divide-y divide-border bg-canvas">
            {customerCategories.map((c) => (
              <div key={c.id} className="p-3.5 flex justify-between items-center text-xs hover:bg-surface transition-colors">
                <div className="flex items-center gap-2">
                  <span
                    className="px-2.5 py-1 rounded-full text-xs font-bold border flex items-center gap-1"
                    style={{
                      borderColor: c.color || '#3B82F6',
                      color: c.color || '#3B82F6',
                      backgroundColor: `${c.color || '#3B82F6'}18`,
                    }}
                  >
                    {c.emoji ? <span>{c.emoji}</span> : null}
                    <span>{c.name}</span>
                  </span>
                  {c.description && <span className="text-muted text-[11px] ml-2">{c.description}</span>}
                </div>
                <button
                  type="button"
                  onClick={() => handleDeleteCustomerCategory(c.id)}
                  className="text-rose-500 hover:text-rose-700 font-bold px-2 py-0.5 text-sm cursor-pointer"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 5: Warranty Periods (Full Width) */}
      {activeTab === 'warranties' && (
        <div className="w-full rounded-2xl border border-border bg-surface p-6 shadow-xs space-y-4">
          <div>
            <h3 className="font-bold text-base text-ink">Warranty Periods</h3>
            <p className="text-xs text-muted">Manage warranty terms applicable to retail sales and repair jobs.</p>
          </div>

          {/* Add Warranty Form */}
          <form onSubmit={handleAddWarranty} className="flex gap-2">
            <Input
              required
              placeholder="e.g. 6 Months Warranty"
              value={newWarrantyLabel}
              onChange={(e) => setNewWarrantyLabel(e.target.value)}
              className="flex-1 text-xs py-2"
            />
            <Input
              required
              type="number"
              min={1}
              placeholder="Days (e.g. 180)"
              value={newWarrantyDays}
              onChange={(e) => setNewWarrantyDays(e.target.value)}
              className="w-36 text-xs font-mono py-2"
            />
            <Button type="submit" className="text-xs font-bold px-4">
              + Add Warranty Option
            </Button>
          </form>

          <div className="rounded-xl border border-border divide-y divide-border bg-canvas">
            {warranties.map((w) => (
              <div key={w.id} className="p-3.5 flex justify-between items-center text-xs hover:bg-surface transition-colors">
                <div>
                  <span className="font-bold text-ink">{w.label}</span>
                  <span className="text-muted ml-2 font-mono">({w.durationDays} days)</span>
                </div>
                <div className="flex gap-1.5">
                  {w.appliesToSales ? <span className="bg-blue-500/10 text-blue-600 px-2.5 py-0.5 rounded text-[10px] font-bold">Sales</span> : null}
                  {w.appliesToRepairs ? <span className="bg-emerald-500/10 text-emerald-600 px-2.5 py-0.5 rounded text-[10px] font-bold">Repairs</span> : null}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 6: Overdue Rules (Full Width) */}
      {activeTab === 'overdue' && (
        <div className="w-full rounded-2xl border border-border bg-surface p-6 shadow-xs space-y-4">
          <div>
            <h3 className="font-bold text-base text-ink">Installment Overdue Actions</h3>
            <p className="text-xs text-muted">
              Configurable system triggers when installment schedules become overdue (Warning, Account Suspension, Account Block).
            </p>
          </div>

          <div className="rounded-xl border border-border divide-y divide-border bg-canvas">
            {actions.map((act) => (
              <div key={act.id} className="p-4 flex justify-between items-center text-xs hover:bg-surface transition-colors">
                <div>
                  <p className="font-bold text-ink">{act.description}</p>
                  <p className="text-[11px] text-muted mt-0.5">Triggers after {act.triggerDaysOverdue} days overdue</p>
                </div>
                <span className={`px-3 py-1 rounded-full font-bold text-[10px] uppercase tracking-wider ${act.actionType === 'BLOCK' ? 'bg-rose-500/10 text-rose-600 border border-rose-500/20' :
                    act.actionType === 'SUSPEND' ? 'bg-amber-500/10 text-amber-600 border border-amber-500/20' :
                      'bg-blue-500/10 text-blue-600 border border-blue-500/20'
                  }`}>
                  {act.actionType}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {showAddEmployee ? <AddEmployeeModal onClose={() => setShowAddEmployee(false)} /> : null}

      {/* 5-Second Undo Toast Component */}
      {undoToast ? (
        <UndoToast
          message={undoToast.message}
          onUndo={() => {
            const callback = undoToast.onUndo;
            setUndoToast(null);
            callback();
          }}
          onExpire={() => setUndoToast(null)}
        />
      ) : null}
    </div>
  );
}
