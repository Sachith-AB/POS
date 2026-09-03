import { prisma } from '../lib/prisma.js';
import { HttpError } from '../middleware/errorHandler.js';
import type { InstallmentPlanCreateInput } from '@pos/shared';
import { generateAgreementCode } from './agreementBarcodeService.js';
import { executeDefaultActionsForOverduePlan } from './defaultActionService.js';

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
  const plan = await prisma.installmentPlan.findFirst({
    where: {
      OR: [{ id }, { agreementBarcode: id }],
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

  const principal = Number(sale.total) - Number(input.downPayment);
  if (principal <= 0) {
    throw new HttpError(400, 'Down payment covers the entire bill. Installment plan not required.');
  }

  // Calculate Interest (Q7)
  const interestMethod = input.interestMethod || 'PERCENTAGE';
  const interestValue = input.interestValue || 0;
  let interestAmount = 0;

  if (interestMethod === 'PERCENTAGE') {
    interestAmount = Math.round(((principal * interestValue) / 100) * 100) / 100;
  } else {
    interestAmount = interestValue;
  }

  const totalPayable = principal + interestAmount;
  const remainingBalance = totalPayable;
  const downPaymentPercent = Number(sale.total) > 0 ? (Number(input.downPayment) / Number(sale.total)) * 100 : 0;

  // Generate scheduleJson array
  const schedule = [];
  const installmentAmount = Math.round((totalPayable / input.numberOfInstallments) * 100) / 100;

  for (let i = 0; i < input.numberOfInstallments; i++) {
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + input.intervalDays * (i + 1));

    // For the last installment, adjust for any rounding errors
    const amt =
      i === input.numberOfInstallments - 1
        ? Math.round((totalPayable - installmentAmount * (input.numberOfInstallments - 1)) * 100) / 100
        : installmentAmount;

    schedule.push({
      installmentNumber: i + 1,
      dueDate: dueDate.toISOString(),
      amount: amt,
      paid: false,
      paidAmount: 0,
      paidAt: null,
      lateFee: 0,
    });
  }

  // Generate unique agreement barcode (Q10)
  const agreementBarcode = generateAgreementCode();

  const plan = await prisma.installmentPlan.create({
    data: {
      saleId: input.saleId,
      remainingBalance,
      totalPayable,
      downPaymentPercent,
      interestMethod,
      interestValue,
      interestAmount,
      agreementBarcode,
      status: 'ACTIVE',
      scheduleJson: schedule as any,
      guarantorName: input.guarantorName || null,
      guarantorNic: input.guarantorNic || null,
      guarantorPhone: input.guarantorPhone || null,
      guarantorAddress: input.guarantorAddress || null,
      guarantorPhotoUrl: input.guarantorPhotoUrl || null,
      guarantorConsentGiven: input.guarantorConsentGiven ?? false,
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
  // Q12: Installment payment methods restricted strictly to Cash and Bank Transfer
  if (method !== 'CASH' && method !== 'BANK_TRANSFER') {
    throw new HttpError(400, 'Installment payments only support Cash and Bank Transfer');
  }

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
      const remainingOnInst = (inst.amount + (inst.lateFee || 0)) - (inst.paidAmount || 0);
      if (amountLeft >= remainingOnInst) {
        inst.paid = true;
        inst.paidAt = new Date().toISOString();
        inst.paidAmount = inst.amount + (inst.lateFee || 0);
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
      where: { id: plan.id },
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

/** Check and mark active plans as overdue, apply late fee, and trigger default actions (Q8, Q11). */
export async function checkOverduePlans() {
  const activePlans = await prisma.installmentPlan.findMany({
    where: { status: { in: ['ACTIVE', 'OVERDUE'] } },
    include: { sale: { include: { customer: true } } },
  });

  const settings = await prisma.shopSettings.findUnique({ where: { id: 'singleton' } });
  const lateFeeMethod = settings?.defaultLateFeeMethod || 'FIXED_AMOUNT';
  const lateFeeValue = Number(settings?.defaultLateFeeValue || 0);

  const now = new Date();
  let updatedCount = 0;

  for (const plan of activePlans) {
    const schedule = Array.isArray(plan.scheduleJson)
      ? [...plan.scheduleJson]
      : JSON.parse(plan.scheduleJson as string);

    let hasOverdueInstallment = false;
    let maxDaysOverdue = 0;
    let lateFeeAddedTotal = 0;

    for (const inst of schedule) {
      if (!inst.paid && new Date(inst.dueDate) < now) {
        hasOverdueInstallment = true;
        const days = Math.floor((now.getTime() - new Date(inst.dueDate).getTime()) / (1000 * 60 * 60 * 24));
        if (days > maxDaysOverdue) maxDaysOverdue = days;

        // Apply late fee if not already applied
        if (!inst.lateFeeApplied && lateFeeValue > 0) {
          const fee =
            lateFeeMethod === 'PERCENTAGE'
              ? Math.round(((inst.amount * lateFeeValue) / 100) * 100) / 100
              : lateFeeValue;

          inst.lateFee = (inst.lateFee || 0) + fee;
          inst.lateFeeApplied = true;
          lateFeeAddedTotal += fee;
        }
      }
    }

    if (hasOverdueInstallment) {
      const newRemaining = Number(plan.remainingBalance) + lateFeeAddedTotal;

      await prisma.installmentPlan.update({
        where: { id: plan.id },
        data: {
          status: 'OVERDUE',
          remainingBalance: newRemaining,
          lateFeeAmount: Number(plan.lateFeeAmount) + lateFeeAddedTotal,
          scheduleJson: schedule as any,
        },
      });

      // Trigger configurable default actions (Q11)
      await executeDefaultActionsForOverduePlan(plan.id, maxDaysOverdue);

      updatedCount++;
    }
  }

  return updatedCount;
}

