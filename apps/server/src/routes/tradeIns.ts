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
  name: z.string().optional(),
  sellPrice: z.number().positive().optional(),
  resaleSellPrice: z.number().positive().optional(),
  wholesalePrice: z.number().positive().optional(),
  category: z.string().optional(),
  sku: z.string().optional(),
  barcode: z.string().optional(),
});

async function handleConvert(req: any, res: any) {
  const input = convertSchema.parse(req.body);
  const sellPrice = input.sellPrice || input.resaleSellPrice;
  if (!sellPrice || sellPrice <= 0) {
    res.status(400).json({ error: 'Valid sell price or resale sell price is required' });
    return;
  }
  const result = await convertTradeInToInventory(
    req.params.id,
    {
      name: input.name || '',
      sellPrice,
      wholesalePrice: input.wholesalePrice,
      category: input.category,
      sku: input.sku,
      barcode: input.barcode,
    },
    req.session!.employeeId
  );
  res.status(201).json(result);
}

router.post(
  '/:id/convert-to-stock',
  requireAuth,
  asyncHandler(handleConvert)
);

router.post(
  '/:id/convert-resale',
  requireAuth,
  asyncHandler(handleConvert)
);

export default router;
