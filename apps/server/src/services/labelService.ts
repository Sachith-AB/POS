import bwipjs from 'bwip-js';
import type { LabelPrintRequest } from '@pos/shared';
import { prisma } from '../lib/prisma.js';
import { HttpError } from '../middleware/errorHandler.js';

async function renderBarcodePng(text: string, format: 'CODE128' | 'QR'): Promise<Buffer> {
  const options =
    format === 'QR'
      ? { bcid: 'qrcode', text, scale: 4 }
      : { bcid: 'code128', text, scale: 3, height: 10, includetext: true, textxalign: 'center' as const };
  return bwipjs.toBuffer(options);
}

export interface LabelPreview {
  productId: string;
  sku: string;
  name: string;
  quantity: number;
  imageDataUrl: string;
}

/**
 * Generates one barcode image per requested product (keyed by internal SKU
 * so a freshly-generated label is immediately scannable by both the
 * stock-in flow and the POS screen — same code, same format, everywhere).
 */
export async function generateLabels(input: LabelPrintRequest): Promise<LabelPreview[]> {
  const labels: LabelPreview[] = [];
  for (const item of input.items) {
    const product = await prisma.product.findUnique({ where: { id: item.productId } });
    if (!product) throw new HttpError(404, `Product ${item.productId} not found`);

    const png = await renderBarcodePng(product.sku, input.format);
    const imageDataUrl = `data:image/png;base64,${png.toString('base64')}`;
    labels.push({
      productId: product.id,
      sku: product.sku,
      name: product.name,
      quantity: item.quantity,
      imageDataUrl,
    });
  }
  return labels;
}
