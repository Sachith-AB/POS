import { FiUser } from 'react-icons/fi';
import type { CustomerMatchedData } from '../../../features/pos/posTypes';

interface PosCustomerHeaderProps {
  customerName?: string | null;
  customerPhone?: string;
  customerDetails?: CustomerMatchedData | null;
}

export function PosCustomerHeader({
  customerName,
  customerPhone,
  customerDetails,
}: PosCustomerHeaderProps) {
  if (!customerDetails && !customerName) return null;

  return (
    <div className="flex items-center justify-between px-3.5 py-2 bg-emerald-500/10 border border-emerald-500/25 rounded-xl text-xs animate-in fade-in duration-150">
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-1.5 font-bold text-emerald-700 dark:text-emerald-300">
          <FiUser className="h-3.5 w-3.5" />
          <span>Customer: {customerName || customerDetails?.name || 'Registered Customer'}</span>
        </div>
        {customerPhone ? (
          <span className="font-mono text-ink text-[11px]">({customerPhone})</span>
        ) : null}
        {customerDetails?.nic ? (
          <span className="text-muted font-mono text-[11px]">&bull; NIC: {customerDetails.nic}</span>
        ) : null}
        {customerDetails?.categories?.map((c) => (
          <span
            key={c.category.id}
            className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-600 text-white shadow-xs"
          >
            {c.category.emoji ? `${c.category.emoji} ` : ''}
            {c.category.name}
          </span>
        ))}
      </div>
      {customerDetails?.address ? (
        <span className="text-muted text-[11px] truncate max-w-[220px]" title={customerDetails.address}>
          {customerDetails.address}
        </span>
      ) : null}
    </div>
  );
}
