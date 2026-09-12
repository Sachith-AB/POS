/**
 * POS Sticker & Document Print Utilities
 * Uses hidden iframe printing to avoid popup blocker issues and prevent
 * interfering with the main application's layout and styles.
 */

export function printHtmlViaIframe(htmlContent: string): void {
  // Remove any previously injected print iframe
  const existing = document.getElementById('pos-print-frame');
  if (existing) {
    existing.remove();
  }

  const iframe = document.createElement('iframe');
  iframe.id = 'pos-print-frame';
  iframe.setAttribute('style', 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden;');
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document;
  if (!doc) {
    console.error('Print failed: cannot access iframe document');
    return;
  }

  doc.open();
  doc.write(htmlContent);
  doc.close();

  const win = iframe.contentWindow;
  if (!win) return;

  // Ensure images and fonts have rendered before triggering print
  setTimeout(() => {
    try {
      win.focus();
      win.print();
    } catch (err) {
      console.error('Error invoking print dialog:', err);
    } finally {
      setTimeout(() => {
        iframe.remove();
      }, 3000);
    }
  }, 350);
}

export interface AgreementStickerParams {
  barcode: string;
  customerName: string;
  date: string;
  totalAmount: string;
  barcodeDataUrl?: string;
  companyName?: string;
}

export function generateAgreementStickerHtml(params: AgreementStickerParams): string {
  const { barcode, customerName, date, totalAmount, barcodeDataUrl, companyName } = params;

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Agreement Sticker - ${barcode}</title>
  <style>
    @page {
      size: 50mm 30mm;
      margin: 0;
    }
    *, *::before, *::after {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    body {
      width: 50mm;
      height: 30mm;
      padding: 1.5mm 2.5mm;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
      text-align: center;
      background: #ffffff;
      color: #000000;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }
    .header {
      border-bottom: 1px dashed #000000;
      padding-bottom: 1px;
    }
    .company {
      font-size: 7.5px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      line-height: 1;
    }
    .badge {
      font-size: 6.5px;
      font-weight: 700;
      letter-spacing: 0.3px;
      text-transform: uppercase;
      color: #333333;
    }
    .barcode-area {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      margin: 1px 0;
    }
    .barcode-img {
      max-width: 44mm;
      height: 13mm;
      object-fit: contain;
      display: block;
    }
    .barcode-text-fallback {
      font-size: 13px;
      font-weight: 900;
      letter-spacing: 2px;
      font-family: monospace;
      padding: 2px 4px;
      border: 1.5px solid #000;
    }
    .details {
      border-top: 1px solid #cccccc;
      padding-top: 1px;
      font-size: 7px;
      line-height: 1.25;
      text-align: left;
    }
    .details-row {
      display: flex;
      justify-content: space-between;
      white-space: nowrap;
    }
    .bold {
      font-weight: 700;
    }
    .truncate {
      max-width: 25mm;
      overflow: hidden;
      text-overflow: ellipsis;
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="company">${companyName || 'PHYSICAL AGREEMENT'}</div>
    <div class="badge">INSTALLMENT CONTRACT STICKER</div>
  </div>

  <div class="barcode-area">
    ${
      barcodeDataUrl
        ? `<img src="${barcodeDataUrl}" class="barcode-img" alt="${barcode}" />`
        : `<div class="barcode-text-fallback">*${barcode}*</div>`
    }
  </div>

  <div class="details">
    <div class="details-row">
      <span class="truncate"><strong>Cust:</strong> ${customerName}</span>
      <span><strong>Date:</strong> ${date}</span>
    </div>
    <div class="details-row">
      <span><strong>Agr:</strong> ${barcode}</span>
      <span class="bold">Due: Rs ${totalAmount}</span>
    </div>
  </div>
</body>
</html>`;
}

export interface ProductLabelItem {
  productId: string;
  name: string;
  barcode: string;
  sku: string;
  sellPrice: number;
  imageDataUrl: string;
  quantity: number;
}

export interface ProductLabelOptions {
  size: '38x25' | '50x30' | 'sheet';
  shopName?: string;
  showPrice?: boolean;
  showShopName?: boolean;
}

export function generateProductLabelsHtml(
  labels: ProductLabelItem[],
  options: ProductLabelOptions
): string {
  const { size, shopName = 'RETAIL STORE', showPrice = true, showShopName = true } = options;
  const isSheet = size === 'sheet';
  const labelWidth = size === '50x30' ? '50mm' : '38mm';
  const labelHeight = size === '50x30' ? '30mm' : '25mm';
  const barcodeHeight = size === '50x30' ? '12mm' : '9.5mm';
  const nameSize = size === '50x30' ? '7.5px' : '6.5px';
  const priceSize = size === '50x30' ? '8.5px' : '7.5px';

  // Expand items by quantity
  const allStickers: Array<{ name: string; barcode: string; price: number; imageDataUrl: string }> = [];
  for (const label of labels) {
    const qty = Math.max(1, label.quantity || 1);
    for (let i = 0; i < qty; i++) {
      allStickers.push({
        name: label.name,
        barcode: label.barcode || label.sku,
        price: label.sellPrice || 0,
        imageDataUrl: label.imageDataUrl,
      });
    }
  }

  const stickersHtml = allStickers
    .map(
      (s) => `
    <div class="sticker">
      ${showShopName ? `<div class="shop-name">${shopName}</div>` : ''}
      <div class="prod-name" title="${s.name}">${s.name}</div>
      <div class="barcode-wrapper">
        <img src="${s.imageDataUrl}" class="barcode-img" alt="${s.barcode}" />
      </div>
      ${showPrice ? `<div class="price-tag">Rs ${s.price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>` : ''}
    </div>`
    )
    .join('\n');

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Barcode Labels (${allStickers.length} stickers)</title>
  <style>
    @page {
      size: ${isSheet ? 'A4 portrait' : `${labelWidth} ${labelHeight}`};
      margin: ${isSheet ? '8mm' : '0'};
    }
    *, *::before, *::after {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    body {
      background: #ffffff;
      color: #000000;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
      ${
        isSheet
          ? `display: flex; flex-wrap: wrap; gap: 3mm; align-content: flex-start; justify-content: flex-start;`
          : `margin: 0; padding: 0;`
      }
    }
    .sticker {
      width: ${labelWidth};
      height: ${labelHeight};
      padding: 1.2mm 2mm;
      box-sizing: border-box;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: space-between;
      text-align: center;
      overflow: hidden;
      background: #ffffff;
      ${
        isSheet
          ? `border: 1px dashed #bbbbbb; border-radius: 2px; break-inside: avoid; page-break-inside: avoid; margin-bottom: 2mm;`
          : `page-break-after: always; break-after: page;`
      }
    }
    .shop-name {
      font-size: 6px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.4px;
      line-height: 1;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 100%;
    }
    .prod-name {
      font-size: ${nameSize};
      font-weight: 700;
      line-height: 1.15;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 100%;
      color: #111111;
    }
    .barcode-wrapper {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 100%;
      margin: 0.5mm 0;
    }
    .barcode-img {
      max-width: calc(${labelWidth} - 3mm);
      height: ${barcodeHeight};
      object-fit: contain;
      display: block;
    }
    .price-tag {
      font-size: ${priceSize};
      font-weight: 800;
      letter-spacing: 0.2px;
      line-height: 1;
      color: #000000;
    }
  </style>
</head>
<body>
  ${stickersHtml}
</body>
</html>`;
}
