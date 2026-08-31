import { Router } from 'express';
import { asyncHandler } from '../middleware/errorHandler.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { getSlowMovingStock } from '../services/reportsService.js';

const router = Router();

router.get(
  '/slow-stock',
  requireAuth,
  requireRole('OWNER'),
  asyncHandler(async (req, res) => {
    const days = req.query.days ? Number(req.query.days) : undefined;
    res.json(await getSlowMovingStock(days));
  })
);

export default router;
