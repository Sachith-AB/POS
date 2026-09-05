import type { CustomerUpsertInput, CustomerUpdateInput, CustomerListQueryInput } from '@pos/shared';
import { prisma } from '../lib/prisma.js';
import { HttpError } from '../middleware/errorHandler.js';

export async function findCustomerByPhone(phone: string) {
  return prisma.customer.findUnique({
    where: { phone },
    include: {
      categories: {
        include: {
          category: true,
        },
      },
      sales: {
        where: { status: 'COMPLETED' },
        orderBy: { createdAt: 'desc' },
        take: 5,
      },
    },
  });
}

export async function upsertCustomer(input: CustomerUpsertInput) {
  const existing = await prisma.customer.findUnique({ where: { phone: input.phone } });

  const { categoryIds, ...fields } = input;

  if (existing) {
    return updateCustomer(existing.id, input);
  }

  // Verify NIC uniqueness if provided
  if (fields.nic) {
    const existingNic = await prisma.customer.findUnique({ where: { nic: fields.nic } });
    if (existingNic) {
      throw new HttpError(409, 'Customer with this NIC already exists');
    }
  }

  const newCustomer = await prisma.customer.create({
    data: {
      phone: fields.phone,
      name: fields.name || null,
      nic: fields.nic || null,
      address: fields.address || null,
      notes: fields.notes || null,
      isBlocked: fields.isBlocked ?? false,
      isSuspended: fields.isSuspended ?? false,
      categories: categoryIds && categoryIds.length > 0
        ? {
            create: categoryIds.map((categoryId) => ({ categoryId })),
          }
        : undefined,
    },
    include: {
      categories: {
        include: { category: true },
      },
    },
  });

  return newCustomer;
}

export async function updateCustomer(id: string, input: CustomerUpdateInput) {
  const customer = await prisma.customer.findUnique({ where: { id } });
  if (!customer) throw new HttpError(404, 'Customer not found');

  const { categoryIds, ...fields } = input;

  if (fields.phone && fields.phone !== customer.phone) {
    const existingPhone = await prisma.customer.findUnique({ where: { phone: fields.phone } });
    if (existingPhone && existingPhone.id !== id) {
      throw new HttpError(409, 'Customer with this phone number already exists');
    }
  }

  if (fields.nic && fields.nic !== customer.nic) {
    const existingNic = await prisma.customer.findUnique({ where: { nic: fields.nic } });
    if (existingNic && existingNic.id !== id) {
      throw new HttpError(409, 'Customer with this NIC already exists');
    }
  }

  return prisma.$transaction(async (tx) => {
    // If categoryIds provided, sync them
    if (categoryIds !== undefined) {
      await tx.customerCategoryAssignment.deleteMany({ where: { customerId: id } });
      if (categoryIds.length > 0) {
        await tx.customerCategoryAssignment.createMany({
          data: categoryIds.map((categoryId) => ({ customerId: id, categoryId })),
        });
      }
    }

    const updated = await tx.customer.update({
      where: { id },
      data: {
        phone: fields.phone,
        name: fields.name,
        nic: fields.nic,
        address: fields.address,
        notes: fields.notes,
        isBlocked: fields.isBlocked,
        isSuspended: fields.isSuspended,
      },
      include: {
        categories: {
          include: { category: true },
        },
      },
    });

    return updated;
  });
}

