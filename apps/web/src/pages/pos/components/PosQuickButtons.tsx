import { Button } from '../../../components/Button';
import type { Product } from '../../../features/products/productsSlice';

interface PosQuickButtonsProps {
  quickButtons: Product[];
  onAddProduct: (product: Product) => void;
}

export function PosQuickButtons({ quickButtons, onAddProduct }: PosQuickButtonsProps) {
  if (quickButtons.length === 0) return null;

  return (
    <div className="grid grid-cols-5 gap-1.5">
      {quickButtons.map((p) => (
        <Button
          key={p.id}
          onClick={() => onAddProduct(p)}
          variant="secondary"
          className="px-2 py-2.5 text-center text-xs font-medium rounded-xl truncate"
        >
          {p.name}
        </Button>
      ))}
    </div>
  );
}
