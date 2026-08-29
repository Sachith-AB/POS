import type { SaleCreateInput } from '@pos/shared';
import { prisma } from '../lib/prisma.js';
import { HttpError } from '../middleware/errorHandler.js';
import { decrementStockForSale } from './stockService.js';
import { recordAudit } from './auditService.js';
import { getSettings } from './settingsService.js';

function computeTotals(items: { quantity: number; unitPrice: number }[], discount: number) {
  const subtotal = items.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0);
  const total = Math.max(0, subtotal - discount);
  return { subtotal, total };
}

export async function listParkedSales(employeeId: string) {
  return prisma.sale.findMany({
    where: { status: 'PARKED', employeeId },
    include: { items: { include: { product: true } }, customer: true },
    orderBy: { updatedAt: 'desc' },
    take: 5,
  });
}

export async function getSale(id: string) {
  const sale = await prisma.sale.findUnique({
    where: { id },
    include: { items: { include: { product: true } }, payments: true, customer: true },
  });
  if (!sale) throw new HttpError(404, 'Sale not found');
  return sale;
}

export async function createSale(input: SaleCreateInput, employeeId: string) {
  const { subtotal, total } = computeTotals(input.items, input.discount);
  return prisma.sale.create({
    data: {
      customerId: input.customerId ?? undefined,
      employeeId,
      status: input.status,
      discount: input.discount,
      subtotal,
      total,
      items: {
        create: input.items.map((i) => ({
          productId: i.productId,
          serializedItemId: i.serializedItemId ?? undefined,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
          lineTotal: i.quantity * i.unitPrice,
        })),
      },
    },
    include: { items: true },
  });
}

/** Autosave: replaces the sale's line items and recomputes totals in one debounced write. */
export async function updateSaleItems(
  saleId: string,
  input: Pick<SaleCreateInput, 'items' | 'discount' | 'customerId'>
) {
  const sale = await getSale(saleId);
  if (sale.status !== 'PARKED') throw new HttpError(409, 'Only parked sales can be edited');

  const { subtotal, total } = computeTotals(input.items, input.discount);
  return prisma.$transaction(async (tx) => {
    await tx.saleItem.deleteMany({ where: { saleId } });
    return tx.sale.update({
      where: { id: saleId },
      data: {
        customerId: input.customerId ?? undefined,
        discount: input.discount,
        subtotal,
        total,
        items: {
          create: input.items.map((i) => ({
            productId: i.productId,
            serializedItemId: i.serializedItemId ?? undefined,
            quantity: i.quantity,
            unitPrice: i.unitPrice,
            lineTotal: i.quantity * i.unitPrice,
          })),
        },
      },
      include: { items: true },
    });
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
    return tx.sale.update({ where: { id: saleId }, data: { status: 'COMPLETED' } });
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
