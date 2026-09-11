import { useAppSelector } from '../app/hooks';

/**
 * Always mounted, invisible on screen — CSS makes it (and only it) visible
 * during window.print(), so F12 prints without opening a separate window.
 */
export function Receipt() {
  const settings = useAppSelector((s) => s.settings.data);
  const receipt = useAppSelector((s) => s.pos.lastCompleted);

  if (!receipt) return <div className="receipt" />;

  const subtotal = receipt.items.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0);

  return (
    <div className="receipt w-[80mm] font-mono text-xs text-black">
      {settings?.logoUrl ? (
        <img
          src={`http://localhost:4000${settings.logoUrl}`}
          alt=""
          className="mx-auto mb-1.5 block max-w-[40mm]"
        />
      ) : null}
      <h3 className="text-center text-sm font-bold">{settings?.companyName ?? 'Shop'}</h3>
      <p className="my-0.5 text-center">{new Date(receipt.completedAt).toLocaleString()}</p>
      {receipt.customerName || receipt.customerPhone ? (
        <div className="my-1 border-y border-dashed border-black/60 py-1 text-[11px] leading-tight text-left">
          {receipt.customerName ? (
            <div className="flex justify-between">
              <span className="font-semibold">Customer:</span>
              <span className="font-bold">{receipt.customerName}</span>
            </div>
          ) : null}
          {receipt.customerPhone ? (
            <div className="flex justify-between">
              <span>Phone:</span>
              <span>{receipt.customerPhone}</span>
            </div>
          ) : null}
          {receipt.customerAddress ? (
            <div className="flex justify-between">
              <span>Address:</span>
              <span className="text-right max-w-[48mm] truncate">{receipt.customerAddress}</span>
            </div>
          ) : null}
        </div>
      ) : null}
      <hr className="my-1 border-black" />
      {receipt.items.map((item, idx) => (
        <div key={item.productId + (item.serializedItemId || idx)} className="my-1">
          <div className="flex justify-between">
            <span className="font-semibold">
              {item.name} x{item.quantity}
            </span>
            <span>{(item.quantity * item.unitPrice).toFixed(2)}</span>
          </div>
          {item.imei ? (
            <div className="text-[10px] font-mono font-bold text-black pl-2">
              IMEI: {item.imei}
            </div>
          ) : null}
        </div>
      ))}

      {/* Trade-In Device Details Section */}
      {receipt.tradeInDevice || (receipt.tradeInDeduction && receipt.tradeInDeduction > 0) ? (
        <div className="my-1.5 border-y border-dashed border-black/80 py-1 text-[11px] leading-tight text-left">
          <div className="flex justify-between font-bold text-black uppercase tracking-wider text-[10px]">
            <span>Trade-In Device:</span>
            <span>-Rs {(receipt.tradeInDeduction || receipt.tradeInDevice?.tradeInValue || 0).toFixed(2)}</span>
          </div>
          <div className="font-semibold text-black mt-0.5">
            {receipt.tradeInDevice?.deviceInfo || 'Customer Trade-In'}
          </div>
          {receipt.tradeInDevice?.imei ? (
            <div className="text-[10px] font-mono text-black">
              IMEI: {receipt.tradeInDevice.imei}
            </div>
          ) : null}
          {receipt.tradeInDevice?.condition ? (
            <div className="text-[10px] text-black">
              Condition: {receipt.tradeInDevice.condition}
            </div>
          ) : null}
        </div>
      ) : null}

      <hr className="my-1 border-black" />
      <div className="my-0.5 flex justify-between">
        <span>Subtotal</span>
        <span>{subtotal.toFixed(2)}</span>
      </div>
      {receipt.discount > 0 ? (
        <div className="my-0.5 flex justify-between">
          <span>Discount</span>
          <span>-{receipt.discount.toFixed(2)}</span>
        </div>
      ) : null}
      {(receipt.tradeInDeduction && receipt.tradeInDeduction > 0) || receipt.tradeInDevice ? (
        <div className="my-0.5 flex justify-between font-semibold">
          <span>Trade-In Allowance</span>
          <span>-{(receipt.tradeInDeduction || receipt.tradeInDevice?.tradeInValue || 0).toFixed(2)}</span>
        </div>
      ) : null}
      <div className="my-0.5 flex justify-between text-sm font-bold">
        <span>Total</span>
        <span>{receipt.total.toFixed(2)}</span>
      </div>
      {receipt.tenderedAmount && receipt.tenderedAmount > receipt.total ? (
        <>
          <div className="my-0.5 flex justify-between">
            <span>Cash Tendered</span>
            <span>{receipt.tenderedAmount.toFixed(2)}</span>
          </div>
          <div className="my-0.5 flex justify-between font-bold">
            <span>Change / Balance</span>
            <span>{(receipt.changeAmount ?? (receipt.tenderedAmount - receipt.total)).toFixed(2)}</span>
          </div>
        </>
      ) : null}
      <p className="mt-2 text-center">Thank you!</p>
    </div>
  );
}
