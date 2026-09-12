import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiUserPlus, FiX, FiExternalLink, FiUser, FiPhone, FiCreditCard, FiMapPin } from 'react-icons/fi';
import { Button } from '../../../components/Button';
import { Input } from '../../../components/Input';
import { api } from '../../../lib/api';
import { toast } from 'react-toastify';
import type { CustomerMatchedData } from '../../../features/pos/posTypes';

interface PosCustomerRegisterModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialPhone: string;
  onSuccess: (customer: CustomerMatchedData) => void;
}

export function PosCustomerRegisterModal({
  isOpen,
  onClose,
  initialPhone,
  onSuccess,
}: PosCustomerRegisterModalProps) {
  const navigate = useNavigate();
  const [phone, setPhone] = useState(initialPhone);
  const [name, setName] = useState('');
  const [nic, setNic] = useState('');
  const [address, setAddress] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setPhone(initialPhone);
      setName('');
      setNic('');
      setAddress('');
      setErrorMessage(null);
    }
  }, [isOpen, initialPhone]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPhone = phone.trim();
    if (!cleanPhone || cleanPhone.length < 7) {
      setErrorMessage('Please enter a valid phone number (at least 7 digits)');
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);

    try {
      const created = await api.post<CustomerMatchedData>('/customers', {
        phone: cleanPhone,
        name: name.trim() || null,
        nic: nic.trim() || null,
        address: address.trim() || null,
      });

      toast.success(`Customer "${created.name || created.phone}" registered and attached!`);
      onSuccess(created);
      onClose();
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Failed to register customer';
      setErrorMessage(msg);
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenCustomersTab = () => {
    onClose();
    navigate(`/customers?register=true&phone=${encodeURIComponent(phone.trim())}`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in duration-150 backdrop-blur-xs">
      <div className="w-full max-w-md rounded-2xl border border-border bg-surface p-6 shadow-2xl animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-border">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-primary/10 text-primary">
              <FiUserPlus className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-ink">Register Customer</h2>
              <p className="text-xs text-muted">Register customer details to attach to this sale</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-muted hover:text-ink p-1 rounded-lg hover:bg-canvas transition-colors cursor-pointer"
          >
            <FiX className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="mt-4 space-y-3.5">
          {errorMessage ? (
            <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs font-medium">
              {errorMessage}
            </div>
          ) : null}

          {/* Phone input */}
          <div>
            <label className="text-xs font-semibold text-muted block mb-1">
              Phone Number <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <Input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="07XXXXXXXX"
                className="w-full text-sm font-mono pl-8"
                required
              />
              <FiPhone className="absolute left-2.5 top-3 h-3.5 w-3.5 text-muted pointer-events-none" />
            </div>
          </div>

          {/* Full Name */}
          <div>
            <label className="text-xs font-semibold text-muted block mb-1">Customer Full Name</label>
            <div className="relative">
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Kasun Perera"
                className="w-full text-sm pl-8"
                autoFocus
              />
              <FiUser className="absolute left-2.5 top-3 h-3.5 w-3.5 text-muted pointer-events-none" />
            </div>
          </div>

          {/* NIC & Address in 2-col or stacked */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-muted block mb-1">NIC / ID Number</label>
              <div className="relative">
                <Input
                  value={nic}
                  onChange={(e) => setNic(e.target.value)}
                  placeholder="e.g. 199012345678"
                  className="w-full text-xs pl-8"
                />
                <FiCreditCard className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted pointer-events-none" />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-muted block mb-1">Address</label>
              <div className="relative">
                <Input
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="e.g. Colombo"
                  className="w-full text-xs pl-8"
                />
                <FiMapPin className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-3 border-t border-border flex flex-col gap-2.5">
            <div className="flex items-center justify-end gap-2">
              <Button type="button" variant="secondary" onClick={onClose} disabled={submitting}>
                Cancel
              </Button>
              <Button type="submit" loading={submitting}>
                Register & Attach to Bill
              </Button>
            </div>

            <div className="flex items-center justify-center pt-1">
              <button
                type="button"
                onClick={handleOpenCustomersTab}
                className="text-[11px] text-muted hover:text-primary flex items-center gap-1 cursor-pointer transition-colors"
              >
                <span>Or open in Customers Management tab</span>
                <FiExternalLink className="h-3 w-3" />
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
