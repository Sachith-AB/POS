import type { Prisma } from '@prisma/client';
import type { QuickCreateProductInput, StockReceiveBatchInput } from '@pos/shared';
import { prisma } from '../lib/prisma.js';
import { HttpError } from '../middleware/errorHandler.js';

/** Creates a product on the fly when a scanned barcode has no match yet (Section 4.5.1). */
export async function quickCreateProduct(input: QuickCreateProductInput) {
  const existing = await prisma.product.findUnique({ where: { barcode: input.barcode } });
  if (existing) throw new HttpError(409, 'A product with this barcode already exists');

  const sku = `SKU-${input.barcode}`;
  return prisma.product.create({
    data: {
      sku,
      barcode: input.barcode,
      name: input.name,
      costPrice: input.costPrice,
      sellPrice: input.sellPrice,
      quantity: input.quantity,
      category: input.category,
    },
  });
}

/**
 * Receives one delivery batch: every line bumps product quantity, logs a
 * stock_movement, and (for serialized products) creates one serialized_item
 * per IMEI. All-or-nothing so a half-scanned batch never corrupts stock counts.
 */
export async function receiveStockBatch(input: StockReceiveBatchInput, employeeId: string) {
  return prisma.$transaction(async (tx) => {
    const results = [];
    for (const line of input.lines) {
      const product = await tx.product.findUnique({ where: { id: line.productId } });
      if (!product) throw new HttpError(404, `Product ${line.productId} not found`);

      const updated = await tx.product.update({
        where: { id: line.productId },
        data: { quantity: { increment: line.quantityDelta } },
      });

      await tx.stockMovement.create({
        data: {
          productId: line.productId,
          type: 'RECEIVE',
          quantityDelta: line.quantityDelta,
          costPriceAtTime: line.costPriceAtTime,
          supplierName: input.supplierName,
          invoiceRef: input.invoiceRef,
          employeeId,
        },
      });

      if (product.isSerialized && line.imeis?.length) {
        await tx.serializedItem.createMany({
          data: line.imeis.map((imei) => ({ productId: line.productId, imei })),
        });
      }

      results.push(updated);
    }
    return results;
  });
}

export async function decrementStockForSale(
  tx: Prisma.TransactionClient,
  productId: string,
  quantity: number,
  employeeId: string,
  saleItemId: string,
  serializedItemId?: string | null
) {
  await tx.product.update({
    where: { id: productId },
    data: { quantity: { decrement: quantity } },
  });
  await tx.stockMovement.create({
    data: {
      productId,
      type: 'SALE',
      quantityDelta: -quantity,
      employeeId,
    },
  });
  if (serializedItemId) {
    await tx.serializedItem.update({
      where: { id: serializedItemId },
      data: { status: 'SOLD', soldInSaleItemId: saleItemId },
    });
  }
}
