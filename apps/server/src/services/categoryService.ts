import { prisma } from '../lib/prisma.js';
import { HttpError } from '../middleware/errorHandler.js';
import type { CategoryInput } from '@pos/shared';

export async function listCategories() {
  return prisma.category.findMany({
    orderBy: { name: 'asc' },
    include: {
      _count: {
        select: { products: true },
      },
    },
  });
}

export async function createCategory(input: CategoryInput) {
  const existing = await prisma.category.findUnique({ where: { name: input.name } });
  if (existing) throw new HttpError(409, 'Category already exists');

  return prisma.category.create({
    data: input,
  });
}

export async function updateCategory(id: string, input: Partial<CategoryInput>) {
  return prisma.category.update({
    where: { id },
    data: input,
  });
}

export async function deleteCategory(id: string) {
  const cat = await prisma.category.findUnique({ where: { id } });
  if (!cat) throw new HttpError(404, 'Category not found');
  const count = await prisma.product.count({
    where: {
      OR: [
        { categoryId: id },
        { category: cat.name },
      ],
    },
  });
  if (count > 0) {
    throw new HttpError(400, `Cannot delete category "${cat.name}" because ${count} product(s) are assigned to it. Reassign or delete those products first.`);
  }
  return prisma.category.delete({ where: { id } });
}
