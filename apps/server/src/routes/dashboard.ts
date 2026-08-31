import { Router } from 'express';
import { asyncHandler } from '../middleware/errorHandler.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { getDashboardSummary, getSalesChartData } from '../services/dashboardService.js';

const router = Router();

router.get(
  '/summary',
  requireAuth,
  requireRole('OWNER'),
  asyncHandler(async (_req, res) => {
    res.json(await getDashboardSummary());
  })
);

router.get(
  '/sales-chart',
  requireAuth,
  requireRole('OWNER'),
  asyncHandler(async (_req, res) => {
    res.json(await getSalesChartData());
  })
);

export default router;
