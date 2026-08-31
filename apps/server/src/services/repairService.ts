import { prisma } from '../lib/prisma.js';
import { HttpError } from '../middleware/errorHandler.js';
import { sendSms } from './smsService.js';
import { recordAudit } from './auditService.js';
import type { RepairTicketCreateInput, RepairTicketUpdateInput } from '@pos/shared';

export async function listRepairTickets(filters: {
  status?: string;
  search?: string;
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

  if (filters.search) {
    const search = filters.search.trim();
    where.OR = [
      { ticketNumber: { contains: search, mode: 'insensitive' } },
      { deviceInfo: { contains: search, mode: 'insensitive' } },
      { issue: { contains: search, mode: 'insensitive' } },
      {
        customer: {
          OR: [
            { phone: { contains: search, mode: 'insensitive' } },
            { name: { contains: search, mode: 'insensitive' } },
          ],
        },
      },
    ];
  }

  const [items, total] = await prisma.$transaction([
    prisma.repairTicket.findMany({
      where,
      include: { customer: true },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.repairTicket.count({ where }),
  ]);

  return { items, total, page, limit, pages: Math.ceil(total / limit) };
}

export async function getRepairTicket(id: string) {
  const ticket = await prisma.repairTicket.findUnique({
    where: { id },
    include: { customer: true },
  });
  if (!ticket) throw new HttpError(404, 'Repair ticket not found');
  return ticket;
}

export async function createRepairTicket(input: RepairTicketCreateInput, employeeId: string) {
  // Upsert customer by phone
  let customer = await prisma.customer.findUnique({ where: { phone: input.phone } });
  if (!customer) {
    customer = await prisma.customer.create({
      data: {
        phone: input.phone,
        name: input.customerName || null,
      },
    });
  } else if (input.customerName && !customer.name) {
    customer = await prisma.customer.update({
      where: { id: customer.id },
      data: { name: input.customerName },
    });
  }

  // Generate unique ticket number RPR-YYYYMMDD-NNNN
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const rand = Math.floor(1000 + Math.random() * 9000);
  const ticketNumber = `RPR-${dateStr}-${rand}`;

  const ticket = await prisma.repairTicket.create({
    data: {
      ticketNumber,
      customerId: customer.id,
      deviceInfo: input.deviceInfo,
      issue: input.issue,
      status: 'RECEIVED',
    },
    include: { customer: true },
  });

  await recordAudit({
    employeeId,
    action: 'CREATE_REPAIR_TICKET',
    entity: 'RepairTicket',
    entityId: ticket.id,
    after: ticket,
  });

  return ticket;
}

export async function updateRepairTicket(
  id: string,
  input: RepairTicketUpdateInput,
  employeeId: string
) {
  const ticket = await getRepairTicket(id);

  const data: any = {};
  if (input.status !== undefined) data.status = input.status;
  if (input.estimate !== undefined) data.estimate = input.estimate;
  if (input.partsJson !== undefined) data.partsJson = input.partsJson as any;

  const updated = await prisma.repairTicket.update({
    where: { id },
    data,
    include: { customer: true },
  });

  await recordAudit({
    employeeId,
    action: 'UPDATE_REPAIR_TICKET',
    entity: 'RepairTicket',
    entityId: id,
    before: ticket,
    after: updated,
  });

  // If status transitions to REPAIRED, send notification to customer
  if (input.status === 'REPAIRED' && ticket.status !== 'REPAIRED') {
    const phone = updated.customer.phone;
    const msg = `Your device (${updated.deviceInfo}) is repaired and ready for collection. Ticket: ${updated.ticketNumber}. Total: Rs ${updated.estimate ? Number(updated.estimate).toFixed(2) : 'TBD'}`;
    
    // We run this in the background asynchronously so it doesn't block response
    sendSms(phone, msg).catch((err) => {
      console.error(`Failed to send repair complete SMS:`, err);
    });
  }

  return updated;
}
