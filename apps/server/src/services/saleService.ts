import type { SaleCreateInput } from '@pos/shared';
import { prisma } from '../lib/prisma.js';
import { HttpError } from '../middleware/errorHandler.js';
import { decrementStockForSale } from './stockService.js';
import { recordAudit } from './auditService.js';
import { getSettings } from './settingsService.js';

function computeTotals(
  items: { quantity: number; unitPrice: number }[],
  discount: number,
  tradeInValue: number = 0
) {
  const subtotal = items.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0);
  const total = Math.max(0, subtotal - discount - tradeInValue);
  return { subtotal, total };
}

export async function listParkedSales(employeeId: string) {
  return prisma.sale.findMany({
    where: { status: 'PARKED', employeeId },
    include: {
      items: { include: { product: true } },
      customer: true,
      warrantyPeriod: true,
      tradeIns: true,
    },
    orderBy: { updatedAt: 'desc' },
    take: 5,
  });
}

export async function getSale(id: string) {
  const sale = await prisma.sale.findUnique({
    where: { id },
    include: {
      items: { include: { product: true } },
      payments: true,
      customer: true,
      warrantyPeriod: true,
      tradeIns: true,
    },
  });
  if (!sale) throw new HttpError(404, 'Sale not found');
  return sale;
}

async function resolveItemWarranty(
  item: { productId: string; warrantyPeriodId?: string | null; warrantyDurationDays?: number | null },
  saleWarrantyPeriodId?: string | null
) {
  let wpId = item.warrantyPeriodId || saleWarrantyPeriodId || null;
  let durationDays = item.warrantyDurationDays || null;

  if (wpId && !durationDays) {
    const wp = await prisma.warrantyPeriod.findUnique({ where: { id: wpId } });
    if (wp) durationDays = wp.durationDays;
  } else if (!wpId && !durationDays) {
    // Check product default warranty
    const prod = await prisma.product.findUnique({
      where: { id: item.productId },
      include: { warrantyPeriod: true },
    });
    if (prod?.warrantyDurationDays) {
      durationDays = prod.warrantyDurationDays;
    } else if (prod?.warrantyPeriod) {
      wpId = prod.warrantyPeriod.id;
      durationDays = prod.warrantyPeriod.durationDays;
    }
  }

  let expiresAt: Date | null = null;
  if (durationDays) {
    expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + durationDays);
  }

  return {
    warrantyPeriodId: wpId,
    warrantyDurationDays: durationDays,
    warrantyExpiresAt: expiresAt,
  };
}

export async function createSale(input: SaleCreateInput, employeeId: string) {
  let tradeInValue = 0;
  if (input.tradeInId) {
    const tradeIn = await prisma.tradeIn.findUnique({ where: { id: input.tradeInId } });
    if (tradeIn) tradeInValue = Number(tradeIn.tradeInValue);
  }

  const { subtotal, total } = computeTotals(input.items, input.discount, tradeInValue);

  // Compute warranty expiration if warranty period selected
  let warrantyExpiresAt: Date | null = null;
  if (input.warrantyPeriodId) {
    const wp = await prisma.warrantyPeriod.findUnique({ where: { id: input.warrantyPeriodId } });
    if (wp) {
      warrantyExpiresAt = new Date();
      warrantyExpiresAt.setDate(warrantyExpiresAt.getDate() + wp.durationDays);
    }
  }

  const discountPercent = subtotal > 0 ? (input.discount / subtotal) * 100 : input.discountPercent || 0;

  // Resolve warranty per product line item
  const resolvedItems: any[] = [];
  for (const i of input.items) {
    const itemWarranty = await resolveItemWarranty(i, input.warrantyPeriodId);
    resolvedItems.push({
      productId: i.productId,
      serializedItemId: i.serializedItemId ?? undefined,
      quantity: i.quantity,
      unitPrice: i.unitPrice,
      lineTotal: i.quantity * i.unitPrice,
      priceType: (i.priceType as any) || 'RETAIL',
      warrantyPeriodId: itemWarranty.warrantyPeriodId,
      warrantyDurationDays: itemWarranty.warrantyDurationDays,
      warrantyExpiresAt: itemWarranty.warrantyExpiresAt,
    });
  }

  const sale = await prisma.sale.create({
    data: {
      customerId: input.customerId ?? undefined,
      employeeId,
      status: input.status,
      discount: input.discount,
      discountPercent,
      subtotal,
      total,
      warrantyPeriodId: input.warrantyPeriodId ?? undefined,
      warrantyExpiresAt,
      items: {
        create: resolvedItems,
      },
    },
    include: { items: { include: { warrantyPeriod: true } }, warrantyPeriod: true },
  });

  if (input.tradeInId) {
    await prisma.tradeIn.update({
      where: { id: input.tradeInId },
      data: { saleId: sale.id, status: 'ADJUSTED' },
    });
  }

  return sale;
}

