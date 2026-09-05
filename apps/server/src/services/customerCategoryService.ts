import type { CustomerCategoryInput } from '@pos/shared';
import { prisma } from '../lib/prisma.js';
import { HttpError } from '../middleware/errorHandler.js';

export async function listCustomerCategories() {
  return prisma.customerCategory.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: 'asc' },
    include: {
      _count: {
        select: { assignments: true },
      },
    },
  });
}

export async function createCustomerCategory(input: CustomerCategoryInput) {
  const existing = await prisma.customerCategory.findUnique({
    where: { name: input.name },
  });
  if (existing) {
    if (!existing.isActive) {
      // Re-activate
      return prisma.customerCategory.update({
        where: { id: existing.id },
        data: { ...input, isActive: true },
      });
    }
    throw new HttpError(409, 'Customer category with this name already exists');
  }

  return prisma.customerCategory.create({
    data: input,
  });
}

export async function updateCustomerCategory(id: string, input: Partial<CustomerCategoryInput>) {
  const category = await prisma.customerCategory.findUnique({ where: { id } });
  if (!category) throw new HttpError(404, 'Customer category not found');

  if (input.name && input.name !== category.name) {
    const existing = await prisma.customerCategory.findUnique({ where: { name: input.name } });
    if (existing && existing.id !== id) {
      throw new HttpError(409, 'Another category with this name already exists');
    }
  }

  return prisma.customerCategory.update({
    where: { id },
    data: input,
  });
}

export async function deleteCustomerCategory(id: string) {
  const category = await prisma.customerCategory.findUnique({
    where: { id },
    include: { _count: { select: { assignments: true } } },
  });
  if (!category) throw new HttpError(404, 'Customer category not found');

  // Soft delete by setting isActive to false
  return prisma.customerCategory.update({
    where: { id },
    data: { isActive: false },
  });
}
