import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const settings = await prisma.shopSettings.upsert({
    where: { id: 'singleton' },
    create: {
      id: 'singleton',
      companyName: 'K Zero Mobile',
      primaryColor: '#1E40AF',
      themeMode: 'system',
      discountLimitPercent: 10,
      barcodeScannerMode: 'USB_HID',
      receiptWidth: '80mm',
    },
    update: {},
  });
  console.log('Shop settings ready:', settings.companyName);

  const ownerPin = '123456';
  const owner = await prisma.employee.upsert({
    where: { id: 'seed-owner' },
    create: {
      id: 'seed-owner',
      name: 'Owner',
      role: 'OWNER',
      pinHash: await bcrypt.hash(ownerPin, 10),
    },
    update: {},
  });
  console.log(`Owner employee ready: ${owner.name} (login PIN: ${ownerPin})`);

  const sampleProducts: Array<{
    sku: string;
    barcode: string;
    name: string;
    costPrice: number;
    sellPrice: number;
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
      quantity: 3,
      lowStockThreshold: 1,
      category: 'Phones',
      isSerialized: true,
    },
    {
      sku: 'SKU-PHONE-002',
      barcode: '8901234500024',
      name: 'iPhone 13 (Used, Grade A)',
      costPrice: 135000,
      sellPrice: 149000,
      quantity: 2,
      lowStockThreshold: 1,
      category: 'Phones',
      isSerialized: true,
    },
    {
      sku: 'SKU-ACC-001',
      barcode: '8901234500031',
      name: 'Tempered Glass Screen Protector',
      costPrice: 80,
      sellPrice: 250,
      quantity: 60,
      lowStockThreshold: 10,
      category: 'Accessories',
      isSerialized: false,
    },
    {
      sku: 'SKU-ACC-002',
      barcode: '8901234500048',
      name: 'USB-C Fast Charger 20W',
      costPrice: 650,
      sellPrice: 1200,
      quantity: 25,
      lowStockThreshold: 5,
      category: 'Accessories',
      isSerialized: false,
    },
    {
      sku: 'SKU-ACC-003',
      barcode: '8901234500055',
      name: 'Silicone Phone Case',
      costPrice: 150,
      sellPrice: 450,
      quantity: 40,
      lowStockThreshold: 8,
      category: 'Accessories',
      isSerialized: false,
    },
  ];

  for (const product of sampleProducts) {
    await prisma.product.upsert({
      where: { sku: product.sku },
      create: product,
      update: {},
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
