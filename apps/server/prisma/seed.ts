import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  // Seed Technician Employee
  const techPin = '654321';
  const technician = await prisma.employee.upsert({
    where: { id: 'seed-technician' },
    create: {
      id: 'seed-technician',
      name: 'Default Technician',
      role: 'TECHNICIAN',
      pinHash: await bcrypt.hash(techPin, 10),
    },
    update: {},
  });
  console.log(`Technician employee ready: ${technician.name} (login PIN: ${techPin})`);

  // Update shop settings with default technician & configurable defaults
  const settings = await prisma.shopSettings.upsert({
    where: { id: 'singleton' },
    create: {
      id: 'singleton',
      companyName: 'K Zero Mobile',
      primaryColor: '#1E40AF',
      themeMode: 'system',
      discountLimitPercent: 20,
      defaultDiscountPercent: 10,
      defaultDownPaymentPercent: 35,
      defaultInterestMethod: 'PERCENTAGE',
      defaultInterestValue: 12,
      defaultLateFeeMethod: 'FIXED_AMOUNT',
      defaultLateFeeValue: 500,
      defaultCommissionMethod: 'PERCENTAGE',
      defaultCommissionValue: 10,
      defaultTechnicianId: technician.id,
      uncollectedRepairDays: 30,
      firstDaysWarrantyDays: 3,
      barcodeScannerMode: 'USB_HID',
      receiptWidth: '80mm',
    },
    update: {
      defaultTechnicianId: technician.id,
    },
  });
  console.log('Shop settings ready:', settings.companyName);

  // Seed Default Categories (supporting 50+ categories per Q14)
  const initialCategories = [
    'Mobile Phones', 'Tablets', 'Smart Watches', 'Accessories', 'Chargers & Cables',
    'Audio & Headphones', 'Power Banks', 'Cases & Covers', 'Screen Protectors', 'Memory & Storage',
    'Spare Parts - Screens', 'Spare Parts - Batteries', 'Spare Parts - Charging Ports',
    'Spare Parts - Cameras', 'Spare Parts - Speakers', 'Tools & Equipment', 'Used Phones',
    'Refurbished Tablets', 'Smart Bands', 'Wireless Earbuds', 'Car Accessories', 'Holders & Mounts',
    'Adapters & Converters', 'Smart Home', 'Gaming Accessories', 'Bluetooth Speakers', 'Stylus Pens',
    'Camera Lenses', 'Cleaners & Maintenance', 'Cables - Type-C', 'Cables - Lightning', 'Cables - Micro USB',
    'Wireless Chargers', 'Fast Chargers', 'Wall Adapters', 'SIM Adapters', 'OTG Devices',
    'Network & Modems', 'Router Antennas', 'Smart Rings', 'Screen Guards - Matte', 'Screen Guards - Privacy',
    'Back Foils', 'Camera Rings', 'Smart Tag Trackers', 'Selfie Sticks & Tripods', 'Phone Wallets',
    'Waterproof Pouches', 'Dust Plugs', 'SIM Ejectors', 'Mobile Repair Adhesives', 'Solder Flux & Wire'
  ];

  for (const catName of initialCategories) {
    await prisma.category.upsert({
      where: { name: catName },
      create: { name: catName },
      update: {},
    });
  }
  console.log(`Seeded ${initialCategories.length} product categories.`);

  // Seed Default Warranty Periods (Q5, Q20)
  const defaultWarranties = [
    { label: '6 Months', durationDays: 180, isDefault: true, appliesToSales: true, appliesToRepairs: true },
    { label: '1 Year / 12 Months', durationDays: 365, isDefault: false, appliesToSales: true, appliesToRepairs: true },
  ];

  for (const w of defaultWarranties) {
    const existing = await prisma.warrantyPeriod.findFirst({ where: { label: w.label } });
    if (!existing) {
      await prisma.warrantyPeriod.create({ data: w });
    }
  }
  console.log('Seeded default warranty periods.');

  // Seed Default Actions for Installment Overdue (Q11)
  const defaultActions = [
    { triggerDaysOverdue: 7, actionType: 'WARNING' as const, description: 'Send Overdue Reminder Warning SMS' },
    { triggerDaysOverdue: 14, actionType: 'BLOCK' as const, description: 'Block Customer from New Credit Purchases' },
    { triggerDaysOverdue: 30, actionType: 'SUSPEND' as const, description: 'Suspend Customer Account and Escalate' },
  ];

  for (const da of defaultActions) {
    const existing = await prisma.defaultAction.findFirst({
      where: { triggerDaysOverdue: da.triggerDaysOverdue, actionType: da.actionType },
    });
    if (!existing) {
      await prisma.defaultAction.create({ data: da });
    }
  }
  console.log('Seeded default overdue actions.');

  // Seed Default Customer Categories
  const defaultCustomerCategories = [
    { name: 'Best Customers', emoji: null, color: '#FFD700', description: 'Top purchasing high-value customers', sortOrder: 1 },
    { name: 'Good Customers', emoji: null, color: '#22C55E', description: 'Reliable buyers with smooth history', sortOrder: 2 },
    { name: 'Normal Customers', emoji: null, color: '#EAB308', description: 'Standard walk-in buyers', sortOrder: 3 },
    { name: 'Follow-up Required', emoji: null, color: '#F97316', description: 'Customers needing payment or service check', sortOrder: 4 },
    { name: 'Problem / Risk', emoji: null, color: '#EF4444', description: 'Customers with overdue or payment issues', sortOrder: 5 },
    { name: 'Blocked Customers', emoji: null, color: '#6B7280', description: 'Blocked or suspended customers', sortOrder: 6 },
    { name: 'Installment Customers', emoji: null, color: '#3B82F6', description: 'Active or past installment credit buyers', sortOrder: 7 },
    { name: 'Repair Customers', emoji: null, color: '#8B5CF6', description: 'Customers who bring devices for repair', sortOrder: 8 },
    { name: 'Regular Buyers', emoji: null, color: '#06B6D4', description: 'Frequent repeat shop buyers', sortOrder: 9 },
  ];

  for (const cc of defaultCustomerCategories) {
    await prisma.customerCategory.upsert({
      where: { name: cc.name },
      create: cc,
      update: cc,
    });
  }
  console.log('Seeded default customer categories.');

  const sampleProducts: Array<{
    sku: string;
    barcode: string;
    name: string;
    costPrice: number;
    sellPrice: number;
    wholesalePrice?: number;
    businessPrice?: number;
    quantity: number;
    lowStockThreshold: number;
    category: string;
    isSerialized: boolean;
  }> = [
    {
      sku: 'SKU-PHONE-001',
      barcode: '8901234500017',
      name: 'Samsung Galaxy A15',
      costPrice: 42000,
      sellPrice: 48500,
      wholesalePrice: 45000,
      businessPrice: 44000,
      quantity: 5,
      lowStockThreshold: 1,
      category: 'Mobile Phones',
      isSerialized: true,
    },
    {
      sku: 'SKU-PHONE-002',
      barcode: '8901234500024',
      name: 'iPhone 13 (Used, Grade A)',
      costPrice: 135000,
      sellPrice: 149000,
      wholesalePrice: 142000,
      businessPrice: 140000,
      quantity: 3,
      lowStockThreshold: 1,
      category: 'Mobile Phones',
      isSerialized: true,
    },
    {
      sku: 'SKU-ACC-001',
      barcode: '8901234500031',
      name: 'Tempered Glass Screen Protector',
      costPrice: 80,
      sellPrice: 250,
      wholesalePrice: 150,
      businessPrice: 120,
      quantity: 60,
      lowStockThreshold: 10,
      category: 'Screen Protectors',
      isSerialized: false,
    },
    {
      sku: 'SKU-ACC-002',
      barcode: '8901234500048',
      name: 'USB-C Fast Charger 20W',
      costPrice: 650,
      sellPrice: 1200,
      wholesalePrice: 900,
      businessPrice: 850,
      quantity: 25,
      lowStockThreshold: 5,
      category: 'Chargers & Cables',
      isSerialized: false,
    },
    {
      sku: 'SKU-ACC-003',
      barcode: '8901234500055',
      name: 'Silicone Phone Case',
      costPrice: 150,
      sellPrice: 450,
      wholesalePrice: 300,
      businessPrice: 250,
      quantity: 40,
      lowStockThreshold: 8,
      category: 'Cases & Covers',
      isSerialized: false,
    },
  ];

  for (const product of sampleProducts) {
    await prisma.product.upsert({
      where: { sku: product.sku },
      create: product,
      update: product,
    });
  }
  console.log(`Seeded ${sampleProducts.length} sample products.`);

}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