export async function listCustomers(query: CustomerListQueryInput) {
  const page = query.page || 1;
  const limit = query.limit || 20;
  const skip = (page - 1) * limit;

  const where: any = {};

  // Search filter
  if (query.search && query.search.trim() !== '') {
    const search = query.search.trim();
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { phone: { contains: search, mode: 'insensitive' } },
      { nic: { contains: search, mode: 'insensitive' } },
    ];
  }

  // Category filter
  if (query.categoryId && query.categoryId !== 'ALL') {
    where.categories = {
      some: {
        categoryId: query.categoryId,
      },
    };
  }

  // Payment status filter
  if (query.paymentStatus && query.paymentStatus !== 'ALL') {
    if (query.paymentStatus === 'BLOCKED') {
      where.OR = [{ isBlocked: true }, { isSuspended: true }];
    } else if (query.paymentStatus === 'OVERDUE') {
      where.sales = {
        some: {
          installmentPlan: {
            status: 'OVERDUE',
          },
        },
      };
    } else if (query.paymentStatus === 'HAS_OUTSTANDING') {
      where.sales = {
        some: {
          installmentPlan: {
            status: { in: ['ACTIVE', 'OVERDUE'] },
            remainingBalance: { gt: 0 },
          },
        },
      };
    } else if (query.paymentStatus === 'PAID_UP') {
      where.sales = {
        some: { status: 'COMPLETED' },
        none: {
          installmentPlan: {
            status: { in: ['ACTIVE', 'OVERDUE'] },
            remainingBalance: { gt: 0 },
          },
        },
      };
    }
  }

  const [rawCustomers, total] = await prisma.$transaction([
    prisma.customer.findMany({
      where,
      include: {
        categories: {
          include: {
            category: true,
          },
        },
        sales: {
          where: { status: 'COMPLETED' },
          select: {
            id: true,
            total: true,
            createdAt: true,
            payments: {
              select: { amount: true },
            },
            installmentPlan: {
              select: {
                id: true,
                status: true,
                remainingBalance: true,
              },
            },
          },
        },
        repairTickets: {
          select: { id: true, createdAt: true },
        },
        tradeIns: {
          select: { id: true, createdAt: true },
        },
      },
      orderBy: query.sortBy === 'name' ? { name: query.sortDir || 'asc' } : { createdAt: query.sortDir || 'desc' },
    }),
    prisma.customer.count({ where }),
  ]);

  // Compute metrics for sorting & output
  const processed = rawCustomers.map((c) => {
    const totalPurchases = c.sales.length;
    const totalPurchaseValue = c.sales.reduce((sum, s) => sum + Number(s.total), 0);
    const outstandingAmount = c.sales.reduce((sum, s) => {
      if (s.installmentPlan && (s.installmentPlan.status === 'ACTIVE' || s.installmentPlan.status === 'OVERDUE')) {
        return sum + Number(s.installmentPlan.remainingBalance);
      }
      return sum;
    }, 0);

    const dates = [
      c.createdAt,
      ...c.sales.map((s) => s.createdAt),
      ...c.repairTickets.map((r) => r.createdAt),
      ...c.tradeIns.map((t) => t.createdAt),
    ];
    const lastTransactionDate = new Date(Math.max(...dates.map((d) => new Date(d).getTime()))).toISOString();

    const hasOverdue = c.sales.some((s) => s.installmentPlan?.status === 'OVERDUE');
    const isInstallmentCustomer = c.sales.some((s) => s.installmentPlan !== null);

    return {
      id: c.id,
      phone: c.phone,
      name: c.name,
      nic: c.nic,
      address: c.address,
      notes: c.notes,
      isBlocked: c.isBlocked,
      isSuspended: c.isSuspended,
      createdAt: c.createdAt.toISOString(),
      updatedAt: c.updatedAt.toISOString(),
      categories: c.categories.map((ca) => ca.category),
      totalPurchases,
      totalPurchaseValue,
      outstandingAmount,
      lastTransactionDate,
      hasOverdue,
      isInstallmentCustomer,
    };
  });

  // Sort by calculated fields if requested
  if (query.sortBy === 'totalPurchases') {
    processed.sort((a, b) => query.sortDir === 'asc' ? a.totalPurchases - b.totalPurchases : b.totalPurchases - a.totalPurchases);
  } else if (query.sortBy === 'totalPurchaseValue') {
    processed.sort((a, b) => query.sortDir === 'asc' ? a.totalPurchaseValue - b.totalPurchaseValue : b.totalPurchaseValue - a.totalPurchaseValue);
  } else if (query.sortBy === 'outstandingAmount') {
    processed.sort((a, b) => query.sortDir === 'asc' ? a.outstandingAmount - b.outstandingAmount : b.outstandingAmount - a.outstandingAmount);
  } else if (query.sortBy === 'lastTransactionDate') {
    processed.sort((a, b) => {
      const timeA = new Date(a.lastTransactionDate).getTime();
      const timeB = new Date(b.lastTransactionDate).getTime();
      return query.sortDir === 'asc' ? timeA - timeB : timeB - timeA;
    });
  }

  // Slice pagination after calculated sort
  const paginated = processed.slice(skip, skip + limit);

  return {
    items: paginated,
    total,
    page,
    limit,
    pages: Math.ceil(total / limit),
  };
}

