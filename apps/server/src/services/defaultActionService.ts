import { prisma } from '../lib/prisma.js';
import type { DefaultActionInput } from '@pos/shared';
import { sendSms } from './smsService.js';

export async function listDefaultActions() {
  return prisma.defaultAction.findMany({
    orderBy: { triggerDaysOverdue: 'asc' },
  });
}

export async function createDefaultAction(input: DefaultActionInput) {
  return prisma.defaultAction.create({
    data: input,
  });
}

export async function updateDefaultAction(id: string, input: Partial<DefaultActionInput>) {
  return prisma.defaultAction.update({
    where: { id },
    data: input,
  });
}

export async function deleteDefaultAction(id: string) {
  return prisma.defaultAction.delete({ where: { id } });
}

/**
 * Executes configured default actions on an overdue installment customer.
 */
export async function executeDefaultActionsForOverduePlan(
  planId: string,
  daysOverdue: number
) {
  const plan = await prisma.installmentPlan.findUnique({
    where: { id: planId },
    include: {
      sale: {
        include: { customer: true },
      },
    },
  });

  if (!plan || !plan.sale.customer) return;

  const actions = await prisma.defaultAction.findMany({
    where: {
      isActive: true,
      triggerDaysOverdue: { lte: daysOverdue },
    },
    orderBy: { triggerDaysOverdue: 'asc' },
  });

  const customer = plan.sale.customer;

  for (const action of actions) {
    if (action.actionType === 'BLOCK' && !customer.isBlocked) {
      await prisma.customer.update({
        where: { id: customer.id },
        data: { isBlocked: true },
      });
      console.log(`[DefaultAction] Customer ${customer.phone} marked as BLOCKED (${action.description})`);
    } else if (action.actionType === 'SUSPEND' && !customer.isSuspended) {
      await prisma.customer.update({
        where: { id: customer.id },
        data: { isSuspended: true, isBlocked: true },
      });
      console.log(`[DefaultAction] Customer ${customer.phone} marked as SUSPENDED (${action.description})`);
    } else if (action.actionType === 'WARNING') {
      const msg = `Dear Customer, your installment payment for Agreement ${plan.agreementBarcode || plan.id} is overdue by ${daysOverdue} days. Please pay Rs ${Number(plan.remainingBalance).toFixed(2)} to avoid service restrictions.`;
      sendSms(customer.phone, msg).catch((err) =>
        console.error('[DefaultAction] Failed to send overdue warning SMS:', err)
      );
    }
  }
}
