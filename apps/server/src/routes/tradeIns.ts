import { Router } from 'express';
import { tradeInSchema } from '@pos/shared';
import { asyncHandler } from '../middleware/errorHandler.js';
import { requireAuth } from '../middleware/auth.js';
import {
  convertTradeInToInventory,
  createTradeIn,
  getTradeIn,
  listTradeIns,
} from '../services/tradeInService.js';
import { z } from 'zod';

const router = Router();

router.get(
  '/',
  requireAuth,
  asyncHandler(async (req, res) => {
    const status = typeof req.query.status === 'string' ? req.query.status : undefined;
    res.json(await listTradeIns(status));
  })
);

router.get(
  '/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    res.json(await getTradeIn(req.params.id));
  })
);

router.post(
  '/',
  requireAuth,
  asyncHandler(async (req, res) => {
    const input = tradeInSchema.parse(req.body);
    res.status(201).json(await createTradeIn(input));
  })
);

const convertSchema = z.object({
  name: z.string().min(1),
  sellPrice: z.number().positive(),
  wholesalePrice: z.number().positive().optional(),
  category: z.string().optional(),
});

router.post(
  '/:id/convert-to-stock',
  requireAuth,
  asyncHandler(async (req, res) => {
    const input = convertSchema.parse(req.body);
    res.status(201).json(await convertTradeInToInventory(req.params.id, input, req.session!.employeeId));
  })
);

export default router;
