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
  barcode: string;
  name: string;
  sellPrice: number;
  quantity: number;
  imageDataUrl: string;
}

/**
 * Generates one barcode image per requested product (keyed by barcode or internal SKU
 * so a freshly-generated label is immediately scannable by both the
 * stock-in flow and the POS screen — same code, same format, everywhere).
 */
export async function generateLabels(input: LabelPrintRequest): Promise<LabelPreview[]> {
  const labels: LabelPreview[] = [];
  for (const item of input.items) {
    const product = await prisma.product.findUnique({ where: { id: item.productId } });
    if (!product) throw new HttpError(404, `Product ${item.productId} not found`);

    const code = (product.barcode?.trim() || product.sku?.trim() || product.id.slice(-8));
    let png: Buffer;
    try {
      png = await renderBarcodePng(code, input.format);
    } catch {
      // Fallback if code contains characters not supported by chosen format
      png = await renderBarcodePng(product.sku || product.id.slice(-8), 'CODE128');
    }

    const imageDataUrl = `data:image/png;base64,${png.toString('base64')}`;
    labels.push({
      productId: product.id,
      sku: product.sku,
      barcode: code,
      name: product.name,
      sellPrice: Number(product.sellPrice || 0),
      quantity: item.quantity,
      imageDataUrl,
    });
  }
  return labels;
}
