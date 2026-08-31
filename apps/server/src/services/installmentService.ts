import { prisma } from '../lib/prisma.js';
import { HttpError } from '../middleware/errorHandler.js';
import type { InstallmentPlanCreateInput } from '@pos/shared';

export async function listInstallmentPlans(filters: {
  status?: string;
  page?: number;
  limit?: number;
}) {
  const page = Number(filters.page || 1);
  const limit = Number(filters.limit || 50);
  const skip = (page - 1) * limit;

  const where: any = {};
  if (filters.status && filters.status !== 'ALL') {
    where.status = filters.status;
  }

  const [items, total] = await prisma.$transaction([
    prisma.installmentPlan.findMany({
      where,
      include: {
        sale: {
          include: {
            customer: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.installmentPlan.count({ where }),
  ]);

  return { items, total, page, limit, pages: Math.ceil(total / limit) };
}

export async function getInstallmentPlan(id: string) {
  const plan = await prisma.installmentPlan.findUnique({
    where: { id },
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
  if (!plan) throw new HttpError(404, 'Installment plan not found');
  return plan;
}

export async function createInstallmentPlan(input: InstallmentPlanCreateInput) {
  const sale = await prisma.sale.findUnique({
    where: { id: input.saleId },
    include: { payments: true },
  });

  if (!sale) throw new HttpError(404, 'Sale not found');
  if (sale.status !== 'COMPLETED') throw new HttpError(400, 'Sale must be completed before starting installment plan');

  // Verify that an installment plan doesn't already exist for this sale
  const existing = await prisma.installmentPlan.findUnique({ where: { saleId: input.saleId } });
  if (existing) throw new HttpError(409, 'An installment plan already exists for this sale');

  const remainingBalance = Number(sale.total) - Number(input.downPayment);
  if (remainingBalance <= 0) {
    throw new HttpError(400, 'Down payment covers the entire bill. Installment plan not required.');
  }

  // Generate scheduleJson array
  const schedule = [];
  const installmentAmount = Math.round((remainingBalance / input.numberOfInstallments) * 100) / 100;
  
  for (let i = 0; i < input.numberOfInstallments; i++) {
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + input.intervalDays * (i + 1));
    
    // For the last installment, adjust for any rounding errors
    const amt = i === input.numberOfInstallments - 1 
      ? Math.round((remainingBalance - (installmentAmount * (input.numberOfInstallments - 1))) * 100) / 100
      : installmentAmount;

    schedule.push({
      installmentNumber: i + 1,
      dueDate: dueDate.toISOString(),
      amount: amt,
      paid: false,
      paidAt: null,
    });
  }

  const plan = await prisma.installmentPlan.create({
    data: {
      saleId: input.saleId,
      remainingBalance,
      status: 'ACTIVE',
      scheduleJson: schedule as any,
      guarantorName: input.guarantorName || null,
      guarantorNic: input.guarantorNic || null,
      guarantorPhone: input.guarantorPhone || null,
      guarantorAddress: input.guarantorAddress || null,
    },
    include: {
      sale: {
        include: {
          customer: true,
        },
      },
    },
  });

  return plan;
}

export async function recordInstallmentPayment(
  planId: string,
  amount: number,
  method: string
) {
  const plan = await getInstallmentPlan(planId);
  if (plan.status === 'COMPLETE') {
    throw new HttpError(400, 'This installment plan is already fully paid');
  }

  const newBalance = Math.max(0, Number(plan.remainingBalance) - amount);
  const isFullyPaid = newBalance === 0;

  // Process schedule updates
  const schedule = Array.isArray(plan.scheduleJson)
    ? [...plan.scheduleJson]
    : JSON.parse(plan.scheduleJson as string);

  let amountLeft = amount;
  for (const inst of schedule) {
    if (!inst.paid && amountLeft > 0) {
      const remainingOnInst = inst.amount - (inst.paidAmount || 0);
      if (amountLeft >= remainingOnInst) {
        inst.paid = true;
        inst.paidAt = new Date().toISOString();
        inst.paidAmount = inst.amount;
        amountLeft -= remainingOnInst;
      } else {
        inst.paidAmount = (inst.paidAmount || 0) + amountLeft;
        amountLeft = 0;
      }
    }
  }

  return prisma.$transaction(async (tx) => {
    // Record payment against the sale
    await tx.payment.create({
      data: {
        saleId: plan.saleId,
        amount,
        method: method as any,
      },
    });

    // Update plan details
    const updated = await tx.installmentPlan.update({
      where: { id: planId },
      data: {
        remainingBalance: newBalance,
        status: isFullyPaid ? 'COMPLETE' : plan.status,
        scheduleJson: schedule as any,
      },
      include: {
        sale: {
          include: {
            customer: true,
            payments: true,
          },
        },
      },
    });

    return updated;
  });
}

/** Check and mark active plans as overdue if they have missed payments. */
export async function checkOverduePlans() {
  const activePlans = await prisma.installmentPlan.findMany({
    where: { status: 'ACTIVE' },
  });

  const now = new Date();
  let updatedCount = 0;

  for (const plan of activePlans) {
    const schedule = Array.isArray(plan.scheduleJson)
      ? plan.scheduleJson
      : JSON.parse(plan.scheduleJson as string);

    // Find if there is any unpaid installment that is past its due date
    const hasOverdueInstallment = schedule.some((inst: any) => {
      return !inst.paid && new Date(inst.dueDate) < now;
    });

    if (hasOverdueInstallment) {
      await prisma.installmentPlan.update({
        where: { id: plan.id },
        data: { status: 'OVERDUE' },
      });
      updatedCount++;
    }
  }

  return updatedCount;
}
