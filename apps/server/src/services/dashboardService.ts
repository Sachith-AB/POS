import { prisma } from '../lib/prisma.js';

export async function getDashboardSummary() {
  const now = new Date();
  
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfYesterday = new Date(startOfToday.getTime() - 24 * 60 * 60 * 1000);
  const startOfThisWeek = new Date(startOfToday.getTime() - 7 * 24 * 60 * 60 * 1000);
  const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  // 1. Sales & Profit Today
  const salesToday = await prisma.sale.findMany({
    where: { status: 'COMPLETED', createdAt: { gte: startOfToday } },
    include: { items: { include: { product: true } } },
  });

  const salesCountToday = salesToday.length;
  const revenueToday = salesToday.reduce((sum, s) => sum + Number(s.total), 0);
  const profitToday = salesToday.reduce((sum, s) => {
    const cost = s.items.reduce((cSum, item) => cSum + item.quantity * Number(item.product.costPrice), 0);
    return sum + (Number(s.total) - cost);
  }, 0);

  // 2. Sales & Profit Yesterday (for trends)
  const salesYesterday = await prisma.sale.findMany({
    where: {
      status: 'COMPLETED',
      createdAt: { gte: startOfYesterday, lt: startOfToday },
    },
    include: { items: { include: { product: true } } },
  });

  const revenueYesterday = salesYesterday.reduce((sum, s) => sum + Number(s.total), 0);
  const profitYesterday = salesYesterday.reduce((sum, s) => {
    const cost = s.items.reduce((cSum, item) => cSum + item.quantity * Number(item.product.costPrice), 0);
    return sum + (Number(s.total) - cost);
  }, 0);

  // 3. Weekly & Monthly Sales (for scale)
  const salesThisWeek = await prisma.sale.findMany({
    where: { status: 'COMPLETED', createdAt: { gte: startOfThisWeek } },
  });
  const revenueThisWeek = salesThisWeek.reduce((sum, s) => sum + Number(s.total), 0);

  const salesThisMonth = await prisma.sale.findMany({
    where: { status: 'COMPLETED', createdAt: { gte: startOfThisMonth } },
  });
  const revenueThisMonth = salesThisMonth.reduce((sum, s) => sum + Number(s.total), 0);

  // 4. Current Stock Value
  const products = await prisma.product.findMany({ where: { quantity: { gt: 0 } } });
  const stockValue = products.reduce((sum, p) => sum + p.quantity * Number(p.costPrice), 0);

  // 5. Low Stock Alerts count
  const lowStockCount = await prisma.product.count({
    where: {
      quantity: { lte: prisma.product.fields.lowStockThreshold },
    },
  });

  // 6. Active Repairs summary
  const activeRepairsCount = await prisma.repairTicket.count({
    where: {
      status: { in: ['RECEIVED', 'DIAGNOSING', 'AWAITING_PARTS', 'REPAIRED'] },
    },
  });

  const repairsByStatus = await prisma.repairTicket.groupBy({
    by: ['status'],
    _count: { id: true },
  });

  // 7. Overdue Installments summary
  const overdueInstallmentsCount = await prisma.installmentPlan.count({
    where: { status: 'OVERDUE' },
  });
  const overdueInstallmentsValue = await prisma.installmentPlan.aggregate({
    where: { status: 'OVERDUE' },
    _sum: { remainingBalance: true },
  });

  // 8. Top Selling Products
  const saleItems = await prisma.saleItem.findMany({
    where: { sale: { status: 'COMPLETED' } },
    include: { product: true },
  });

  const productSalesMap: Record<string, { name: string; quantity: number; revenue: number }> = {};
  for (const item of saleItems) {
    if (!productSalesMap[item.productId]) {
      productSalesMap[item.productId] = {
        name: item.product.name,
        quantity: 0,
        revenue: 0,
      };
    }
    productSalesMap[item.productId].quantity += item.quantity;
    productSalesMap[item.productId].revenue += item.quantity * Number(item.unitPrice);
  }

  const topSellingProducts = Object.values(productSalesMap)
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 10);

  return {
    today: {
      salesCount: salesCountToday,
      revenue: revenueToday,
      profit: profitToday,
    },
    yesterday: {
      revenue: revenueYesterday,
      profit: profitYesterday,
    },
    weekly: {
      revenue: revenueThisWeek,
    },
    monthly: {
      revenue: revenueThisMonth,
    },
    stock: {
      totalValue: stockValue,
      lowStockCount,
    },
    repairs: {
      activeCount: activeRepairsCount,
      byStatus: repairsByStatus.map((g) => ({ status: g.status, count: g._count.id })),
    },
    installments: {
      overdueCount: overdueInstallmentsCount,
      overdueValue: Number(overdueInstallmentsValue._sum.remainingBalance || 0),
    },
    topSellingProducts,
  };
}

export async function getSalesChartData() {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  // Fetch completed sales for today
  const sales = await prisma.sale.findMany({
    where: { status: 'COMPLETED', createdAt: { gte: startOfToday } },
    select: { createdAt: true, total: true },
  });

  // Group by hour
  const hourlyData = Array.from({ length: 24 }, (_, i) => ({ hour: `${i}:00`, total: 0 }));
  
  for (const s of sales) {
    const hour = s.createdAt.getHours();
    hourlyData[hour].total += Number(s.total);
  }

  return hourlyData;
}
