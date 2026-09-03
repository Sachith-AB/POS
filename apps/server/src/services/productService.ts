import type { ProductCreateInput, ProductUpdateInput } from '@pos/shared';
import { prisma } from '../lib/prisma.js';
import { HttpError } from '../middleware/errorHandler.js';

export async function listProducts(params: { search?: string; category?: string } = {}) {
  const { search, category } = params;
  return prisma.product.findMany({
    where: {
      category: category || undefined,
      OR: search
        ? [
            { name: { contains: search, mode: 'insensitive' } },
            { sku: { contains: search, mode: 'insensitive' } },
            { barcode: { contains: search, mode: 'insensitive' } },
          ]
        : undefined,
    },
    include: { warrantyPeriod: true, categoryRel: true },
    orderBy: { name: 'asc' },
    take: 100,
  });
}

export async function getProductByBarcode(barcode: string) {
  return prisma.product.findUnique({
    where: { barcode },
    include: { warrantyPeriod: true, categoryRel: true },
  });
}

export async function getProductById(id: string) {
  const product = await prisma.product.findUnique({
    where: { id },
    include: { warrantyPeriod: true, categoryRel: true },
  });
  if (!product) throw new HttpError(404, 'Product not found');
  return product;
}


export async function createProduct(input: ProductCreateInput) {
  return prisma.product.create({ data: input });
}

export async function updateProduct(id: string, input: ProductUpdateInput) {
  await getProductById(id);
  return prisma.product.update({ where: { id }, data: input });
}

export async function listLowStock() {
  const products = await prisma.product.findMany();
  return products.filter((p) => p.quantity <= p.lowStockThreshold);
}

export async function listDeadStock(months: number) {
  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - months);
  const soldProductIds = await prisma.saleItem.findMany({
    where: { sale: { status: 'COMPLETED', createdAt: { gte: cutoff } } },
    select: { productId: true },
    distinct: ['productId'],
  });
  const soldIds = new Set(soldProductIds.map((s) => s.productId));
  const all = await prisma.product.findMany();
  return all.filter((p) => !soldIds.has(p.id));
}
