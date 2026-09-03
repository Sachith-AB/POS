import bwipjs from 'bwip-js';
import { prisma } from '../lib/prisma.js';
import { HttpError } from '../middleware/errorHandler.js';

/**
 * Generates a unique barcode string for an agreement.
 * Format: AGR-YYYYMMDD-XXXX
 */
export function generateAgreementCode(): string {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `AGR-${dateStr}-${rand}`;
}

/**
 * Generates a PNG barcode buffer for printing sticker.
 */
export async function renderAgreementBarcodePng(code: string): Promise<Buffer> {
  return bwipjs.toBuffer({
    bcid: 'code128',
    text: code,
    scale: 3,
    height: 12,
    includetext: true,
    textxalign: 'center',
  });
}

/**
 * Scans/looks up an agreement by barcode code or plan ID.
 * Returns complete customer, agreement, sale, and installment payment details.
 */
export async function lookupAgreementByBarcode(barcodeOrId: string) {
  const code = barcodeOrId.trim();

  const plan = await prisma.installmentPlan.findFirst({
    where: {
      OR: [
        { agreementBarcode: code },
        { id: code },
        { saleId: code },
      ],
    },
    include: {
      sale: {
        include: {
          customer: true,
          payments: true,
          items: {
            include: {
              product: true,
            },
          },
        },
      },
    },
  });

  if (!plan) {
    throw new HttpError(404, `No installment agreement found for barcode "${code}"`);
  }

  return plan;
}
