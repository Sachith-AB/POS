import { Router } from 'express';
import { quickCreateProductSchema, stockReceiveBatchSchema } from '@pos/shared';
import { asyncHandler } from '../middleware/errorHandler.js';
import { requireAuth } from '../middleware/auth.js';
import { quickCreateProduct, receiveStockBatch, listStockMovements } from '../services/stockService.js';

const router = Router();

router.get(
  '/',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { search, type, supplierId, productId, from, to, limit, offset } = req.query;
    const result = await listStockMovements({
      search: typeof search === 'string' ? search : undefined,
      type: typeof type === 'string' ? type : undefined,
      supplierId: typeof supplierId === 'string' ? supplierId : undefined,
      productId: typeof productId === 'string' ? productId : undefined,
      from: typeof from === 'string' ? from : undefined,
      to: typeof to === 'string' ? to : undefined,
      limit: limit ? Number(limit) : undefined,
      offset: offset ? Number(offset) : undefined,
    });
    res.json(result);
  })
);

router.post(
  '/receive',
  requireAuth,
  asyncHandler(async (req, res) => {
    const input = stockReceiveBatchSchema.parse(req.body);
    const results = await receiveStockBatch(input, req.session!.employeeId);
    res.status(201).json(results);
  })
);

router.post(
  '/quick-create-product',
  requireAuth,
  asyncHandler(async (req, res) => {
    const input = quickCreateProductSchema.parse(req.body);
    res.status(201).json(await quickCreateProduct(input));
  })
);

export default router;
