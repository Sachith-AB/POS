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
      wholesalePrice: input.wholesalePrice ?? null,
      businessPrice: input.businessPrice ?? null,
      warrantyPeriodId: input.warrantyPeriodId ?? null,
      warrantyDurationDays: input.warrantyDurationDays ?? null,
      quantity: 0, // Product created with 0 so the intake batch receives it without doubling
      category: input.category,
    },
  });
}

/**
 * Receives one delivery batch: every line bumps product quantity, logs a
 * stock_movement, creates serialized_item for serialized products, and
 * updates the supplier's balance and transaction history.
 */
export async function receiveStockBatch(input: StockReceiveBatchInput, employeeId: string) {
  return prisma.$transaction(async (tx) => {
    const results = [];
    let totalBatchCost = 0;
    let totalUnits = 0;

    const batchReference =
      input.invoiceRef?.trim() ||
      `INV-${Date.now().toString().slice(-6)}-${Math.floor(1000 + Math.random() * 9000)}`;

    for (const line of input.lines) {
      const product = await tx.product.findUnique({ where: { id: line.productId } });
      if (!product) throw new HttpError(404, `Product ${line.productId} not found`);

      const unitCost =
        line.costPriceAtTime !== undefined ? Number(line.costPriceAtTime) : Number(product.costPrice) || 0;
      totalBatchCost += unitCost * line.quantityDelta;
      totalUnits += line.quantityDelta;

      const updated = await tx.product.update({
        where: { id: line.productId },
        data: { quantity: { increment: line.quantityDelta } },
      });

      await tx.stockMovement.create({
        data: {
          productId: line.productId,
          supplierId: input.supplierId || null,
          type: 'RECEIVE',
          quantityDelta: line.quantityDelta,
          costPriceAtTime: line.costPriceAtTime !== undefined ? line.costPriceAtTime : Number(product.costPrice),
          supplierName: input.supplierName || null,
          invoiceRef: batchReference,
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

    // Resolve supplierId: either directly passed or resolved from supplierName
    let targetSupplierId = input.supplierId || null;
    if (!targetSupplierId && input.supplierName?.trim()) {
      const matchedSupplier = await tx.supplier.findFirst({
        where: { name: { equals: input.supplierName.trim(), mode: 'insensitive' } },
      });
      if (matchedSupplier) {
        targetSupplierId = matchedSupplier.id;
      }
    }

    // Update supplier values if supplier is identified
    if (targetSupplierId) {
      const supplier = await tx.supplier.findUnique({ where: { id: targetSupplierId } });
      if (supplier) {
        // Link any stock movements from this batch that lacked supplierId
        if (!input.supplierId) {
          await tx.stockMovement.updateMany({
            where: {
              supplierName: input.supplierName,
              supplierId: null,
              createdAt: { gte: new Date(Date.now() - 10000) },
            },
            data: { supplierId: targetSupplierId },
          });
        }

        if (input.isCreditPurchase) {
          // Credit purchase: increases total payable and outstanding balance
          const updatedTotalPayable = Number(supplier.totalPayable) + totalBatchCost;
          const updatedPaidAmount = Number(supplier.paidAmount);
          const updatedOutstanding = Math.max(0, updatedTotalPayable - updatedPaidAmount);

          await tx.supplier.update({
            where: { id: targetSupplierId },
            data: {
              totalPayable: updatedTotalPayable,
              paidAmount: updatedPaidAmount,
              outstandingBalance: updatedOutstanding,
            },
          });

          await tx.supplierTransaction.create({
            data: {
              supplierId: targetSupplierId,
              type: 'PURCHASE',
              amount: totalBatchCost,
              reference: batchReference,
              notes: `Stock batch received on credit: ${totalUnits} items (Ref: ${batchReference})`,
            },
          });
        } else {
          // Cash/Immediate payment: totalPayable and paidAmount increase equally; outstanding unchanged
          const updatedTotalPayable = Number(supplier.totalPayable) + totalBatchCost;
          const updatedPaidAmount = Number(supplier.paidAmount) + totalBatchCost;
          const updatedOutstanding = Math.max(0, updatedTotalPayable - updatedPaidAmount);

          await tx.supplier.update({
            where: { id: targetSupplierId },
            data: {
              totalPayable: updatedTotalPayable,
              paidAmount: updatedPaidAmount,
              outstandingBalance: updatedOutstanding,
            },
          });

          await tx.supplierTransaction.create({
            data: {
              supplierId: targetSupplierId,
              type: 'PURCHASE',
              amount: totalBatchCost,
              reference: batchReference,
              notes: `Stock batch received (Paid): ${totalUnits} items (Ref: ${batchReference})`,
            },
          });

          await tx.supplierTransaction.create({
            data: {
              supplierId: targetSupplierId,
              type: 'PAYMENT',
              amount: totalBatchCost,
              reference: batchReference,
              notes: `Immediate payment for stock intake: ${totalUnits} items (Ref: ${batchReference})`,
            },
          });
        }
      }
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

export async function listStockMovements(params: {
  search?: string;
  type?: string;
  supplierId?: string;
  productId?: string;
  from?: string;
  to?: string;
  limit?: number;
  offset?: number;
} = {}) {
  const { search, type, supplierId, productId, from, to, limit = 100, offset = 0 } = params;
  const where: any = {};

  if (type && type !== 'ALL') {
    where.type = type;
  }
  if (supplierId && supplierId !== 'ALL') {
    where.supplierId = supplierId;
  }
  if (productId && productId !== 'ALL') {
    where.productId = productId;
  }
  if (from || to) {
    where.createdAt = {};
    if (from) where.createdAt.gte = new Date(from);
    if (to) {
      const toDate = new Date(to);
      toDate.setHours(23, 59, 59, 999);
      where.createdAt.lte = toDate;
    }
  }
  if (search) {
    where.OR = [
      { invoiceRef: { contains: search, mode: 'insensitive' } },
      { supplierName: { contains: search, mode: 'insensitive' } },
      { product: { name: { contains: search, mode: 'insensitive' } } },
      { product: { sku: { contains: search, mode: 'insensitive' } } },
      { product: { barcode: { contains: search, mode: 'insensitive' } } },
    ];
  }

  const [items, total] = await Promise.all([
    prisma.stockMovement.findMany({
      where,
      include: {
        product: true,
        supplier: true,
        employee: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: Math.min(limit, 200),
      skip: offset,
    }),
    prisma.stockMovement.count({ where }),
  ]);

  return { items, total };
}
