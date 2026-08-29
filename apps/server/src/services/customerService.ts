import type { CustomerUpsertInput } from '@pos/shared';
import { prisma } from '../lib/prisma.js';

export async function findCustomerByPhone(phone: string) {
  return prisma.customer.findUnique({
    where: { phone },
    include: {
      sales: {
        where: { status: 'COMPLETED' },
        orderBy: { createdAt: 'desc' },
        take: 5,
      },
    },
  });
}

export async function upsertCustomer(input: CustomerUpsertInput) {
  return prisma.customer.upsert({
    where: { phone: input.phone },
    create: input,
    update: { name: input.name, notes: input.notes },
  });
}
