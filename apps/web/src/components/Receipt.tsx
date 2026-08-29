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
      {receipt.customerName ? <p className="my-0.5 text-center">Customer: {receipt.customerName}</p> : null}
      <hr className="my-1 border-black" />
      {receipt.items.map((item) => (
        <div key={item.productId} className="my-0.5 flex justify-between">
          <span>
            {item.name} x{item.quantity}
          </span>
          <span>{(item.quantity * item.unitPrice).toFixed(2)}</span>
        </div>
      ))}
      <hr className="my-1 border-black" />
      <div className="my-0.5 flex justify-between">
        <span>Subtotal</span>
        <span>{subtotal.toFixed(2)}</span>
      </div>
      <div className="my-0.5 flex justify-between">
        <span>Discount</span>
        <span>-{receipt.discount.toFixed(2)}</span>
      </div>
      <div className="my-0.5 flex justify-between text-sm font-bold">
        <span>Total</span>
        <span>{receipt.total.toFixed(2)}</span>
      </div>
      <p className="mt-2 text-center">Thank you!</p>
    </div>
  );
}
