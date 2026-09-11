import { FiUser } from 'react-icons/fi';
import { Input } from '../../../components/Input';
import type { CustomerDetails } from './types';

interface AgreementCustomerSectionProps {
  customerPhone: string;
  onCustomerPhoneChange: (phone: string) => void;
  customerSearching: boolean;
  customerSearched: boolean;
  customerDetails: CustomerDetails | null;
  customerName: string;
  onCustomerNameChange: (name: string) => void;
  customerNic: string;
  onCustomerNicChange: (nic: string) => void;
  customerAddress: string;
  onCustomerAddressChange: (address: string) => void;
}

export function AgreementCustomerSection({
  customerPhone,
  onCustomerPhoneChange,
  customerSearching,
  customerSearched,
  customerDetails,
  customerName,
  onCustomerNameChange,
  customerNic,
  onCustomerNicChange,
  customerAddress,
  onCustomerAddressChange,
}: AgreementCustomerSectionProps) {
  return (
    <div className="rounded-xl border border-border p-3.5 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 font-bold text-ink uppercase tracking-wide text-xs">
          <FiUser className="h-4 w-4 text-primary" />
          <span>Customer Details (Agreement Holder)</span>
        </div>
      </div>

      <div>
        <label className="text-[10px] font-semibold text-muted block mb-1">
          Customer Phone Number <span className="text-rose-500">*</span>
        </label>
        <div className="relative">
          <Input
            placeholder="07XXXXXXXX"
            value={customerPhone}
            onChange={(e) => onCustomerPhoneChange(e.target.value)}
            className="w-full text-xs font-mono"
          />
          {customerSearching ? (
            <span className="absolute right-3 top-2 text-[10px] text-muted animate-pulse">
              Searching DB...
            </span>
          ) : null}
        </div>
      </div>

      {/* If Customer Found in DB */}
      {customerDetails ? (
        <div className="rounded-xl bg-surface p-3 border border-emerald-500/30 space-y-2 animate-in fade-in duration-150">
          <div className="flex items-center justify-between">
            <div className="font-bold text-ink text-sm flex items-center gap-1.5">
              <FiUser className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              <span>{customerDetails.name || 'Registered Customer'}</span>
            </div>
            {customerDetails.categories && customerDetails.categories.length > 0 ? (
              <div className="flex gap-1 flex-wrap">
                {customerDetails.categories.map((c) => (
                  <span
                    key={c.category.id}
                    className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-600 text-white shadow-xs"
                  >
                    {c.category.emoji ? `${c.category.emoji} ` : ''}
                    {c.category.name}
                  </span>
                ))}
              </div>
            ) : null}
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs text-muted">
            <div>
              <span className="font-medium">NIC:</span>{' '}
              <span className="font-mono font-semibold text-ink">
                {customerDetails.nic || 'Not recorded'}
              </span>
            </div>
            <div>
              <span className="font-medium">Phone:</span>{' '}
              <span className="font-mono font-semibold text-ink">{customerDetails.phone}</span>
            </div>
          </div>
          {customerDetails.address ? (
            <div className="text-xs text-muted">
              <span className="font-medium">Address:</span>{' '}
              <span className="text-ink">{customerDetails.address}</span>
            </div>
          ) : null}
        </div>
      ) : customerPhone.trim().length >= 3 && customerSearched ? (
        /* If New Customer (not found in DB), allow filling details to register */
        <div className="space-y-2.5 border-t border-border pt-2.5">
          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="text-[10px] font-semibold text-muted block mb-0.5">Customer Name</label>
              <Input
                placeholder="Full Name"
                value={customerName}
                onChange={(e) => onCustomerNameChange(e.target.value)}
                className="w-full text-xs"
              />
            </div>
            <div>
              <label className="text-[10px] font-semibold text-muted block mb-0.5">Customer NIC</label>
              <Input
                placeholder="National ID"
                value={customerNic}
                onChange={(e) => onCustomerNicChange(e.target.value)}
                className="w-full text-xs"
              />
            </div>
          </div>
          <div>
            <label className="text-[10px] font-semibold text-muted block mb-0.5">Customer Address</label>
            <Input
              placeholder="Address"
              value={customerAddress}
              onChange={(e) => onCustomerAddressChange(e.target.value)}
              className="w-full text-xs"
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
