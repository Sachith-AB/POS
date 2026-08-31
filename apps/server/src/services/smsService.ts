import { prisma } from '../lib/prisma.js';

export async function sendSms(phone: string, message: string): Promise<void> {
  const provider = process.env.SMS_PROVIDER || 'stub';
  const apiKey = process.env.SMS_API_KEY || '';
  const senderId = process.env.SMS_SENDER_ID || '';

  console.log(`[SMS Service] Attempting to send message to ${phone} using provider "${provider}"`);
  console.log(`[SMS Service] Content: "${message}"`);

  // Create PENDING outbox entry
  const outboxEntry = await prisma.outbox.create({
    data: {
      type: 'SMS',
      status: 'PENDING',
      payloadJson: { phone, message, provider },
    },
  });

  try {
    if (provider === 'whatsapp') {
      // Mock WhatsApp Cloud API request
      console.log(`[WhatsApp Business API] Sending message to ${phone}...`);
      // Simulating a success response
      // In production: fetch('https://graph.facebook.com/v17.0/.../messages', { ... })
    } else if (provider === 'stub' || !provider) {
      console.log(`[SMS STUB] Sent message to ${phone} successfully.`);
    } else {
      // Custom/Generic SMS Integration Placeholder
      console.log(`[SMS ${provider.toUpperCase()}] Sending via third-party gateway...`);
    }

    // Mark outbox entry as SENT
    await prisma.outbox.update({
      where: { id: outboxEntry.id },
      data: {
        status: 'SENT',
        attempts: 1,
      },
    });
  } catch (error: any) {
    console.error(`[SMS Service Error] Failed to send message to ${phone}:`, error);

    // Mark outbox entry as FAILED
    await prisma.outbox.update({
      where: { id: outboxEntry.id },
      data: {
        status: 'FAILED',
        attempts: 1,
      },
    });
    throw error;
  }
}
