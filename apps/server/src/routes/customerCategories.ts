import { Router } from 'express';
import { customerCategorySchema } from '@pos/shared';
import { asyncHandler } from '../middleware/errorHandler.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import {
  listCustomerCategories,
  createCustomerCategory,
  updateCustomerCategory,
  deleteCustomerCategory,
} from '../services/customerCategoryService.js';

const router = Router();

router.get(
  '/',
  requireAuth,
  asyncHandler(async (_req, res) => {
    res.json(await listCustomerCategories());
  })
);

router.post(
  '/',
  requireAuth,
  requireRole('OWNER'),
  asyncHandler(async (req, res) => {
    const input = customerCategorySchema.parse(req.body);
    res.status(201).json(await createCustomerCategory(input));
  })
);

router.patch(
  '/:id',
  requireAuth,
  requireRole('OWNER'),
  asyncHandler(async (req, res) => {
    const input = customerCategorySchema.partial().parse(req.body);
    res.json(await updateCustomerCategory(req.params.id, input));
  })
);

router.delete(
  '/:id',
  requireAuth,
  requireRole('OWNER'),
  asyncHandler(async (req, res) => {
    res.json(await deleteCustomerCategory(req.params.id));
  })
);

export default router;