export async function getCustomerProfile(id: string) {
  const customer = await prisma.customer.findUnique({
    where: { id },
    include: {
      categories: {
        include: { category: true },
      },
      sales: {
        orderBy: { createdAt: 'desc' },
        include: {
          employee: { select: { id: true, name: true } },
          items: {
            include: {
              product: true,
              soldSerializedItem: true,
            },
          },
          payments: {
            orderBy: { createdAt: 'desc' },
          },
          installmentPlan: true,
          tradeIns: true,
        },
      },
      repairTickets: {
        orderBy: { createdAt: 'desc' },
        include: {
          technician: { select: { id: true, name: true } },
          warrantyPeriod: true,
          outsourcedRepair: true,
        },
      },
      tradeIns: {
        orderBy: { createdAt: 'desc' },
      },
    },
  });

  if (!customer) throw new HttpError(404, 'Customer not found');

  // Gather IMEI history (devices sold to this customer)
  const imeiHistory: Array<{
    imei: string;
    productName: string;
    saleId: string;
    date: string;
  }> = [];

  customer.sales.forEach((s) => {
    s.items.forEach((item) => {
      if (item.soldSerializedItem) {
        imeiHistory.push({
          imei: item.soldSerializedItem.imei,
          productName: item.product.name,
          saleId: s.id,
          date: s.createdAt.toISOString(),
        });
      }
    });
  });

  // Calculate aggregate stats
  const completedSales = customer.sales.filter((s) => s.status === 'COMPLETED');
  const totalPurchases = completedSales.length;
  const totalPurchaseValue = completedSales.reduce((sum, s) => sum + Number(s.total), 0);

  let totalPaidAmount = 0;
  customer.sales.forEach((s) => {
    s.payments.forEach((p) => {
      totalPaidAmount += Number(p.amount);
    });
  });

  let outstandingAmount = 0;
  let latePaymentCount = 0;

  customer.sales.forEach((s) => {
    if (s.installmentPlan) {
      if (s.installmentPlan.status === 'ACTIVE' || s.installmentPlan.status === 'OVERDUE') {
        outstandingAmount += Number(s.installmentPlan.remainingBalance);
      }
      if (s.installmentPlan.status === 'OVERDUE') {
        latePaymentCount += 1;
      }
    }
  });

  const dates = [
    customer.createdAt,
    ...customer.sales.map((s) => s.createdAt),
    ...customer.repairTickets.map((r) => r.createdAt),
    ...customer.tradeIns.map((t) => t.createdAt),
  ];
  const lastTransactionDate = new Date(Math.max(...dates.map((d) => new Date(d).getTime()))).toISOString();

  return {
    ...customer,
    categories: customer.categories.map((c) => c.category),
    stats: {
      totalPurchases,
      totalPurchaseValue,
      totalPaidAmount,
      outstandingAmount,
      latePaymentCount,
      lastTransactionDate,
    },
    imeiHistory,
  };
}

export async function getCustomerOverviewDashboard() {
  const totalCustomers = await prisma.customer.count();
  const blockedCustomers = await prisma.customer.count({
    where: { OR: [{ isBlocked: true }, { isSuspended: true }] },
  });

  const allCustomers = await prisma.customer.findMany({
    include: {
      sales: {
        where: { status: 'COMPLETED' },
        include: {
          installmentPlan: true,
        },
      },
    },
  });

  let bestCustomers = 0;
  let regularCustomers = 0;
  let installmentCustomers = 0;
  let overdueCustomers = 0;
  let problemRiskCustomers = 0;

  allCustomers.forEach((c) => {
    const totalPurchases = c.sales.length;
    const totalValue = c.sales.reduce((sum, s) => sum + Number(s.total), 0);
    const hasInstallment = c.sales.some((s) => s.installmentPlan !== null);
    const hasOverdue = c.sales.some((s) => s.installmentPlan?.status === 'OVERDUE');

    if (totalPurchases >= 3 || totalValue >= 100000) {
      bestCustomers++;
    }
    if (totalPurchases > 1) {
      regularCustomers++;
    }
    if (hasInstallment) {
      installmentCustomers++;
    }
    if (hasOverdue) {
      overdueCustomers++;
    }
    if (c.isBlocked || c.isSuspended || hasOverdue) {
      problemRiskCustomers++;
    }
  });

  const categoryCounts = await prisma.customerCategory.findMany({
    where: { isActive: true },
    select: {
      id: true,
      name: true,
      emoji: true,
      color: true,
      _count: {
        select: { assignments: true },
      },
    },
  });

  return {
    totalCustomers,
    bestCustomers,
    regularCustomers,
    installmentCustomers,
    overdueCustomers,
    problemRiskCustomers,
    blockedCustomers,
    categoryCounts: categoryCounts.map((cat) => ({
      id: cat.id,
      name: cat.name,
      emoji: cat.emoji,
      color: cat.color,
      count: cat._count.assignments,
    })),
  };
}
