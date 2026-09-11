import { useState } from 'react';
import type { StockTab } from './components/types';
import { StockHeader } from './components/StockHeader';
import { ReceiveStockPanel } from './components/ReceiveStockPanel';
import { ProductListPanel } from './components/ProductListPanel';
import { SupplierManagementPanel } from './components/SupplierManagementPanel';
import { TransactionHistoryPanel } from './components/TransactionHistoryPanel';
import { SupplierReturnsPanel } from './components/SupplierReturnsPanel';
import { TradeInManagementPanel } from './components/TradeInManagementPanel';
import { LabelPrinterPanel } from './components/LabelPrinterPanel';

export function StockPage() {
  const [activeTab, setActiveTab] = useState<StockTab>('receiving');

  return (
    <div className="flex h-full flex-col min-h-0 bg-canvas p-4 space-y-3 overflow-y-auto">
      {/* Top Header & Tab Navigation */}
      <StockHeader activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Tab Panels */}
      {activeTab === 'receiving' && <ReceiveStockPanel />}
      {activeTab === 'products' && <ProductListPanel />}
      {activeTab === 'suppliers' && <SupplierManagementPanel />}
      {activeTab === 'history' && <TransactionHistoryPanel />}
      {activeTab === 'returns' && <SupplierReturnsPanel />}
      {activeTab === 'tradeins' && <TradeInManagementPanel />}
      {activeTab === 'labels' && (
        <div className="max-w-xl">
          <LabelPrinterPanel />
        </div>
      )}
    </div>
  );
}

export default StockPage;
