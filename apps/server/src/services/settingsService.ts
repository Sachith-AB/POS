import type { ShopSettingsInput } from '@pos/shared';
import { prisma } from '../lib/prisma.js';

const SINGLETON_ID = 'singleton';

export async function getSettings() {
  const existing = await prisma.shopSettings.findUnique({ where: { id: SINGLETON_ID } });
  if (existing) return existing;
  return prisma.shopSettings.create({ data: { id: SINGLETON_ID } });
}

export async function updateSettings(input: Partial<ShopSettingsInput>) {
  await getSettings(); // ensure the singleton row exists
  return prisma.shopSettings.update({
    where: { id: SINGLETON_ID },
    data: input,
  });
}
