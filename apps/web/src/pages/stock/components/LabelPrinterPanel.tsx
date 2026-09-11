import { useState } from 'react';
import { useAppSelector } from '../../../app/hooks';
import { api } from '../../../lib/api';
import { Input } from '../../../components/Input';
import { Button } from '../../../components/Button';
import { toast } from 'react-toastify';
import type { Product } from '../../../features/products/productsSlice';
import { printHtmlViaIframe, generateProductLabelsHtml, type ProductLabelItem } from '../../../lib/printUtils';
import {
  FiSearch,
  FiPrinter,
  FiPlus,
  FiTrash2,
  FiRefreshCw,
  FiBox,
  FiCheckCircle,
} from 'react-icons/fi';

export function LabelPrinterPanel() {
  const settings = useAppSelector((s) => s.settings?.data);
  const [search, setSearch] = useState('');
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<Product[]>([]);
  const [queue, setQueue] = useState<{ productId: string; name: string; barcode: string; sku: string; sellPrice: number; quantity: number }[]>([]);
  const [labels, setLabels] = useState<ProductLabelItem[]>([]);
  const [generating, setGenerating] = useState(false);

  // Sticker print configurations
  const [labelSize, setLabelSize] = useState<'38x25' | '50x30' | 'sheet'>('38x25');
  const [showPrice, setShowPrice] = useState(true);
  const [showShopName, setShowShopName] = useState(true);

  async function runSearch() {
    if (!search.trim()) return;
    setSearching(true);
    try {
      const res = await api.get<Product[]>(`/products?search=${encodeURIComponent(search.trim())}`);
      setResults(res || []);
      if (!res || res.length === 0) {
        toast.info('No products found matching search');
      }
    } catch (err: any) {
      toast.error(err.message || 'Product search failed');
    } finally {
      setSearching(false);
    }
  }

  function addToQueue(p: Product) {
    setQueue((prev) => {
      const exists = prev.find((i) => i.productId === p.id);
      if (exists) {
        return prev.map((i) => (i.productId === p.id ? { ...i, quantity: i.quantity + 1 } : i));
      }
      return [
        ...prev,
        {
          productId: p.id,
          name: p.name,
          barcode: p.barcode || p.sku || '',
          sku: p.sku || '',
          sellPrice: Number(p.sellPrice || 0),
          quantity: 1,
        },
      ];
    });
  }

  function removeFromQueue(productId: string) {
    setQueue((prev) => prev.filter((i) => i.productId !== productId));
  }

  async function handleGenerate(printImmediately = false) {
    if (queue.length === 0) {
      toast.warn('Please add at least one product to the print queue');
      return;
    }

    setGenerating(true);
    try {
      const generated = await api.post<ProductLabelItem[]>('/labels', {
        items: queue.map((q) => ({ productId: q.productId, quantity: Math.max(1, q.quantity) })),
        format: 'CODE128',
      });

      setLabels(generated);
      const totalStickers = queue.reduce((sum, item) => sum + Math.max(1, item.quantity), 0);

      if (printImmediately) {
        toast.info(`Opening print dialog for ${totalStickers} sticker(s)...`);
        const html = generateProductLabelsHtml(generated, {
          size: labelSize,
          shopName: settings?.companyName || 'RETAIL STORE',
          showPrice,
          showShopName,
        });
        printHtmlViaIframe(html);
      } else {
        toast.success(`Generated preview for ${totalStickers} sticker(s)`);
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to generate barcode labels');
    } finally {
      setGenerating(false);
    }
  }

  function handlePrintCurrentLabels() {
    if (labels.length === 0) return;
    const totalStickers = labels.reduce((sum, item) => sum + Math.max(1, item.quantity), 0);
    toast.info(`Opening print dialog for ${totalStickers} sticker(s)...`);
    const html = generateProductLabelsHtml(labels, {
      size: labelSize,
      shopName: settings?.companyName || 'RETAIL STORE',
      showPrice,
      showShopName,
    });
    printHtmlViaIframe(html);
  }

  return (
    <div className="space-y-4">
      {/* Top Configuration & Search Card */}
      <div className="rounded-2xl border border-border bg-surface p-5 shadow-xs">
        <div className="flex items-center justify-between mb-1">
          <h3 className="font-bold text-base text-ink flex items-center gap-2">
            <FiPrinter className="w-5 h-5 text-primary" />
            Print Barcode Stickers
          </h3>
          <span className="text-[11px] font-semibold text-primary bg-primary/10 px-2.5 py-0.5 rounded-full">
            Thermal &amp; Sheet Support
          </span>
        </div>
        <p className="text-xs text-muted mb-4">
          Generate high-resolution thermal barcode labels (38x25mm / 50x30mm) or A4 printable sheets for retail inventory.
        </p>

        {/* Search bar */}
        <div className="flex gap-2">
          <Input
            placeholder="Search product by name, barcode, or SKU…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') runSearch();
            }}
            className="flex-1 text-xs"
          />
          <Button onClick={runSearch} variant="secondary" className="text-xs min-w-[80px]" disabled={searching}>
            {searching ? 'Searching…' : 'Search'}
          </Button>
        </div>

        {/* Search Results */}
        {results.length > 0 && (
          <ul className="my-3 flex flex-col gap-1.5 max-h-44 overflow-y-auto pr-1">
            {results.map((p) => (
              <li
                key={p.id}
                className="flex items-center justify-between p-2.5 rounded-xl bg-canvas border border-border text-xs hover:border-primary/40 transition-colors"
              >
                <div>
                  <div className="font-semibold text-ink">{p.name}</div>
                  <div className="text-[10px] text-muted flex gap-2 mt-0.5">
                    <span>Code: {p.barcode || p.sku}</span>
                    <span>•</span>
                    <span className="font-bold text-ink">Rs {Number(p.sellPrice).toFixed(2)}</span>
                    <span>•</span>
                    <span>Stock: {p.quantity}</span>
                  </div>
                </div>
                <Button
                  onClick={() => addToQueue(p)}
                  variant="secondary"
                  className="py-1 px-2.5 text-xs font-bold flex items-center gap-1"
                >
                  + Add
                </Button>
              </li>
            ))}
          </ul>
        )}

        {/* Print Queue */}
        {queue.length > 0 ? (
          <div className="space-y-3 border-t border-border pt-4 mt-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-ink">
                Print Queue ({queue.length} product{queue.length > 1 ? 's' : ''}, {queue.reduce((s, i) => s + (i.quantity || 1), 0)} sticker{queue.reduce((s, i) => s + (i.quantity || 1), 0) > 1 ? 's' : ''})
              </span>
              <button
                type="button"
                onClick={() => setQueue([])}
                className="text-[10px] text-danger hover:underline cursor-pointer"
              >
                Clear Queue
              </button>
            </div>

            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {queue.map((q) => (
                <div
                  key={q.productId}
                  className="flex items-center justify-between p-2 rounded-lg bg-canvas border border-border/70 text-xs"
                >
                  <div className="min-w-0 pr-2">
                    <div className="truncate font-medium text-ink">{q.name}</div>
                    <div className="text-[10px] text-muted">Rs {q.sellPrice.toFixed(2)}</div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[10px] text-muted">Copies:</span>
                    <Input
                      type="number"
                      min={1}
                      max={500}
                      value={q.quantity}
                      onChange={(e) =>
                        setQueue((prev) =>
                          prev.map((item) =>
                            item.productId === q.productId ? { ...item, quantity: Math.max(1, parseInt(e.target.value) || 1) } : item
                          )
                        )
                      }
                      className="w-16 text-center text-xs py-0.5 font-bold"
                    />
                    <button
                      type="button"
                      onClick={() => removeFromQueue(q.productId)}
                      className="p-1 rounded text-muted hover:text-danger hover:bg-danger/10 transition-colors"
                      title="Remove product"
                    >
                      <FiTrash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Sticker Configuration Options */}
            <div className="p-3 bg-canvas rounded-xl border border-border space-y-2 text-xs">
              <div className="font-semibold text-ink text-[11px] uppercase tracking-wider">Printer &amp; Label Format</div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <label
                  className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-all ${
                    labelSize === '38x25'
                      ? 'bg-surface border-primary text-primary font-bold shadow-2xs'
                      : 'border-border text-muted hover:text-ink'
                  }`}
                >
                  <input
                    type="radio"
                    name="labelSize"
                    checked={labelSize === '38x25'}
                    onChange={() => setLabelSize('38x25')}
                    className="hidden"
                  />
                  <span>38 × 25 mm (Thermal)</span>
                </label>
                <label
                  className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-all ${
                    labelSize === '50x30'
                      ? 'bg-surface border-primary text-primary font-bold shadow-2xs'
                      : 'border-border text-muted hover:text-ink'
                  }`}
                >
                  <input
                    type="radio"
                    name="labelSize"
                    checked={labelSize === '50x30'}
                    onChange={() => setLabelSize('50x30')}
                    className="hidden"
                  />
                  <span>50 × 30 mm (Thermal)</span>
                </label>
                <label
                  className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-all ${
                    labelSize === 'sheet'
                      ? 'bg-surface border-primary text-primary font-bold shadow-2xs'
                      : 'border-border text-muted hover:text-ink'
                  }`}
                >
                  <input
                    type="radio"
                    name="labelSize"
                    checked={labelSize === 'sheet'}
                    onChange={() => setLabelSize('sheet')}
                    className="hidden"
                  />
                  <span>A4 Sticker Sheet</span>
                </label>
              </div>

              <div className="flex gap-4 pt-1">
                <label className="flex items-center gap-1.5 cursor-pointer text-[11px]">
                  <input
                    type="checkbox"
                    checked={showPrice}
                    onChange={(e) => setShowPrice(e.target.checked)}
                    className="rounded border-border accent-primary"
                  />
                  <span>Include Retail Price</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer text-[11px]">
                  <input
                    type="checkbox"
                    checked={showShopName}
                    onChange={(e) => setShowShopName(e.target.checked)}
                    className="rounded border-border accent-primary"
                  />
                  <span>Include Shop Name</span>
                </label>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 pt-1">
              <Button
                onClick={() => handleGenerate(true)}
                disabled={generating}
                className="flex-1 py-2.5 text-xs font-bold flex items-center justify-center gap-2"
              >
                <FiPrinter className="w-4 h-4" />
                {generating ? 'Generating & Printing…' : 'Generate & Print Stickers'}
              </Button>
              <Button
                onClick={() => handleGenerate(false)}
                disabled={generating}
                variant="secondary"
                className="py-2.5 text-xs font-bold"
              >
                Preview Labels
              </Button>
            </div>
          </div>
        ) : null}
      </div>

      {/* Live Label Preview Section */}
      {labels.length > 0 && (
        <div className="rounded-2xl border border-border bg-surface p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-bold text-sm text-ink">Sticker Label Preview</h4>
              <p className="text-[11px] text-muted">
                Showing {labels.reduce((s, i) => s + (i.quantity || 1), 0)} sticker(s) ready to print
              </p>
            </div>
            <Button
              onClick={handlePrintCurrentLabels}
              className="py-1.5 px-3 text-xs font-bold flex items-center gap-1.5"
            >
              <FiPrinter className="w-3.5 h-3.5" />
              Print Stickers
            </Button>
          </div>

          <div className="flex flex-wrap gap-3 p-3 bg-canvas rounded-xl border border-border max-h-72 overflow-y-auto">
            {labels.flatMap((label) =>
              Array.from({ length: Math.min(label.quantity, 10) }, (_, i) => (
                <div
                  key={`${label.productId}-${i}`}
                  className="w-[140px] p-2 bg-white border border-gray-300 rounded shadow-xs flex flex-col items-center justify-between text-center text-black"
                >
                  {showShopName && (
                    <div className="text-[9px] font-extrabold uppercase tracking-wide truncate max-w-full text-gray-800">
                      {settings?.companyName || 'RETAIL STORE'}
                    </div>
                  )}
                  <div className="text-[10px] font-bold text-gray-900 truncate max-w-full my-0.5">
                    {label.name}
                  </div>
                  <img
                    src={label.imageDataUrl}
                    alt={label.barcode}
                    className="w-full max-h-9 object-contain my-0.5"
                  />
                  {showPrice && (
                    <div className="text-[10px] font-black text-black">
                      Rs {label.sellPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                  )}
                </div>
              ))
            )}
            {labels.some((l) => l.quantity > 10) && (
              <div className="flex items-center justify-center p-3 text-xs text-muted">
                + more copies will be printed according to queue counts
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Sub-component 6: Product List Panel