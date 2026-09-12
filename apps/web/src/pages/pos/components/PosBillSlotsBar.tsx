import { FiShield, FiSmartphone } from 'react-icons/fi';
import { Button } from '../../../components/Button';
import type { BillSlot } from '../../../features/pos/posTypes';

interface PosBillSlotsBarProps {
  bills: BillSlot[];
  activeIndex: number;
  isMobileTab: boolean;
  priceCheckMode: boolean;
  mobilePhonesCount: number;
  onSwitchBill: (index: number) => void;
  onTogglePriceCheck: () => void;
  onToggleMobileTab: () => void;
}

export function PosBillSlotsBar({
  bills,
  activeIndex,
  isMobileTab,
  priceCheckMode,
  mobilePhonesCount,
  onSwitchBill,
  onTogglePriceCheck,
  onToggleMobileTab,
}: PosBillSlotsBarProps) {
  return (
    <div className="flex items-center justify-between flex-wrap gap-2">
      <div className="flex gap-1.5 items-center flex-wrap">
        {bills.map((b, i) => (
          <Button
            key={i}
            onClick={() => onSwitchBill(i)}
            variant={i === activeIndex && !isMobileTab ? 'primary' : 'secondary'}
            className="py-1 px-2.5 text-xs font-semibold"
          >
            Bill {i + 1}
            {b.items.length ? ` (${b.items.length})` : ''}
          </Button>
        ))}

        <Button
          onClick={onTogglePriceCheck}
          variant={priceCheckMode ? 'primary' : 'secondary'}
          className="py-1 px-2.5 text-xs"
        >
          {priceCheckMode ? 'Price Check: ON' : 'Price Check'}
        </Button>

        <button
          type="button"
          onClick={onToggleMobileTab}
          className={`inline-flex items-center gap-1.5 py-1 px-3 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
            isMobileTab
              ? 'bg-blue-600 text-white border-blue-600 shadow-xs ring-2 ring-blue-500/30'
              : 'bg-canvas text-ink border-border hover:bg-surface hover:border-ink'
          }`}
        >
          <span>Mobile Phones</span>
          {mobilePhonesCount > 0 ? (
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                isMobileTab ? 'bg-white text-blue-700' : 'bg-blue-500/10 text-blue-600'
              }`}
            >
              {mobilePhonesCount}
            </span>
          ) : null}
        </button>
      </div>

      {/* 3 Days Warranty Notification Badge */}
      <div className="flex items-center gap-1.5 text-xs bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2.5 py-1 rounded-full font-medium border border-emerald-500/20">
        <FiShield className="h-3.5 w-3.5" />
        <span>3 Days Return/Support Active</span>
      </div>
    </div>
  );
}
