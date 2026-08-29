import { Router } from 'express';
import { labelPrintRequestSchema } from '@pos/shared';
import { asyncHandler } from '../middleware/errorHandler.js';
import { requireAuth } from '../middleware/auth.js';
import { generateLabels } from '../services/labelService.js';

const router = Router();

router.post(
  '/',
  requireAuth,
  asyncHandler(async (req, res) => {
    const input = labelPrintRequestSchema.parse(req.body);
    res.json(await generateLabels(input));
  })
);

export default router;
