import { prisma } from '../lib/prisma.js';
import { sendSms } from './smsService.js';

export async function checkUncollectedRepairs(): Promise<number> {
  const settings = await prisma.shopSettings.findUnique({ where: { id: 'singleton' } });
  const thresholdDays = settings?.uncollectedRepairDays ?? 30;

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - thresholdDays);

  // Find repairs that reached REPAIRED status before cutoff and are not DELIVERED or CANCELLED
  const uncollectedTickets = await prisma.repairTicket.findMany({
    where: {
      status: 'REPAIRED',
      updatedAt: { lte: cutoff },
    },
    include: { customer: true },
  });

  let sentCount = 0;
  for (const ticket of uncollectedTickets) {
    const daysReady = Math.floor(
      (Date.now() - new Date(ticket.updatedAt).getTime()) / (1000 * 60 * 60 * 24)
    );

    const message = `Reminder: Your repaired device (${ticket.deviceInfo}) has been ready for collection for ${daysReady} days. Ticket: ${ticket.ticketNumber}. Please collect it from K Zero Mobile.`;

    try {
      await sendSms(ticket.customer.phone, message);
      sentCount++;
    } catch (err) {
      console.error(`Failed to send uncollected reminder for ticket ${ticket.ticketNumber}:`, err);
    }
  }

  return sentCount;
}
