import { prisma } from '../lib/prisma.js';
import { HttpError } from '../middleware/errorHandler.js';
import { sendSms } from './smsService.js';
import { recordAudit } from './auditService.js';
import { getSettings } from './settingsService.js';
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
      include: {
        customer: true,
        technician: true,
        warrantyPeriod: true,
        outsourcedRepair: true,
      },
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
    include: {
      customer: true,
      technician: true,
      warrantyPeriod: true,
      outsourcedRepair: true,
    },
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

  // Fetch shop settings for defaults (Q24 default technician, commission)
  const settings = await getSettings();
  const technicianId = input.technicianId || settings.defaultTechnicianId || null;
  const commissionMethod = input.commissionMethod || settings.defaultCommissionMethod;
  const commissionValue = input.commissionValue !== undefined ? input.commissionValue : Number(settings.defaultCommissionValue);

  // Warranty handling (Q20)
  let warrantyExpiresAt: Date | null = null;
  if (input.warrantyPeriodId) {
    const wp = await prisma.warrantyPeriod.findUnique({ where: { id: input.warrantyPeriodId } });
    if (wp) {
      warrantyExpiresAt = new Date();
      warrantyExpiresAt.setDate(warrantyExpiresAt.getDate() + wp.durationDays);
    }
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
      technicianId,
      commissionMethod,
      commissionValue,
      advancePayment: input.advancePayment || 0,
      warrantyPeriodId: input.warrantyPeriodId || null,
      warrantyExpiresAt,
    },
    include: {
      customer: true,
      technician: true,
      warrantyPeriod: true,
      outsourcedRepair: true,
    },
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
  if (input.advancePayment !== undefined) data.advancePayment = input.advancePayment;
  if (input.technicianId !== undefined) data.technicianId = input.technicianId || null;
  if (input.commissionMethod !== undefined) data.commissionMethod = input.commissionMethod;
  if (input.commissionValue !== undefined) data.commissionValue = input.commissionValue;

  // Calculate commission amount if estimate and commission are present (Q24)
  const est = Number(input.estimate ?? ticket.estimate ?? 0);
  const cMethod = input.commissionMethod || ticket.commissionMethod || 'PERCENTAGE';
  const cVal = Number(input.commissionValue ?? ticket.commissionValue ?? 0);
  if (est > 0 && cVal > 0) {
    data.commissionAmount =
      cMethod === 'PERCENTAGE'
        ? Math.round(((est * cVal) / 100) * 100) / 100
        : cVal;
  }

  // Warranty updates (Q20)
  if (input.warrantyPeriodId !== undefined) {
    data.warrantyPeriodId = input.warrantyPeriodId || null;
    if (input.warrantyPeriodId) {
      const wp = await prisma.warrantyPeriod.findUnique({ where: { id: input.warrantyPeriodId } });
      if (wp) {
        const exp = new Date();
        exp.setDate(exp.getDate() + wp.durationDays);
        data.warrantyExpiresAt = exp;
      }
    } else {
      data.warrantyExpiresAt = null;
    }
  }

  // Q21: Spare parts inventory deduction
  if (input.partsJson !== undefined) {
    data.partsJson = input.partsJson as any;

    // Detect newly added parts with productId and deduct from stock
    try {
      const newParts = Array.isArray(input.partsJson)
        ? input.partsJson
        : JSON.parse((input.partsJson as string) || '[]');

      const oldParts = Array.isArray(ticket.partsJson)
        ? ticket.partsJson
        : JSON.parse((ticket.partsJson as string) || '[]');

      const oldProductIds = new Set(oldParts.map((p: any) => p.productId).filter(Boolean));

      for (const part of newParts) {
        if (part.productId && !oldProductIds.has(part.productId)) {
          const qty = part.quantity || 1;
          const product = await prisma.product.findUnique({ where: { id: part.productId } });
          if (product && product.quantity >= qty) {
            await prisma.product.update({
              where: { id: part.productId },
              data: { quantity: { decrement: qty } },
            });
            await prisma.stockMovement.create({
              data: {
                productId: part.productId,
                type: 'SALE',
                quantityDelta: -qty,
                invoiceRef: `REPAIR-${ticket.ticketNumber}`,
                employeeId,
              },
            });
            console.log(`[RepairService] Deducted ${qty}x ${product.name} for repair ${ticket.ticketNumber}`);
          }
        }
      }
    } catch (err) {
      console.error('[RepairService] Error deducting spare parts inventory:', err);
    }
  }

  const updated = await prisma.repairTicket.update({
    where: { id },
    data,
    include: {
      customer: true,
      technician: true,
      warrantyPeriod: true,
      outsourcedRepair: true,
    },
  });

  await recordAudit({
    employeeId,
    action: 'UPDATE_REPAIR_TICKET',
    entity: 'RepairTicket',
    entityId: id,
    before: ticket,
    after: updated,
  });

  // If status transitions to REPAIRED, send notification to customer via text.lk (Q27)
  if (input.status === 'REPAIRED' && ticket.status !== 'REPAIRED') {
    const phone = updated.customer.phone;
    const estVal = Number(updated.estimate || 0);
    const advVal = Number(updated.advancePayment || 0);
    const balanceDue = Math.max(0, estVal - advVal);

    let priceDetails = `Estimate: Rs ${estVal.toFixed(2)}`;
    if (advVal > 0) {
      priceDetails += ` | Advance Paid: Rs ${advVal.toFixed(2)} | Remaining Balance: Rs ${balanceDue.toFixed(2)}`;
    }

    const msg = `Dear Customer, your device (${updated.deviceInfo}) is REPAIRED and ready for collection! Ticket: ${updated.ticketNumber}. ${priceDetails}. Thank you for choosing K Zero Mobile.`;

    sendSms(phone, msg).catch((err) => {
      console.error(`Failed to send repair complete SMS via text.lk:`, err);
    });
  }

  return updated;
}

