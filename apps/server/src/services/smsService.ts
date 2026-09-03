import { prisma } from '../lib/prisma.js';
import { logger } from '../lib/logger.js';

export function normalizeSriLankanPhone(phone: string): string {
  let cleaned = phone.replace(/[^\d+]/g, '');
  if (cleaned.startsWith('+')) {
    cleaned = cleaned.substring(1);
  }
  if (cleaned.startsWith('0')) {
    cleaned = '94' + cleaned.substring(1);
  }
  if (!cleaned.startsWith('94') && cleaned.length === 9) {
    cleaned = '94' + cleaned;
  }
  return cleaned;
}

export async function sendSms(phone: string, message: string): Promise<{ success: boolean; message: string }> {
  // Check settings from database first, then environment variables
  const settings = await prisma.shopSettings.findUnique({ where: { id: 'singleton' } });
  const apiToken = settings?.textlkApiToken || process.env.TEXTLK_API_TOKEN || '';
  const senderId = settings?.textlkSenderId || process.env.TEXTLK_SENDER_ID || 'TextLKDemo';

  const recipient = normalizeSriLankanPhone(phone);
  logger.info('SMS', `Dispatching to ${recipient} (Sender ID: "${senderId}"): "${message}"`);

  // Create PENDING outbox entry
  const outboxEntry = await prisma.outbox.create({
    data: {
      type: 'SMS',
      status: 'PENDING',
      payloadJson: { phone: recipient, message, provider: 'text.lk', senderId },
    },
  });

  try {
    if (!apiToken) {
      logger.warn('SMS', `No text.lk API Token configured. Executed in SIMULATED mode. Saved to Outbox.`);
      await prisma.outbox.update({
        where: { id: outboxEntry.id },
        data: {
          status: 'SENT',
          attempts: 1,
        },
      });
      return {
        success: true,
        message: `Simulated SMS sent to ${recipient} (No text.lk API token configured; saved in Outbox).`,
      };
    }

    // Call text.lk v3 REST API
    const response = await fetch('https://app.text.lk/api/v3/sms/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiToken}`,
      },
      body: JSON.stringify({
        recipient,
        sender_id: senderId,
        type: 'plain',
        message,
      }),
    });

    const data: any = await response.json().catch(() => null);

    if (!response.ok || data?.status === 'error' || data?.status === 'failed') {
      const errorMsg = data?.message || data?.error || `Text.lk API returned status ${response.status}`;
      throw new Error(errorMsg);
    }

    logger.success('SMS', `Delivered successfully to ${recipient} via text.lk API.`);

    // Mark outbox entry as SENT
    await prisma.outbox.update({
      where: { id: outboxEntry.id },
      data: {
        status: 'SENT',
        attempts: 1,
        payloadJson: { phone: recipient, message, provider: 'text.lk', senderId, response: data },
      },
    });

    return {
      success: true,
      message: `SMS delivered to ${recipient} via text.lk!`,
    };
  } catch (error: any) {
    const errorMsg = error?.message || 'Unknown SMS dispatch error';
    logger.error('SMS', `Failed delivery to ${recipient}: ${errorMsg}`);

    // Mark outbox entry as FAILED
    await prisma.outbox.update({
      where: { id: outboxEntry.id },
      data: {
        status: 'FAILED',
        attempts: 1,
        payloadJson: { phone: recipient, message, provider: 'text.lk', error: errorMsg },
      },
    });

    return {
      success: false,
      message: errorMsg,
    };
  }
}
