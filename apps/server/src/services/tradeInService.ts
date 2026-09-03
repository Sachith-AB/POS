import { prisma } from '../lib/prisma.js';
import { HttpError } from '../middleware/errorHandler.js';
import type { TradeInInput } from '@pos/shared';

export async function listTradeIns(status?: string) {
  const where: any = {};
  if (status && status !== 'ALL') where.status = status as any;

  return prisma.tradeIn.findMany({
    where,
    include: {
      customer: true,
      sale: true,
    },
    orderBy: { createdAt: 'desc' },
  });
}

export async function getTradeIn(id: string) {
  const item = await prisma.tradeIn.findUnique({
    where: { id },
    include: { customer: true, sale: true },
  });
  if (!item) throw new HttpError(404, 'Trade-in record not found');
  return item;
}

export async function createTradeIn(input: TradeInInput) {
  // If phone is provided, find or link customer
  let customerId = input.customerId;
  if (!customerId && input.customerPhone) {
    let customer = await prisma.customer.findUnique({ where: { phone: input.customerPhone } });
    if (!customer) {
      customer = await prisma.customer.create({
        data: {
          phone: input.customerPhone,
          name: input.customerName || null,
        },
      });
    }
    customerId = customer.id;
  }

  return prisma.tradeIn.create({
    data: {
      customerId: customerId || null,
      customerPhone: input.customerPhone || null,
      customerName: input.customerName || null,
      deviceInfo: input.deviceInfo,
      imei: input.imei || null,
      condition: input.condition,
      tradeInValue: input.tradeInValue,
      saleId: input.saleId || null,
      status: input.saleId ? 'ADJUSTED' : 'PENDING',
      notes: input.notes || null,
    },
    include: { customer: true },
  });
}

/**
 * Converts a trade-in device into inventory for resale (Used Device Resale Management).
 */
export async function convertTradeInToInventory(
  tradeInId: string,
  data: {
    sku?: string;
    barcode?: string;
    name: string;
    sellPrice: number;
    wholesalePrice?: number;
    category?: string;
  },
  employeeId: string
) {
  const tradeIn = await getTradeIn(tradeInId);
  if (tradeIn.status === 'IN_STOCK' || tradeIn.status === 'SOLD') {
    throw new HttpError(400, 'This trade-in device has already been added to inventory');
  }

  const sku = data.sku || `USED-${tradeIn.imei || Date.now().toString().slice(-6)}`;
  const barcode = data.barcode || (tradeIn.imei ? `BAR-${tradeIn.imei}` : sku);

  return prisma.$transaction(async (tx) => {
    // 1. Create product as used item
    const product = await tx.product.create({
      data: {
        sku,
        barcode,
        name: data.name,
        costPrice: tradeIn.tradeInValue, // Cost is what we paid/credited for trade-in
        sellPrice: data.sellPrice,
        wholesalePrice: data.wholesalePrice || null,
        quantity: 1,
        category: data.category || 'Used Phones',
        isSerialized: !!tradeIn.imei,
      },
    });

    // 2. If IMEI exists, create serialized item
    if (tradeIn.imei) {
      await tx.serializedItem.create({
        data: {
          productId: product.id,
          imei: tradeIn.imei,
          status: 'IN_STOCK',
        },
      });
    }

    // 3. Record stock movement
    await tx.stockMovement.create({
      data: {
        productId: product.id,
        type: 'RECEIVE',
        quantityDelta: 1,
        costPriceAtTime: tradeIn.tradeInValue,
        supplierName: `Customer Trade-In (${tradeIn.customerName || tradeIn.customerPhone || 'Walk-in'})`,
        invoiceRef: `TRADEIN-${tradeIn.id.slice(-6).toUpperCase()}`,
        employeeId,
      },
    });

    // 4. Update trade-in status
    const updatedTradeIn = await tx.tradeIn.update({
      where: { id: tradeInId },
      data: { status: 'IN_STOCK' },
    });

    return { product, tradeIn: updatedTradeIn };
  });
}
