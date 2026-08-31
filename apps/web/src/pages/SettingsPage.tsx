import { useEffect, useRef, useState, type FormEvent } from 'react';
import { PIN_LENGTH } from '@pos/shared';
import { useAppDispatch, useAppSelector } from '../app/hooks';
import { settingsUpdateRequested, type ShopSettings } from '../features/settings/settingsSlice';
import { employeeCreateRequested, employeesRequested, type Employee } from '../features/auth/authSlice';
import { Input } from '../components/Input';
import { Button } from '../components/Button';
import { PinInput } from '../components/PinInput';
import { Overlay } from '../components/Overlay';

// select isn't (yet) covered by the shared Input component, so it keeps its own class.
const selectClass = 'w-full rounded-lg border border-border bg-surface px-2.5 py-2 text-ink';
const labelClass = 'mt-3 block text-muted';
const saveBtnClass =
  'mt-4 rounded-lg border border-primary bg-primary px-4 py-2 font-semibold text-on-primary disabled:opacity-50';

type Branding = Pick<ShopSettings, 'companyName' | 'primaryColor' | 'themeMode' | 'discountLimitPercent'>;
type Hardware = Pick<ShopSettings, 'receiptWidth' | 'barcodeScannerMode' | 'cashDrawerEnabled'>;

