import { prisma } from '../lib/prisma.js';
import { HttpError } from '../middleware/errorHandler.js';
import type { WarrantyPeriodInput } from '@pos/shared';

export async function listWarrantyPeriods(filter?: { appliesToSales?: boolean; appliesToRepairs?: boolean }) {
  const where: any = {};
  if (filter?.appliesToSales !== undefined) where.appliesToSales = filter.appliesToSales;
  if (filter?.appliesToRepairs !== undefined) where.appliesToRepairs = filter.appliesToRepairs;

  return prisma.warrantyPeriod.findMany({
    where,
    orderBy: { durationDays: 'asc' },
  });
}

export async function createWarrantyPeriod(input: WarrantyPeriodInput) {
  return prisma.warrantyPeriod.create({
    data: input,
  });
}

export async function updateWarrantyPeriod(id: string, input: Partial<WarrantyPeriodInput>) {
  return prisma.warrantyPeriod.update({
    where: { id },
    data: input,
  });
}

export async function deleteWarrantyPeriod(id: string) {
  return prisma.warrantyPeriod.delete({ where: { id } });
}

/**
 * Checks warranty status for a sale or product serial.
 * Evaluates both:
 * 1. The explicit warranty period (if attached to sale)
 * 2. The 3-day automatic support warranty rule (Q4: within first 3 days after purchase)
 */
export async function checkWarrantyStatus(saleId: string) {
  const sale = await prisma.sale.findUnique({
    where: { id: saleId },
    include: {
      warrantyPeriod: true,
      items: { include: { product: true } },
    },
  });

  if (!sale) throw new HttpError(404, 'Sale not found');

  const now = new Date();
  const settings = await prisma.shopSettings.findUnique({ where: { id: 'singleton' } });
  const firstDaysRule = settings?.firstDaysWarrantyDays ?? 3;

  // 1. Check first 3 days warranty support rule
  const saleDate = new Date(sale.createdAt);
  const diffDays = (now.getTime() - saleDate.getTime()) / (1000 * 60 * 60 * 24);
  const isWithinFirst3Days = diffDays <= firstDaysRule;

  // 2. Check regular warranty
  let isWithinRegularWarranty = false;
  let regularExpiresAt: Date | null = null;

  if (sale.warrantyExpiresAt) {
    regularExpiresAt = new Date(sale.warrantyExpiresAt);
    isWithinRegularWarranty = now <= regularExpiresAt;
  } else if (sale.warrantyPeriod) {
    regularExpiresAt = new Date(sale.createdAt);
    regularExpiresAt.setDate(regularExpiresAt.getDate() + sale.warrantyPeriod.durationDays);
    isWithinRegularWarranty = now <= regularExpiresAt;
  }

  const isCovered = isWithinFirst3Days || isWithinRegularWarranty;
  const coverageReason = isWithinFirst3Days
    ? `Covered under First ${firstDaysRule} Days Warranty/Support Rule`
    : isWithinRegularWarranty
    ? `Covered under standard ${sale.warrantyPeriod?.label ?? 'warranty'}`
    : 'Warranty expired or not applicable';

  return {
    saleId: sale.id,
    isCovered,
    isWithinFirst3Days,
    isWithinRegularWarranty,
    coverageReason,
    purchaseDate: sale.createdAt,
    firstDaysCoverageExpiresAt: new Date(saleDate.getTime() + firstDaysRule * 24 * 60 * 60 * 1000),
    warrantyExpiresAt: regularExpiresAt,
    warrantyPeriod: sale.warrantyPeriod,
  };
}
