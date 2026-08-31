import { prisma } from '../lib/prisma.js';
import { getSettings } from './settingsService.js';

export async function getSlowMovingStock(daysThreshold?: number) {
  const settings = await getSettings();
  const days = daysThreshold !== undefined ? Number(daysThreshold) : Number(settings.lowStockDefaultDays || 90);

  const cutOffDate = new Date();
  cutOffDate.setDate(cutOffDate.getDate() - days);

  // Find all products currently in stock
  const inStockProducts = await prisma.product.findMany({
    where: { quantity: { gt: 0 } },
  });

  // Find products sold since the cutoff date
  const recentSaleMovements = await prisma.stockMovement.findMany({
    where: {
      type: 'SALE',
      createdAt: { gte: cutOffDate },
    },
    select: { productId: true },
    distinct: ['productId'],
  });

  const recentlySoldProductIds = new Set(recentSaleMovements.map((m) => m.productId));

  const slowMovingList = [];

  for (const product of inStockProducts) {
    if (!recentlySoldProductIds.has(product.id)) {
      // Find last sale date for this product
      const lastSale = await prisma.stockMovement.findFirst({
        where: { productId: product.id, type: 'SALE' },
        orderBy: { createdAt: 'desc' },
      });

      slowMovingList.push({
        id: product.id,
        sku: product.sku,
        barcode: product.barcode,
        name: product.name,
        category: product.category,
        quantity: product.quantity,
        costPrice: Number(product.costPrice),
        sellPrice: Number(product.sellPrice),
        costValue: product.quantity * Number(product.costPrice),
        lastSoldAt: lastSale ? lastSale.createdAt.toISOString() : null,
      });
    }
  }

  // Sort by highest cost capital tied up in slow stock
  return slowMovingList.sort((a, b) => b.costValue - a.costValue);
}
