import React from 'react';
import { Button } from '../../../components/Button';
import { Input } from '../../../components/Input';
import type { CustomerDetails, SaleMinimal, AgreementProductItem } from './types';
import { AgreementCustomerSection } from './AgreementCustomerSection';
import { AgreementProductSelector } from './AgreementProductSelector';
import { GuarantorSection } from './GuarantorSection';

interface CreateAgreementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  saving: boolean;
  selectedSale: SaleMinimal | null;
  onSaleSelect: (sale: SaleMinimal | null) => void;
  selectedProducts: AgreementProductItem[];
  onProductsChange: (products: AgreementProductItem[]) => void;

  // Customer state & handlers
  customerPhone: string;
  onCustomerPhoneChange: (val: string) => void;
  customerSearching: boolean;
  customerSearched: boolean;
  customerDetails: CustomerDetails | null;
  customerName: string;
  onCustomerNameChange: (val: string) => void;
  customerNic: string;
  onCustomerNicChange: (val: string) => void;
  customerAddress: string;
  onCustomerAddressChange: (val: string) => void;

  // Schedule & interest state
  downPayment: string;
  onDownPaymentChange: (val: string) => void;
  numberOfInstallments: string;
  onNumberOfInstallmentsChange: (val: string) => void;
  interestMethod: 'PERCENTAGE' | 'FIXED_AMOUNT';
  onInterestMethodChange: (val: 'PERCENTAGE' | 'FIXED_AMOUNT') => void;
  interestValue: string;
  onInterestValueChange: (val: string) => void;

  // Guarantor state & handlers
  guarantorName: string;
  onGuarantorNameChange: (val: string) => void;
  guarantorPhone: string;
  onGuarantorPhoneChange: (val: string) => void;
  guarantorNic: string;
  onGuarantorNicChange: (val: string) => void;
  guarantorAddress: string;
  onGuarantorAddressChange: (val: string) => void;
  guarantorCustomerMatch: CustomerDetails | null;
  onFillGuarantorMatch: () => void;
  guarantorPhotoUrl: string;
  onGuarantorPhotoUrlChange: (val: string) => void;
  onOpenPhotoCapture: () => void;
  onRemovePhoto: () => void;
  uploadingPhoto: boolean;
  guarantorConsent: boolean;
  onGuarantorConsentChange: (val: boolean) => void;
}

export function CreateAgreementModal({
  isOpen,
  onClose,
  onSubmit,
  saving,
  selectedSale,
  onSaleSelect,
  selectedProducts,
  onProductsChange,

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

  downPayment,
  onDownPaymentChange,
  numberOfInstallments,
  onNumberOfInstallmentsChange,
  interestMethod,
  onInterestMethodChange,
  interestValue,
  onInterestValueChange,

  guarantorName,
  onGuarantorNameChange,
  guarantorPhone,
  onGuarantorPhoneChange,
  guarantorNic,
  onGuarantorNicChange,
  guarantorAddress,
  onGuarantorAddressChange,
  guarantorCustomerMatch,
  onFillGuarantorMatch,
  guarantorPhotoUrl,
  onGuarantorPhotoUrlChange,
  onOpenPhotoCapture,
  onRemovePhoto,
  uploadingPhoto,
  guarantorConsent,
  onGuarantorConsentChange,
}: CreateAgreementModalProps) {
  if (!isOpen) return null;

  const effectiveTotal = selectedSale
    ? Number(selectedSale.total)
    : selectedProducts.reduce((acc, p) => acc + p.lineTotal, 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-2xl border border-border bg-surface p-6 shadow-xl overflow-y-auto max-h-[90vh]">
        <h2 className="text-base font-bold text-ink mb-1">Create Installment Agreement</h2>
        <p className="text-xs text-muted mb-4">Set product, down payment, interest terms, and guarantor details.</p>

        <form onSubmit={onSubmit} className="space-y-4">
          {/* Product / Device Selection Section */}
          <AgreementProductSelector
            selectedSale={selectedSale}
            onSaleSelect={onSaleSelect}
            selectedProducts={selectedProducts}
            onProductsChange={onProductsChange}
          />

          {/* Customer Details for Agreement */}
          <AgreementCustomerSection
            customerPhone={customerPhone}
            onCustomerPhoneChange={onCustomerPhoneChange}
            customerSearching={customerSearching}
            customerSearched={customerSearched}
            customerDetails={customerDetails}
            customerName={customerName}
            onCustomerNameChange={onCustomerNameChange}
            customerNic={customerNic}
            onCustomerNicChange={onCustomerNicChange}
            customerAddress={customerAddress}
            onCustomerAddressChange={onCustomerAddressChange}
          />

          {/* Schedule & Interest Config */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-semibold text-muted block mb-1">Down Payment (Rs)</label>
              <Input
                required
                type="number"
                min={0}
                placeholder="0.00"
                value={downPayment}
                onChange={(e) => onDownPaymentChange(e.target.value)}
                className="w-full text-xs font-mono"
              />
            </div>
            <div>
              <label className="text-[10px] font-semibold text-muted block mb-1">Installments (Months)</label>
              <select
                value={numberOfInstallments}
                onChange={(e) => onNumberOfInstallmentsChange(e.target.value)}
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

          {/* Interest Method & Value */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-semibold text-muted block mb-1">Interest Method</label>
              <select
                value={interestMethod}
                onChange={(e) => onInterestMethodChange(e.target.value as 'PERCENTAGE' | 'FIXED_AMOUNT')}
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
                onChange={(e) => onInterestValueChange(e.target.value)}
                className="w-full text-xs font-mono"
              />
            </div>
          </div>

          {/* Live Preview of Calculations */}
          {effectiveTotal > 0 && downPayment ? (
            (() => {
              const saleTotal = effectiveTotal;
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
          <GuarantorSection
            guarantorName={guarantorName}
            onGuarantorNameChange={onGuarantorNameChange}
            guarantorPhone={guarantorPhone}
            onGuarantorPhoneChange={onGuarantorPhoneChange}
            guarantorNic={guarantorNic}
            onGuarantorNicChange={onGuarantorNicChange}
            guarantorAddress={guarantorAddress}
            onGuarantorAddressChange={onGuarantorAddressChange}
            guarantorCustomerMatch={guarantorCustomerMatch}
            onFillGuarantorMatch={onFillGuarantorMatch}
            guarantorPhotoUrl={guarantorPhotoUrl}
            onGuarantorPhotoUrlChange={onGuarantorPhotoUrlChange}
            onOpenPhotoCapture={onOpenPhotoCapture}
            onRemovePhoto={onRemovePhoto}
            uploadingPhoto={uploadingPhoto}
            guarantorConsent={guarantorConsent}
            onGuarantorConsentChange={onGuarantorConsentChange}
          />

          <div className="flex justify-end gap-2 border-t border-border pt-4">
            <Button
              type="button"
              onClick={onClose}
              variant="secondary"
              className="px-4 py-2 text-xs font-bold"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!selectedSale && selectedProducts.length === 0}
              loading={saving}
              className="px-4 py-2 text-xs font-bold"
            >
              Create &amp; Generate Barcode
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
