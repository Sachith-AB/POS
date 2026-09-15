import { prisma } from '../lib/prisma.js';
import { HttpError } from '../middleware/errorHandler.js';
import { sendSms } from './smsService.js';
import { recordAudit } from './auditService.js';
import { getSettings } from './settingsService.js';
import { findCustomerByPhone } from './customerService.js';
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

function repairSearchTokens(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').split(' ').filter((token) => token.length >= 2);
}

export async function getRepairPartSuggestions(deviceInfo: string, issue: string) {
  const deviceTokens = repairSearchTokens(deviceInfo);
  const issueTokens = repairSearchTokens(issue);
  const tickets = await prisma.repairTicket.findMany({
    select: { deviceInfo: true, issue: true, partsJson: true },
    orderBy: { updatedAt: 'desc' },
    take: 5000,
  });

  const counts = new Map<string, { count: number; part: any }>();
  for (const ticket of tickets) {
    const ticketDeviceTokens = repairSearchTokens(ticket.deviceInfo);
    const ticketIssueTokens = repairSearchTokens(ticket.issue);
    const deviceScore = deviceTokens.filter((token) => ticketDeviceTokens.includes(token)).length;
    const issueScore = issueTokens.filter((token) => ticketIssueTokens.includes(token)).length;
    if ((deviceTokens.length > 0 && deviceScore === 0) && (issueTokens.length > 0 && issueScore === 0)) continue;

    let parts: any[] = [];
    try {
      parts = Array.isArray(ticket.partsJson)
        ? ticket.partsJson
        : JSON.parse(String(ticket.partsJson || '[]'));
    } catch {
      continue;
    }
    for (const part of parts) {
      if (!part?.name) continue;
      const key = part.productId || String(part.name).trim().toLowerCase();
      const current = counts.get(key);
      counts.set(key, {
        count: (current?.count || 0) + Number(part.quantity || 1),
        part: current?.part || {
          productId: part.productId,
          name: part.name,
          cost: Number(part.cost || 0),
        },
      });
    }
  }

  return Array.from(counts.values())
    .sort((left, right) => right.count - left.count)
    .slice(0, 8)
    .map(({ count, part }) => ({ ...part, usageCount: count }));
}

export async function listRepairIssueTemplates() {
  const settings = await getSettings();
  const defaultTemplates = [
    'Display Damage', 'Battery Issue', 'Charging Problem', 'Speaker Problem', 'Mic Problem',
    'Camera Problem', 'Software Issue', 'Water Damage', 'Power Issue', 'Network Problem',
  ];
  const configured = Array.isArray(settings.repairIssueTemplates)
    ? settings.repairIssueTemplates.filter((item): item is string => typeof item === 'string')
    : [];
  const tickets = await prisma.repairTicket.findMany({
    select: { issue: true },
    orderBy: { createdAt: 'desc' },
    take: 5000,
  });
  const frequencies = new Map<string, { label: string; count: number }>();
  for (const issue of tickets) {
    const label = issue.issue.trim();
    if (!label) continue;
    const key = label.toLowerCase();
    const current = frequencies.get(key);
    frequencies.set(key, { label: current?.label || label, count: (current?.count || 0) + 1 });
  }
  const historical = Array.from(frequencies.values()).sort((a, b) => b.count - a.count).slice(0, 10).map((item) => item.label);
  return Array.from(new Set([...historical, ...configured, ...defaultTemplates])).slice(0, 20);
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

export async function checkRecentCustomerSale(phone: string) {
  const settings = await getSettings();
  const firstDaysRule = settings?.firstDaysWarrantyDays ?? 3;

  const customer = await findCustomerByPhone(phone);

  if (!customer) {
    return { hasRecentSale: false, firstDaysRule };
  }

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - firstDaysRule);

  const recentSale = await prisma.sale.findFirst({
    where: {
      customerId: customer.id,
      status: 'COMPLETED',
      createdAt: { gte: cutoff },
    },
    orderBy: { createdAt: 'desc' },
    include: {
      items: { include: { product: true } },
    },
  });

  return {
    hasRecentSale: !!recentSale,
    sale: recentSale,
    firstDaysRule,
  };
}