/** Autosave: replaces the sale's line items and recomputes totals in one debounced write. */
export async function updateSaleItems(
  saleId: string,
  input: Pick<SaleCreateInput, 'items' | 'discount' | 'customerId' | 'warrantyPeriodId' | 'tradeInId'>
) {
  const sale = await getSale(saleId);
  if (sale.status !== 'PARKED') throw new HttpError(409, 'Only parked sales can be edited');

  let tradeInValue = 0;
  if (input.tradeInId) {
    const tradeIn = await prisma.tradeIn.findUnique({ where: { id: input.tradeInId } });
    if (tradeIn) tradeInValue = Number(tradeIn.tradeInValue);
  }

  const { subtotal, total } = computeTotals(input.items, input.discount, tradeInValue);
  const discountPercent = subtotal > 0 ? (input.discount / subtotal) * 100 : 0;

  let warrantyExpiresAt: Date | null = null;
  if (input.warrantyPeriodId) {
    const wp = await prisma.warrantyPeriod.findUnique({ where: { id: input.warrantyPeriodId } });
    if (wp) {
      warrantyExpiresAt = new Date();
      warrantyExpiresAt.setDate(warrantyExpiresAt.getDate() + wp.durationDays);
    }
  }

  // Resolve warranty per product line item
  const resolvedItems: any[] = [];

  for (const i of input.items) {
    const itemWarranty = await resolveItemWarranty(i, input.warrantyPeriodId);
    resolvedItems.push({
      productId: i.productId,
      serializedItemId: i.serializedItemId ?? undefined,
      quantity: i.quantity,
      unitPrice: i.unitPrice,
      lineTotal: i.quantity * i.unitPrice,
      priceType: (i.priceType as any) || 'RETAIL',
      warrantyPeriodId: itemWarranty.warrantyPeriodId,
      warrantyDurationDays: itemWarranty.warrantyDurationDays,
      warrantyExpiresAt: itemWarranty.warrantyExpiresAt,
    });
  }

  return prisma.$transaction(async (tx) => {
    await tx.saleItem.deleteMany({ where: { saleId } });
    const updated = await tx.sale.update({
      where: { id: saleId },
      data: {
        customerId: input.customerId ?? undefined,
        discount: input.discount,
        discountPercent,
        subtotal,
        total,
        warrantyPeriodId: input.warrantyPeriodId ?? undefined,
        warrantyExpiresAt,
        items: {
          create: resolvedItems,
        },
      },
      include: { items: { include: { warrantyPeriod: true } }, warrantyPeriod: true },
    });

    if (input.tradeInId) {
      await tx.tradeIn.update({
        where: { id: input.tradeInId },
        data: { saleId, status: 'ADJUSTED' },
      });
    }

    return updated;
  });
}


export async function completeSale(saleId: string, employeeId: string, paymentAmount: number, method: string) {
  const sale = await getSale(saleId);
  if (sale.status !== 'PARKED') throw new HttpError(409, 'Sale already finalized');

  const settings = await getSettings();
  const discountPercent = (Number(sale.discount) / Math.max(1, Number(sale.subtotal))) * 100;

  const completed = await prisma.$transaction(async (tx) => {
    for (const item of sale.items) {
      await decrementStockForSale(tx, item.productId, item.quantity, employeeId, item.id, item.serializedItemId);
    }
    await tx.payment.create({
      data: { saleId, amount: paymentAmount, method: method as never },
    });
    return tx.sale.update({
      where: { id: saleId },
      data: { status: 'COMPLETED' },
      include: { items: true, payments: true, customer: true, warrantyPeriod: true },
    });
  });

  if (discountPercent > Number(settings.discountLimitPercent)) {
    await recordAudit({
      employeeId,
      action: 'DISCOUNT_OVER_LIMIT',
      entity: 'Sale',
      entityId: saleId,
      after: { discountPercent, limit: Number(settings.discountLimitPercent) },
    });
  }

  return completed;
}

export async function voidSale(saleId: string, employeeId: string) {
  const sale = await getSale(saleId);
  const voided = await prisma.sale.update({ where: { id: saleId }, data: { status: 'VOID' } });
  await recordAudit({
    employeeId,
    action: 'VOID_SALE',
    entity: 'Sale',
    entityId: saleId,
    before: sale,
    after: voided,
  });
  return voided;
}

