import { prisma } from '../lib/prisma.js';
import { HttpError } from '../middleware/errorHandler.js';
import type { SupplierInput, SupplierTransactionInput } from '@pos/shared';

export async function listSuppliers(search?: string) {
  const where: any = {};
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { phone: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
    ];
  }

  return prisma.supplier.findMany({
    where,
    include: {
      _count: {
        select: { transactions: true, returns: true, stockMovements: true },
      },
    },
    orderBy: { name: 'asc' },
  });
}

export async function getSupplier(id: string) {
  const supplier = await prisma.supplier.findUnique({
    where: { id },
    include: {
      transactions: {
        orderBy: { createdAt: 'desc' },
      },
      returns: {
        include: { product: true },
        orderBy: { createdAt: 'desc' },
      },
      stockMovements: {
        include: { product: true },
        orderBy: { createdAt: 'desc' },
        take: 20,
      },
    },
  });

  if (!supplier) throw new HttpError(404, 'Supplier not found');
  return supplier;
}

export async function createSupplier(input: SupplierInput) {
  return prisma.supplier.create({
    data: input,
  });
}

export async function updateSupplier(id: string, input: Partial<SupplierInput>) {
  return prisma.supplier.update({
    where: { id },
    data: input,
  });
}

export async function recordSupplierTransaction(input: SupplierTransactionInput) {
  const supplier = await prisma.supplier.findUnique({ where: { id: input.supplierId } });
  if (!supplier) throw new HttpError(404, 'Supplier not found');

  return prisma.$transaction(async (tx) => {
    const generatedRef =
      input.reference?.trim() ||
      `${input.type === 'PAYMENT' ? 'PAY' : input.type === 'PURCHASE' ? 'PUR' : 'REF'}-${Date.now().toString().slice(-6)}-${Math.floor(1000 + Math.random() * 9000)}`;

    const txRecord = await tx.supplierTransaction.create({
      data: {
        supplierId: input.supplierId,
        type: input.type,
        amount: input.amount,
        reference: generatedRef,
        notes: input.notes || null,
      },
    });

    let payableDelta = 0;
    let paidDelta = 0;

    if (input.type === 'PURCHASE') {
      // Credit purchase increases total payable and outstanding
      payableDelta = input.amount;
    } else if (input.type === 'PAYMENT') {
      // Payment increases paid amount and decreases outstanding
      paidDelta = input.amount;
    } else if (input.type === 'RETURN_CREDIT') {
      // Return credit reduces total payable and outstanding
      payableDelta = -input.amount;
    }

    const updatedTotalPayable = Math.max(0, Number(supplier.totalPayable) + payableDelta);
    const updatedPaidAmount = Math.max(0, Number(supplier.paidAmount) + paidDelta);
    const updatedOutstanding = Math.max(0, updatedTotalPayable - updatedPaidAmount);

    const updatedSupplier = await tx.supplier.update({
      where: { id: input.supplierId },
      data: {
        totalPayable: updatedTotalPayable,
        paidAmount: updatedPaidAmount,
        outstandingBalance: updatedOutstanding,
      },
    });

    return { transaction: txRecord, supplier: updatedSupplier };
  });
}

export async function deleteSupplier(id: string) {
  await getSupplier(id);

  const returnsCount = await prisma.supplierReturn.count({
    where: { supplierId: id },
  });
  if (returnsCount > 0) {
    throw new HttpError(
      400,
      'Cannot delete supplier because there are returns recorded for this supplier.'
    );
  }

  // Detach supplier from stock movements so history is preserved without FK violations
  await prisma.stockMovement.updateMany({
    where: { supplierId: id },
    data: { supplierId: null },
  });

  await prisma.$transaction([
    prisma.supplierTransaction.deleteMany({ where: { supplierId: id } }),
    prisma.supplier.delete({ where: { id } }),
  ]);

  return { success: true, id };
}

export async function listAllSupplierTransactions(params: {
  supplierId?: string;
  type?: string;
  search?: string;
  from?: string;
  to?: string;
  limit?: number;
  offset?: number;
} = {}) {
  const { supplierId, type, search, from, to, limit = 100, offset = 0 } = params;
  const where: any = {};

  if (supplierId && supplierId !== 'ALL') {
    where.supplierId = supplierId;
  }
  if (type && type !== 'ALL') {
    where.type = type;
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
      { reference: { contains: search, mode: 'insensitive' } },
      { notes: { contains: search, mode: 'insensitive' } },
      { supplier: { name: { contains: search, mode: 'insensitive' } } },
    ];
  }

  const [items, total] = await Promise.all([
    prisma.supplierTransaction.findMany({
      where,
      include: { supplier: true },
      orderBy: { createdAt: 'desc' },
      take: Math.min(limit, 200),
      skip: offset,
    }),
    prisma.supplierTransaction.count({ where }),
  ]);

  return { items, total };
}
