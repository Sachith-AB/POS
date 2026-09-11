import { Input } from '../../../components/Input';
import { Button } from '../../../components/Button';

interface InstallmentsHeaderProps {
  barcodeSearch: string;
  onBarcodeSearchChange: (val: string) => void;
  onBarcodeLookup: () => void;
  barcodeSearching: boolean;
  barcodeError: string | null;
  onCreateClick: () => void;
}

export function InstallmentsHeader({
  barcodeSearch,
  onBarcodeSearchChange,
  onBarcodeLookup,
  barcodeSearching,
  barcodeError,
  onCreateClick,
}: InstallmentsHeaderProps) {
  return (
    <>
      <div className="flex items-center justify-between border-b border-border bg-surface px-6 py-3.5 gap-4">
        <div>
          <h1 className="text-lg font-bold text-ink">Installment Plans &amp; Physical Agreements</h1>
          <p className="text-xs text-muted">
            Scan agreement barcode stickers, track schedules, interest, and credit balances
          </p>
        </div>

        {/* Scan Agreement Barcode Input */}
        <div className="flex items-center gap-2 max-w-sm flex-1">
          <div className="relative flex-1">
            <Input
              placeholder="Scan Agreement Barcode (AGR-…)"
              value={barcodeSearch}
              onChange={(e) => onBarcodeSearchChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') onBarcodeLookup();
              }}
              className="w-full text-xs py-1.5 font-mono"
            />
            {barcodeSearching ? (
              <span className="absolute right-2 top-2 text-[10px] text-muted">Searching…</span>
            ) : null}
          </div>
          <Button
            onClick={onBarcodeLookup}
            variant="secondary"
            className="py-1 px-3 text-xs"
          >
            Lookup
          </Button>
        </div>

        <Button onClick={onCreateClick} className="text-xs font-bold">
          + Create Installment Plan
        </Button>
      </div>

      {barcodeError ? (
        <div className="bg-rose-500/10 border-b border-rose-500/20 text-rose-600 px-6 py-2 text-xs font-medium">
          {barcodeError}
        </div>
      ) : null}
    </>
  );
}
