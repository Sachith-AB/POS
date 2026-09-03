import { useAppSelector } from '../app/hooks';
import type { RepairTicket } from '../features/repairs/repairsSlice';

interface A5RepairBillProps {
  ticket: RepairTicket | null;
}

export function A5RepairBill({ ticket }: A5RepairBillProps) {
  const settings = useAppSelector((s) => s.settings.data);

  if (!ticket) return null;

  const est = ticket.estimate ? Number(ticket.estimate) : 0;
  const adv = ticket.advancePayment ? Number(ticket.advancePayment) : 0;
  const bal = Math.max(0, est - adv);

  const renderCopy = (copyType: 'CUSTOMER COPY' | 'OFFICE / WORKSHOP COPY') => (
    <div className="border-2 border-black rounded-lg p-3 text-black text-xs font-sans flex flex-col justify-between h-[135mm] box-border">
      {/* Header */}
      <div>
        <div className="flex items-center justify-between border-b-2 border-black pb-2">
          <div className="flex items-center gap-3">
            {settings?.logoUrl ? (
              <img
                src={`http://localhost:4000${settings.logoUrl}`}
                alt="Logo"
                className="h-10 w-auto object-contain"
              />
            ) : null}
            <div>
              <h2 className="text-base font-extrabold uppercase tracking-wide">{settings?.companyName || 'KZERO MOBILE'}</h2>
              <p className="text-[10px] text-gray-700">Mobile Phone Sales &amp; Advanced Service Center</p>
            </div>
          </div>
          <div className="text-right">
            <span className="inline-block bg-black text-white text-[10px] font-bold px-2 py-0.5 rounded tracking-wider uppercase">
              {copyType}
            </span>
            <p className="text-xs font-mono font-extrabold mt-1">NO: {ticket.ticketNumber}</p>
          </div>
        </div>

        {/* Info Grid */}
        <div className="grid grid-cols-2 gap-2 mt-2 text-[11px] border-b border-gray-400 pb-2">
          <div>
            <p><strong>Customer:</strong> {ticket.customer?.name || 'Walk-in Customer'}</p>
            <p><strong>Phone:</strong> {ticket.customer?.phone}</p>
            <p><strong>Date / Time:</strong> {new Date(ticket.createdAt).toLocaleString()}</p>
          </div>
          <div>
            <p><strong>Device:</strong> {ticket.deviceInfo}</p>
            <p><strong>Status:</strong> {ticket.status}</p>
            <p><strong>Warranty:</strong> {ticket.warrantyExpiresAt ? `${new Date(ticket.warrantyExpiresAt).toLocaleDateString()}` : '3-Day Return Support'}</p>
          </div>
        </div>

        {/* Issue & Diagnosis */}
        <div className="mt-2 text-[11px] border-b border-gray-400 pb-2">
          <p><strong>Reported Fault / Problem:</strong></p>
          <p className="text-gray-800 italic pl-1">{ticket.issue}</p>
        </div>

        {/* Pricing Summary */}
        <div className="mt-2 grid grid-cols-3 gap-2 bg-gray-100 p-2 rounded text-center border border-gray-300">
          <div>
            <span className="text-[10px] text-gray-600 block">Total Estimate</span>
            <span className="font-mono font-bold text-xs">Rs {est.toFixed(2)}</span>
          </div>
          <div>
            <span className="text-[10px] text-gray-600 block">Advance Paid</span>
            <span className="font-mono font-bold text-xs text-emerald-700">Rs {adv.toFixed(2)}</span>
          </div>

          <div>
            <span className="text-[10px] text-gray-600 block">Remaining Balance</span>
            <span className="font-mono font-extrabold text-sm text-rose-700">Rs {bal.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Footer & Signatures */}
      <div className="mt-2 pt-2 border-t border-dashed border-gray-400">
        <p className="text-[8px] text-gray-600 leading-tight">
          * Terms: Devices not collected within 30 days are subject to disposal. Please present this bill when collecting the device.
        </p>
        <div className="flex justify-between items-end mt-4 pt-4 text-[10px]">
          <div className="text-center w-36 border-t border-black pt-0.5">
            <span>Customer Signature</span>
          </div>
          <div className="text-center">
            <img
              src={`http://localhost:4000/api/repairs/${ticket.id}/barcode`}
              alt={ticket.ticketNumber}
              className="h-7 w-32 object-contain mx-auto"
            />
            <span className="font-mono text-[9px]">{ticket.ticketNumber}</span>
          </div>
          <div className="text-center w-36 border-t border-black pt-0.5">
            <span>Authorized Signature</span>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="a5-repair-bill-container hidden print:block bg-white p-4">
      {/* A5 Sheet Layout: 2 copies stacked with perforation line */}
      <div className="space-y-4">
        {renderCopy('CUSTOMER COPY')}
        
        {/* Perforation Divider */}
        <div className="flex items-center gap-2 text-[9px] text-gray-500 py-1">
          <div className="flex-1 border-b-2 border-dashed border-gray-400" />
          <span className="font-mono uppercase tracking-widest text-[8px]">✂ CUT HERE - BILL BOOK PERFORATION ✂</span>
          <div className="flex-1 border-b-2 border-dashed border-gray-400" />
        </div>

        {renderCopy('OFFICE / WORKSHOP COPY')}
      </div>
    </div>
  );
}
