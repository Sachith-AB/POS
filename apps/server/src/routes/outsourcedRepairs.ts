import { Router } from 'express';
import { outsourcedRepairSchema } from '@pos/shared';
import { asyncHandler } from '../middleware/errorHandler.js';
import { requireAuth } from '../middleware/auth.js';
import {
  createOutsourcedRepair,
  listOutsourcedRepairs,
  updateOutsourcedRepair,
} from '../services/outsourcedRepairService.js';

const router = Router();

router.get(
  '/',
  requireAuth,
  asyncHandler(async (req, res) => {
    const status = typeof req.query.status === 'string' ? req.query.status : undefined;
    res.json(await listOutsourcedRepairs(status));
  })
);

router.post(
  '/',
  requireAuth,
  asyncHandler(async (req, res) => {
    const input = outsourcedRepairSchema.parse(req.body);
    res.status(201).json(await createOutsourcedRepair(input));
  })
);

router.patch(
  '/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    const input = outsourcedRepairSchema.partial().parse(req.body);
    res.json(await updateOutsourcedRepair(req.params.id, input));
  })
);

export default router;
