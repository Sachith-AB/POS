import type { StockTab } from './types';

interface StockHeaderProps {
  activeTab: StockTab;
  onTabChange: (tab: StockTab) => void;
}

export function StockHeader({ activeTab, onTabChange }: StockHeaderProps) {
  const tabs: { id: StockTab; label: string }[] = [
    { id: 'receiving', label: 'Stock Intake' },
    { id: 'products', label: 'Product List' },
    { id: 'suppliers', label: 'Suppliers' },
    { id: 'history', label: 'Transaction History' },
    { id: 'returns', label: 'Supplier Returns' },
    { id: 'tradeins', label: 'Trade-In Resale' },
    { id: 'labels', label: 'Barcode Labels' },
  ];

  return (
    <div className="flex items-center justify-between border-b border-border bg-surface p-4 rounded-2xl shadow-xs">
      <div>
        <h2 className="text-lg font-bold text-ink">Inventory, Suppliers &amp; Stock Operations</h2>
        <p className="text-xs text-muted">
          Manage stock intake, 50+ categories, wholesale/business pricing, suppliers, and transaction history
        </p>
      </div>

      <div className="flex bg-canvas p-1 rounded-xl border border-border gap-1 text-xs font-semibold overflow-x-auto">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => onTabChange(tab.id)}
            className={`px-3 py-1.5 rounded-lg cursor-pointer transition-all whitespace-nowrap ${
              activeTab === tab.id
                ? 'bg-surface text-ink shadow-xs font-bold'
                : 'text-muted hover:text-ink'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
    </div>
  );
}
