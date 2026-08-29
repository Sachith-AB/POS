import { Router } from 'express';
import { quickCreateProductSchema, stockReceiveBatchSchema } from '@pos/shared';
import { asyncHandler } from '../middleware/errorHandler.js';
import { requireAuth } from '../middleware/auth.js';
import { quickCreateProduct, receiveStockBatch } from '../services/stockService.js';

const router = Router();

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
