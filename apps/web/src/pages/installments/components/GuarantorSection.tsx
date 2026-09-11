import { FiCamera, FiCheckCircle, FiRefreshCw, FiTrash2 } from 'react-icons/fi';
import { Input } from '../../../components/Input';
import { Button } from '../../../components/Button';
import type { CustomerDetails } from './types';
import { getImageUrl } from './types';

interface GuarantorSectionProps {
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

export function GuarantorSection({
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
}: GuarantorSectionProps) {
  return (
    <div className="border-t border-border pt-3 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-bold text-ink uppercase tracking-wide flex items-center gap-1">
          <span>Guarantor Information</span>
          <span className="text-rose-500 font-bold" title="Required">*</span>
        </h3>
        <span className="text-[10px] text-rose-500 font-semibold">* All Guarantor fields required</span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-[10px] font-semibold text-muted flex items-center gap-1 mb-1">
            <span>Guarantor Name</span>
            <span className="text-rose-500 font-bold">*</span>
          </label>
          <Input
            required
            placeholder="Full Name (Required)"
            value={guarantorName}
            onChange={(e) => onGuarantorNameChange(e.target.value)}
            className="w-full text-xs"
          />
        </div>
        <div>
          <label className="text-[10px] font-semibold text-muted flex items-center gap-1 mb-1">
            <span>Guarantor Phone</span>
            <span className="text-rose-500 font-bold">*</span>
          </label>
          <Input
            required
            placeholder="07XXXXXXXX (Required)"
            value={guarantorPhone}
            onChange={(e) => onGuarantorPhoneChange(e.target.value)}
            className="w-full text-xs font-mono"
          />
        </div>
      </div>

      {guarantorCustomerMatch ? (
        <div className="flex items-center justify-between p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/25 text-[11px] text-emerald-700 dark:text-emerald-300 animate-in fade-in duration-150">
          <span className="flex items-center gap-1.5 font-medium">
            <FiCheckCircle className="h-3.5 w-3.5 shrink-0" />
            Guarantor matched in customer DB: <strong>{guarantorCustomerMatch.name || guarantorCustomerMatch.phone}</strong>
          </span>
          <button
            type="button"
            onClick={onFillGuarantorMatch}
            className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-600 text-white hover:bg-emerald-700 cursor-pointer transition-colors"
          >
            Fill Info
          </button>
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-[10px] font-semibold text-muted flex items-center gap-1 mb-1">
            <span>Guarantor NIC</span>
            <span className="text-rose-500 font-bold">*</span>
          </label>
          <Input
            required
            placeholder="National ID Card No. (Required)"
            value={guarantorNic}
            onChange={(e) => onGuarantorNicChange(e.target.value)}
            className="w-full text-xs"
          />
        </div>
        <div>
          <label className="text-[10px] font-semibold text-muted flex items-center gap-1 mb-1">
            <span>Guarantor Address</span>
            <span className="text-rose-500 font-bold">*</span>
          </label>
          <Input
            required
            placeholder="Residential Address (Required)"
            value={guarantorAddress}
            onChange={(e) => onGuarantorAddressChange(e.target.value)}
            className="w-full text-xs"
          />
        </div>
      </div>

      {/* Guarantor Photo URL, Web Cam Capture & Preview */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label className="text-[10px] font-semibold text-muted block">
            Guarantor Photo (Web Cam or URL)
          </label>
          <button
            type="button"
            onClick={onOpenPhotoCapture}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline cursor-pointer"
          >
            <FiCamera className="h-3.5 w-3.5" />
            <span>{guarantorPhotoUrl ? 'Retake via Web Cam' : 'Open Web Cam'}</span>
          </button>
        </div>

        {guarantorPhotoUrl ? (
          <div className="flex items-center gap-3 p-2.5 rounded-xl border border-emerald-500/25 bg-emerald-500/5 animate-in fade-in duration-150">
            <img
              src={getImageUrl(guarantorPhotoUrl)}
              alt="Guarantor"
              className="h-16 w-16 rounded-lg object-cover border border-border bg-surface shrink-0"
              onError={(e) => {
                const target = e.currentTarget;
                if (guarantorPhotoUrl && !target.src.endsWith(guarantorPhotoUrl)) {
                  target.src = guarantorPhotoUrl;
                }
              }}
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                <FiCheckCircle className="h-3.5 w-3.5 shrink-0" />
                <span>Photo Attached</span>
              </div>
              <p className="text-[10px] text-muted truncate font-mono mt-0.5" title={guarantorPhotoUrl}>
                {guarantorPhotoUrl}
              </p>
              <div className="flex items-center gap-3 mt-1.5">
                <button
                  type="button"
                  onClick={onOpenPhotoCapture}
                  className="inline-flex items-center gap-1 text-[11px] font-medium text-primary hover:underline cursor-pointer"
                >
                  <FiRefreshCw className="h-3 w-3" /> Retake Web Cam
                </button>
                <span className="text-border">•</span>
                <button
                  type="button"
                  onClick={onRemovePhoto}
                  className="inline-flex items-center gap-1 text-[11px] font-medium text-rose-500 hover:underline cursor-pointer"
                >
                  <FiTrash2 className="h-3 w-3" /> Remove
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex gap-2">
            <div className="flex-1">
              <Input
                placeholder="https://... or click 'Open Web Cam'"
                value={guarantorPhotoUrl}
                onChange={(e) => onGuarantorPhotoUrlChange(e.target.value)}
                className="w-full text-xs font-mono"
              />
            </div>
            <Button
              type="button"
              onClick={onOpenPhotoCapture}
              variant="secondary"
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 whitespace-nowrap font-semibold cursor-pointer"
            >
              <FiCamera className="h-3.5 w-3.5 text-primary" />
              <span>Open Web Cam</span>
            </Button>
          </div>
        )}

        {uploadingPhoto ? (
          <p className="text-[10px] text-primary animate-pulse">Uploading photo to server...</p>
        ) : null}
      </div>

      <label className="flex items-center gap-2 text-xs text-muted cursor-pointer pt-1">
        <input
          required
          type="checkbox"
          checked={guarantorConsent}
          onChange={(e) => onGuarantorConsentChange(e.target.checked)}
          className="rounded border-border text-primary focus:ring-0"
        />
        <span className={guarantorConsent ? 'font-medium text-ink' : 'text-muted'}>
          Guarantor consent &amp; agreement terms acknowledged <span className="text-rose-500 font-bold">*</span>
        </span>
      </label>
    </div>
  );
}