export async function createRepairTicket(input: RepairTicketCreateInput, employeeId: string) {
  // Upsert customer by phone
  let customer = await findCustomerByPhone(input.phone);
  if (!customer) {
    await prisma.customer.create({
      data: {
        phone: input.phone,
        name: input.customerName || null,
      },
    });
    customer = await findCustomerByPhone(input.phone);
  } else if (input.customerName && !customer.name) {
    await prisma.customer.update({
      where: { id: customer.id },
      data: { name: input.customerName },
    });
    customer = await findCustomerByPhone(input.phone);
  }

  if (!customer) {
    throw new HttpError(500, 'Unable to load repair customer');
  }

  // Check 3-day warranty support rule (Q4)
  const recentSaleCheck = await checkRecentCustomerSale(input.phone);
  let isThreeDayWarranty = input.isThreeDayWarranty ?? false;
  let warrantySaleId = input.warrantySaleId || null;

  if (input.isThreeDayWarranty === undefined && recentSaleCheck.hasRecentSale) {
    isThreeDayWarranty = true;
    warrantySaleId = recentSaleCheck.sale?.id || null;
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
      isThreeDayWarranty,
      warrantySaleId,
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

  if (ticket.status === 'DELIVERED' && input.status !== undefined && input.status !== 'DELIVERED') {
    throw new HttpError(409, 'Delivered repair tickets are locked');
  }

  const data: any = {};
  if (input.status !== undefined) data.status = input.status;
  if (input.estimate !== undefined) data.estimate = input.estimate;
  if (input.advancePayment !== undefined) data.advancePayment = input.advancePayment;
  if (input.status === 'DELIVERED') {
    data.advancePayment = Number(input.estimate ?? ticket.estimate ?? 0);
  }
  if (input.technicianId !== undefined) data.technicianId = input.technicianId || null;
  if (input.commissionMethod !== undefined) data.commissionMethod = input.commissionMethod;
  if (input.commissionValue !== undefined) data.commissionValue = input.commissionValue;
  if (input.isThreeDayWarranty !== undefined) data.isThreeDayWarranty = input.isThreeDayWarranty;
  if (input.warrantySaleId !== undefined) data.warrantySaleId = input.warrantySaleId;

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

/**
 * Q25: List uncollected repairs sorted by uncollected days (overdue first)
 */
export async function listUncollectedRepairTickets() {
  const settings = await getSettings();
  const thresholdDays = settings.uncollectedRepairDays ?? 30;

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - thresholdDays);

  const tickets = await prisma.repairTicket.findMany({
    where: {
      status: 'REPAIRED',
      updatedAt: { lte: cutoff },
    },
    include: {
      customer: true,
      technician: true,
    },
    orderBy: { updatedAt: 'asc' }, // oldest first = highest uncollected days first
  });

  const now = new Date();
  const items = tickets.map((t) => {
    const uncollectedDays = Math.floor(
      (now.getTime() - new Date(t.updatedAt).getTime()) / (1000 * 60 * 60 * 24)
    );
    return {
      ...t,
      uncollectedDays,
    };
  });

  return {
    thresholdDays,
    total: items.length,
    items,
  };
}

/**
 * Q25: Send SMS reminders to uncollected repair customers
 */
export async function sendUncollectedSmsReminders(ticketIds?: string[]) {
  const settings = await getSettings();
  const thresholdDays = settings.uncollectedRepairDays ?? 30;

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - thresholdDays);

  const where: any = {
    status: 'REPAIRED',
    updatedAt: { lte: cutoff },
  };

  if (ticketIds && ticketIds.length > 0) {
    where.id = { in: ticketIds };
  }

  const tickets = await prisma.repairTicket.findMany({
    where,
    include: { customer: true },
  });

  let sentCount = 0;
  const errors: string[] = [];

  for (const ticket of tickets) {
    const daysReady = Math.floor(
      (Date.now() - new Date(ticket.updatedAt).getTime()) / (1000 * 60 * 60 * 24)
    );

    const message = `Reminder: Your repaired device (${ticket.deviceInfo}) has been ready for collection for ${daysReady} days. Ticket: ${ticket.ticketNumber}. Please collect it from K Zero Mobile.`;

    try {
      await sendSms(ticket.customer.phone, message);
      sentCount++;
    } catch (err: any) {
      console.error(`Failed to send uncollected SMS for ticket ${ticket.ticketNumber}:`, err);
      errors.push(`${ticket.ticketNumber}: ${err.message || 'SMS failed'}`);
    }
  }

  return { sentCount, total: tickets.length, errors };
}

