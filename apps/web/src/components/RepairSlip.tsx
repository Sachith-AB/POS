import { useAppSelector } from '../app/hooks';
import type { RepairTicket } from '../features/repairs/repairsSlice';

interface RepairSlipProps {
  ticket: RepairTicket | null;
}

export function RepairSlip({ ticket }: RepairSlipProps) {
  const settings = useAppSelector((s) => s.settings.data);

  if (!ticket) return <div className="repair-slip" />;

  return (
    <div className="repair-slip w-[80mm] font-mono text-xs text-black p-2">
      {settings?.logoUrl ? (
        <img
          src={`http://localhost:4000${settings.logoUrl}`}
          alt=""
          className="mx-auto mb-1.5 block max-w-[40mm]"
        />
      ) : null}
      <h3 className="text-center text-sm font-bold">{settings?.companyName ?? 'Shop'}</h3>
      <p className="text-center font-semibold text-xs mt-1">REPAIR INTAKE SLIP</p>
      {ticket.isThreeDayWarranty ? (
        <div className="my-1 text-center font-bold text-xs p-1 border-2 border-black bg-black/5">
          3-DAY WARRANTY - NO CHARGE REPAIR
        </div>
      ) : null}
      <hr className="my-1 border-black border-dashed" />
      
      <div className="my-1 text-center">
        <span className="text-sm font-bold block">{ticket.ticketNumber}</span>
        {/* Render barcode image using the server's endpoint */}
        <img
          src={`http://localhost:4000/api/repairs/${ticket.id}/barcode`}
          alt={ticket.ticketNumber}
          className="mx-auto my-1 block h-10 w-[60mm] object-contain"
        />
      </div>

      <hr className="my-1 border-black border-dashed" />
      
      <div className="space-y-1">
        <div className="flex justify-between">
          <span className="font-bold">Date:</span>
          <span>{new Date(ticket.createdAt).toLocaleString()}</span>
        </div>
        <div className="flex justify-between">
          <span className="font-bold">Status:</span>
          <span>{ticket.status}</span>
        </div>
        <div className="flex justify-between">
          <span className="font-bold">Customer:</span>
          <span>{ticket.customer?.name || 'Walk-in'}</span>
        </div>
        <div className="flex justify-between">
          <span className="font-bold">Phone:</span>
          <span>{ticket.customer?.phone}</span>
        </div>
      </div>

      <hr className="my-1 border-black border-dashed" />

      <div className="my-1">
        <p className="font-bold">Device Info:</p>
        <p className="pl-2 break-words">{ticket.deviceInfo}</p>
      </div>

      <div className="my-1">
        <p className="font-bold">Reported Issue:</p>
        <p className="pl-2 break-words">{ticket.issue}</p>
      </div>

      {ticket.estimate ? (
        <div className="my-1 flex justify-between font-bold text-sm">
          <span>Est. Cost:</span>
          <span>Rs {Number(ticket.estimate).toFixed(2)}</span>
        </div>
      ) : null}

      <hr className="my-1 border-black border-dashed" />
      
      <div className="text-center mt-3 text-[9px] leading-tight">
        <p>Please present this slip when collecting your device.</p>
        <p className="mt-1 font-bold">Thank you!</p>
      </div>
    </div>
  );
}
