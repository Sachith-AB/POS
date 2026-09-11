import { Router } from 'express';
import { asyncHandler } from '../middleware/errorHandler.js';
import { requireAuth } from '../middleware/auth.js';
import {
  lookupAgreementByBarcode,
  renderAgreementBarcodePng,
} from '../services/agreementBarcodeService.js';

const router = Router();

// Lookup agreement details by barcode scan (Q10)
router.get(
  '/lookup/:barcode',
  requireAuth,
  asyncHandler(async (req, res) => {
    res.json(await lookupAgreementByBarcode(req.params.barcode));
  })
);

// Render barcode PNG for sticker printing (Q10)
router.get(
  '/barcode/:code',
  requireAuth,
  asyncHandler(async (req, res) => {
    const png = await renderAgreementBarcodePng(req.params.code);
    res.setHeader('Content-Type', 'image/png');
    res.send(png);
  })
);

// Get barcode Data URL directly for seamless in-app sticker rendering & printing
router.get(
  '/barcode-dataurl/:code',
  requireAuth,
  asyncHandler(async (req, res) => {
    const png = await renderAgreementBarcodePng(req.params.code);
    const dataUrl = `data:image/png;base64,${png.toString('base64')}`;
    res.json({ dataUrl });
  })
);

export default router;
