import { prisma } from '../lib/prisma.js';
import { HttpError } from '../middleware/errorHandler.js';
import type { OutsourcedRepairInput } from '@pos/shared';

export async function listOutsourcedRepairs(status?: string) {
  const where: any = {};
  if (status && status !== 'ALL') where.status = status as any;

  return prisma.outsourcedRepair.findMany({
    where,
    include: {
      repairTicket: {
        include: { customer: true },
      },
    },
    orderBy: { sentDate: 'desc' },
  });
}

export async function createOutsourcedRepair(input: OutsourcedRepairInput) {
  const ticket = await prisma.repairTicket.findUnique({ where: { id: input.repairTicketId } });
  if (!ticket) throw new HttpError(404, 'Repair ticket not found');

  return prisma.outsourcedRepair.upsert({
    where: { repairTicketId: input.repairTicketId },
    create: {
      repairTicketId: input.repairTicketId,
      outsourcedTo: input.outsourcedTo,
      sentDate: input.sentDate ? new Date(input.sentDate) : new Date(),
      expectedReturnDate: input.expectedReturnDate ? new Date(input.expectedReturnDate) : null,
      status: input.status,
      reminder: input.reminder || null,
      notes: input.notes || null,
    },
    update: {
      outsourcedTo: input.outsourcedTo,
      expectedReturnDate: input.expectedReturnDate ? new Date(input.expectedReturnDate) : null,
      status: input.status,
      reminder: input.reminder || null,
      notes: input.notes || null,
    },
    include: { repairTicket: { include: { customer: true } } },
  });
}

export async function updateOutsourcedRepair(
  id: string,
  input: Partial<OutsourcedRepairInput>
) {
  const data: any = { ...input };
  if (input.sentDate) data.sentDate = new Date(input.sentDate);
  if (input.expectedReturnDate) data.expectedReturnDate = new Date(input.expectedReturnDate);

  return prisma.outsourcedRepair.update({
    where: { id },
    data,
    include: { repairTicket: { include: { customer: true } } },
  });
}
