import { readFileSync } from 'fs';
import { read, utils } from 'xlsx';
import { PrismaClient } from '@prisma/client';
import path from 'path';
import { fileURLToPath } from 'url';

const prisma = new PrismaClient();

// Get file path from command line
const EXCEL_FILE = process.argv[2];

if (!EXCEL_FILE) {
  console.error('❌ Usage: node import-odoo-products.mjs "path/to/your/file.xlsx"');
  process.exit(1);
}

async function main() {
  console.log(`\n📂 Reading Excel File: ${EXCEL_FILE}\n`);

  // Read Excel
  const wb = read(readFileSync(EXCEL_FILE));
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const rows = utils.sheet_to_json(sheet, { defval: '' });

  if (rows.length === 0) {
    console.log('\n⚠️ No data found in sheet.');
    process.exit(0);
  }

  console.log(`📊 Total rows found: ${rows.length}`);
  console.log(`⏳ Starting import into POS Database...\n`);

  let successCount = 0;
  let updateCount = 0;
  let errorCount = 0;
  let generatedSkuCount = 0;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    
    // Extract Odoo fields
    const name = row['Display Name'] ? String(row['Display Name']).trim() : 'Unnamed Product';
    const rawCategory = row['Product Category'] ? String(row['Product Category']).trim() : 'Uncategorized';
    let sku = row['Internal Reference'] ? String(row['Internal Reference']).trim() : '';
    const barcode = row['Barcode'] ? String(row['Barcode']).trim() : null;
    
    // Parse numbers (fallback to 0 if invalid)
    const costPrice = parseFloat(row['Cost']) || 0;
    const sellPrice = parseFloat(row['Sales Price']) || 0;
    const quantity = parseInt(row['Quantity On Hand']) || 0;
    const lowStockThreshold = parseInt(row['Reordering Min Qty']) || 3;
    
    // Determine Tracking
    const isSerialized = row['Tracking'] === 'By Unique Serial Number';

    try {
      // 1. Create category if it doesn't exist (and get ID)
      const categoryRec = await prisma.category.upsert({
        where: { name: rawCategory },
        update: {},
        create: { name: rawCategory }
      });

      // 2. Generate SKU if missing
      if (!sku) {
        sku = `OD-${Date.now().toString().slice(-6)}-${i}`; // Generate a unique fallback SKU
        generatedSkuCount++;
      }

      // 3. Upsert Product
      const product = await prisma.product.upsert({
        where: { sku: sku },
        update: {
          name,
          costPrice,
          sellPrice,
          quantity,
          category: categoryRec.name,
          categoryId: categoryRec.id,
          barcode: barcode || null,
          isSerialized,
          lowStockThreshold
        },
        create: {
          sku,
          name,
          costPrice,
          sellPrice,
          quantity,
          category: categoryRec.name,
          categoryId: categoryRec.id,
          barcode: barcode || null,
          isSerialized,
          lowStockThreshold
        }
      });

      console.log(`✅ [${i + 1}/${rows.length}] Processed: ${name} (SKU: ${sku})`);
      
      // Determine if it was created or updated (just an estimate based on createdAt vs updatedAt)
      if (product.createdAt.getTime() === product.updatedAt.getTime()) {
        successCount++;
      } else {
        updateCount++;
      }

    } catch (error) {
      console.error(`❌ [${i + 1}/${rows.length}] Error processing ${name}: ${error.message}`);
      errorCount++;
    }
  }

  console.log(`\n🎉 Import Complete!`);
  console.log(`------------------------`);
  console.log(`✨ Newly Created: ${successCount}`);
  console.log(`🔄 Updated (Upsert): ${updateCount}`);
  console.log(`🏷️ Auto-generated SKUs: ${generatedSkuCount}`);
  console.log(`⚠️ Errors: ${errorCount}`);
  console.log(`------------------------\n`);
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
