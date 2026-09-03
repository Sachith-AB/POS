import { Router } from 'express';
import { warrantyPeriodSchema } from '@pos/shared';
import { asyncHandler } from '../middleware/errorHandler.js';
import { requireAuth } from '../middleware/auth.js';
import {
  checkWarrantyStatus,
  createWarrantyPeriod,
  deleteWarrantyPeriod,
  listWarrantyPeriods,
  updateWarrantyPeriod,
} from '../services/warrantyService.js';

const router = Router();

router.get(
  '/',
  requireAuth,
  asyncHandler(async (req, res) => {
    const appliesToSales = req.query.sales === 'true' ? true : undefined;
    const appliesToRepairs = req.query.repairs === 'true' ? true : undefined;
    res.json(await listWarrantyPeriods({ appliesToSales, appliesToRepairs }));
  })
);

router.get(
  '/check/:saleId',
  requireAuth,
  asyncHandler(async (req, res) => {
    res.json(await checkWarrantyStatus(req.params.saleId));
  })
);

router.post(
  '/',
  requireAuth,
  asyncHandler(async (req, res) => {
    const input = warrantyPeriodSchema.parse(req.body);
    res.status(201).json(await createWarrantyPeriod(input));
  })
);

router.patch(
  '/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    const input = warrantyPeriodSchema.partial().parse(req.body);
    res.json(await updateWarrantyPeriod(req.params.id, input));
  })
);

router.delete(
  '/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    res.json(await deleteWarrantyPeriod(req.params.id));
  })
);

export default router;
