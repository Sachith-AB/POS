import { prisma } from '../lib/prisma.js';
import { HttpError } from '../middleware/errorHandler.js';
import type { SupplierReturnInput } from '@pos/shared';

export async function listSupplierReturns(supplierId?: string) {
  const where: any = {};
  if (supplierId) where.supplierId = supplierId;

  const returns = await prisma.supplierReturn.findMany({
    where,
    include: {
      supplier: true,
      product: true,
      serializedItem: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  return returns.map((r: any) => ({
    ...r,
    refundOrCreditAmount:
      r.refundOrCreditAmount != null
        ? Number(r.refundOrCreditAmount)
        : Number(r.product?.costPrice || 0) * r.quantity,
  }));
}

export async function createSupplierReturn(input: SupplierReturnInput, employeeId: string) {
  const product = await prisma.product.findUnique({ where: { id: input.productId } });
  if (!product) throw new HttpError(404, 'Product not found');

  if (product.quantity < input.quantity) {
    throw new HttpError(400, `Insufficient stock to return. In stock: ${product.quantity}, requested: ${input.quantity}`);
  }

  const supplier = await prisma.supplier.findUnique({ where: { id: input.supplierId } });
  if (!supplier) throw new HttpError(404, 'Supplier not found');

  return prisma.$transaction(async (tx) => {
    // Determine return credit amount (user specified or based on cost price * qty)
    const refundAmount =
      input.refundOrCreditAmount !== undefined && input.refundOrCreditAmount !== null
        ? Number(input.refundOrCreditAmount)
        : Number(product.costPrice) * input.quantity;

    // 1. Create the return record
    const supplierReturn = await (tx.supplierReturn as any).create({
      data: {
        supplierId: input.supplierId,
        productId: input.productId,
        serializedItemId: input.serializedItemId || null,
        quantity: input.quantity,
        reason: input.reason,
        refundOrCreditAmount: refundAmount,
        notes: input.notes || null,
      },
      include: {
        supplier: true,
        product: true,
      },
    });

    // 2. Deduct inventory correctly
    await tx.product.update({
      where: { id: input.productId },
      data: { quantity: { decrement: input.quantity } },
    });

    // 3. If serialized item, mark return / remove from active stock
    if (input.serializedItemId) {
      await tx.serializedItem.delete({
        where: { id: input.serializedItemId },
      });
    }

    // 4. Record stock movement
    await tx.stockMovement.create({
      data: {
        productId: input.productId,
        supplierId: input.supplierId,
        type: 'RETURN',
        quantityDelta: -input.quantity,
        supplierName: supplier.name,
        invoiceRef: `RETURN-${supplierReturn.id.slice(-6).toUpperCase()}`,
        employeeId,
      },
    });

    // 5. Adjust supplier payable (return credit)
    await tx.supplierTransaction.create({
      data: {
        supplierId: input.supplierId,
        type: 'RETURN_CREDIT',
        amount: refundAmount,
        reference: `RET-${supplierReturn.id.slice(-6)}`,
        notes: `Stock return for ${product.name} (${input.quantity}x) - Reason: ${input.reason}${input.notes ? ` - ${input.notes}` : ''}`,
      },
    });

    const updatedTotalPayable = Math.max(0, Number(supplier.totalPayable) - refundAmount);
    const updatedOutstanding = Math.max(0, updatedTotalPayable - Number(supplier.paidAmount));

    await tx.supplier.update({
      where: { id: input.supplierId },
      data: {
        totalPayable: updatedTotalPayable,
        outstandingBalance: updatedOutstanding,
      },
    });

    return {
      ...supplierReturn,
      refundOrCreditAmount: refundAmount,
    };
  });
}