function AddEmployeeModal({ onClose }: { onClose: () => void }) {
  const dispatch = useAppDispatch();
  const addingEmployee = useAppSelector((s) => s.auth.addingEmployee);
  const addEmployeeError = useAppSelector((s) => s.auth.addEmployeeError);

  const [newName, setNewName] = useState('');
  const [newPin, setNewPin] = useState('');
  const [newRole, setNewRole] = useState<Employee['role']>('EMPLOYEE');

  // Closes itself once a submit that was in flight finishes without an error.
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
      <h3 className="text-lg font-semibold">Add Employee</h3>

      <label className={labelClass}>Name</label>
      <Input autoFocus value={newName} onChange={(e) => setNewName(e.target.value)} className="w-full" />

      <label className={labelClass}>PIN</label>
      <PinInput length={PIN_LENGTH} value={newPin} onChange={setNewPin} />

      <label className={labelClass}>Role</label>
      <select value={newRole} onChange={(e) => setNewRole(e.target.value as Employee['role'])} className={selectClass}>
        <option value="EMPLOYEE">Employee</option>
        <option value="TECHNICIAN">Technician</option>
        <option value="OWNER">Owner</option>
      </select>

      {addEmployeeError ? <p className="mt-2 text-danger">{addEmployeeError}</p> : null}

      <div className="mt-4 flex justify-end gap-2">
        <Button onClick={onClose} variant="secondary">
          Cancel
        </Button>
        <Button
          onClick={submit}
          disabled={!newName.trim() || newPin.length !== PIN_LENGTH}
          loading={addingEmployee}
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
  const [logoUploading, setLogoUploading] = useState(false);
  const [showAddEmployee, setShowAddEmployee] = useState(false);

  const [branding, setBranding] = useState<Branding>({
    companyName: '',
    primaryColor: '#1e40af',
    themeMode: 'system',
    discountLimitPercent: 0,
  });
  const [hardware, setHardware] = useState<Hardware>({
    receiptWidth: '80mm',
    barcodeScannerMode: 'USB_HID',
    cashDrawerEnabled: false,
  });

  // Loads the saved values into the draft exactly once, so a save in one
  // section doesn't clobber unsaved edits sitting in the other.
  const initialized = useRef(false);
  useEffect(() => {
    if (!settings || initialized.current) return;
    initialized.current = true;
    setBranding({
      companyName: settings.companyName,
      primaryColor: settings.primaryColor,
      themeMode: settings.themeMode,
      discountLimitPercent: Number(settings.discountLimitPercent),
    });
    setHardware({
      receiptWidth: settings.receiptWidth,
      barcodeScannerMode: settings.barcodeScannerMode,
      cashDrawerEnabled: settings.cashDrawerEnabled,
    });
  }, [settings]);

  useEffect(() => {
    dispatch(employeesRequested());
  }, [dispatch]);

  const employees = useAppSelector((s) => s.auth.employees);

  if (!settings) return <p className="p-4">Loading…</p>;

  async function uploadLogo(e: FormEvent<HTMLInputElement>) {
    const file = e.currentTarget.files?.[0];
    if (!file) return;
    setLogoUploading(true);
    const form = new FormData();
    form.append('logo', file);
    await fetch('http://localhost:4000/api/settings/logo', { method: 'POST', body: form, credentials: 'include' });
    setLogoUploading(false);
    window.location.reload();
  }

  return (
    <div className="w-full p-4">
      <h2 className="mb-3 text-xl font-bold">Settings</h2>

      <div className="flex flex-row gap-4">
        <section className="w-1/2 rounded-xl border border-border bg-surface p-4">
          <h3 className="font-semibold">Branding</h3>
          <label className={labelClass}>Company name</label>
          <Input
            value={branding.companyName}
            onChange={(e) => setBranding((b) => ({ ...b, companyName: e.target.value }))}
            className="w-full"
          />

          <label className={labelClass}>Primary color</label>
          <Input
            type="color"
            value={branding.primaryColor}
            onChange={(e) => setBranding((b) => ({ ...b, primaryColor: e.target.value }))}
            className="h-10 w-20"
          />

          <label className={labelClass}>Theme</label>
          <select
            value={branding.themeMode}
            onChange={(e) => setBranding((b) => ({ ...b, themeMode: e.target.value as ShopSettings['themeMode'] }))}
            className={selectClass}
          >
            <option value="light">Light</option>
            <option value="dark">Dark</option>
            <option value="system">Follow system</option>
          </select>

          <label className={labelClass}>Logo</label>
          {settings.logoUrl ? <img src={`http://localhost:4000${settings.logoUrl}`} alt="" className="h-10" /> : null}
          <input type="file" accept="image/*" onChange={uploadLogo} disabled={logoUploading} className="mt-1 block" />

          <label className={labelClass}>Discount limit before it's flagged (%)</label>
          <Input
            type="number"
            placeholder="0"
            value={branding.discountLimitPercent === 0 ? '' : branding.discountLimitPercent}
            onChange={(e) =>
              setBranding((b) => ({
                ...b,
                discountLimitPercent: e.target.value === '' ? 0 : Number(e.target.value),
              }))
            }
            className="w-full"
          />

          <Button
            onClick={() => dispatch(settingsUpdateRequested(branding))}
            loading={saving}
            className="mt-4"
          >
            Save
          </Button>
        </section>

        <section className="w-1/2 rounded-xl border border-border bg-surface p-4">
          <h3 className="font-semibold">Hardware</h3>
          <label className={labelClass}>Receipt width</label>
          <select
            value={hardware.receiptWidth}
            onChange={(e) => setHardware((h) => ({ ...h, receiptWidth: e.target.value }))}
            className={selectClass}
          >
            <option value="58mm">58mm</option>
            <option value="80mm">80mm</option>
          </select>

          <label className={labelClass}>Barcode scanner mode</label>
          <select
            value={hardware.barcodeScannerMode}
            onChange={(e) =>
              setHardware((h) => ({ ...h, barcodeScannerMode: e.target.value as ShopSettings['barcodeScannerMode'] }))
            }
            className={selectClass}
          >
            <option value="USB_HID">USB scanner (keyboard-wedge)</option>
            <option value="CAMERA">Camera (fallback)</option>
          </select>

          <label className="mt-3 flex items-center gap-2">
            <input
              type="checkbox"
              checked={hardware.cashDrawerEnabled}
              onChange={(e) => setHardware((h) => ({ ...h, cashDrawerEnabled: e.target.checked }))}
            />
            Cash drawer connected (via printer kick-out)
          </label>

          <Button
            onClick={() => dispatch(settingsUpdateRequested(hardware))}
            loading={saving}
            className="mt-4"
          >
            Save
          </Button>
        </section>
      </div>

      <section className="mt-4 rounded-xl border border-border bg-surface p-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold">Employees</h3>
          <Button
            onClick={() => setShowAddEmployee(true)}
          >
            Add Employee
          </Button>
        </div>
        <p className="text-muted">
          Each employee logs in with just their {PIN_LENGTH}-digit PIN - no employee list to pick from, so PINs must be
          unique.
        </p>

        
      </section>

      {showAddEmployee ? <AddEmployeeModal onClose={() => setShowAddEmployee(false)} /> : null}
    </div>
  );
}
