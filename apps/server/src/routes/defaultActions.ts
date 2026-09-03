import { Router } from 'express';
import { defaultActionSchema } from '@pos/shared';
import { asyncHandler } from '../middleware/errorHandler.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import {
  createDefaultAction,
  deleteDefaultAction,
  listDefaultActions,
  updateDefaultAction,
} from '../services/defaultActionService.js';

const router = Router();

router.get(
  '/',
  requireAuth,
  asyncHandler(async (_req, res) => {
    res.json(await listDefaultActions());
  })
);

router.post(
  '/',
  requireAuth,
  requireRole('OWNER'),
  asyncHandler(async (req, res) => {
    const input = defaultActionSchema.parse(req.body);
    res.status(201).json(await createDefaultAction(input));
  })
);

router.patch(
  '/:id',
  requireAuth,
  requireRole('OWNER'),
  asyncHandler(async (req, res) => {
    const input = defaultActionSchema.partial().parse(req.body);
    res.json(await updateDefaultAction(req.params.id, input));
  })
);

router.delete(
  '/:id',
  requireAuth,
  requireRole('OWNER'),
  asyncHandler(async (req, res) => {
    res.json(await deleteDefaultAction(req.params.id));
  })
);

export default router;
