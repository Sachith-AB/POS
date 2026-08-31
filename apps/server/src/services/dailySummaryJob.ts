import { getDashboardSummary } from './dashboardService.js';
import { sendSms } from './smsService.js';

export async function runDailySummaryJob() {
  const ownerPhone = process.env.OWNER_PHONE;
  if (!ownerPhone) {
    console.warn('[Daily Summary Job] OWNER_PHONE is not configured. Skipping summary dispatch.');
    return;
  }

  console.log('[Daily Summary Job] Retrieving metrics summary...');
  const summary = await getDashboardSummary();

  const todayStr = new Date().toLocaleDateString(undefined, {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  // Format daily summary report
  const message = 
    `📊 Store Daily Summary — ${todayStr}\n` +
    `---------------------------\n` +
    `Completed Sales: ${summary.today.salesCount} bills\n` +
    `Today's Revenue: Rs ${summary.today.revenue.toFixed(2)}\n` +
    `Today's Gross Profit: Rs ${summary.today.profit.toFixed(2)}\n` +
    `---------------------------\n` +
    `Inventory Health:\n` +
    `· Tied Up Capital: Rs ${summary.stock.totalValue.toFixed(2)}\n` +
    `· Low Stock Warnings: ${summary.stock.lowStockCount} items\n` +
    `---------------------------\n` +
    `Repairs & Credit Status:\n` +
    `· Pending Repairs: ${summary.repairs.activeCount} devices\n` +
    `· Overdue Installments: ${summary.installments.overdueCount} ($Rs ${summary.installments.overdueValue.toFixed(2)})\n` +
    `---------------------------\n` +
    `Top Product Today: ${
      summary.topSellingProducts.length > 0
        ? `${summary.topSellingProducts[0].name} (${summary.topSellingProducts[0].quantity} sold)`
        : 'No products sold'
    }`;

  console.log('[Daily Summary Job] Dispatching report to owner...');
  await sendSms(ownerPhone, message);
}
