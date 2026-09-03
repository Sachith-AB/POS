import { Router } from 'express';
import { categorySchema } from '@pos/shared';
import { asyncHandler } from '../middleware/errorHandler.js';
import { requireAuth } from '../middleware/auth.js';
import {
  createCategory,
  deleteCategory,
  listCategories,
  updateCategory,
} from '../services/categoryService.js';

const router = Router();

router.get(
  '/',
  requireAuth,
  asyncHandler(async (_req, res) => {
    res.json(await listCategories());
  })
);

router.post(
  '/',
  requireAuth,
  asyncHandler(async (req, res) => {
    const input = categorySchema.parse(req.body);
    res.status(201).json(await createCategory(input));
  })
);

router.patch(
  '/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    const input = categorySchema.partial().parse(req.body);
    res.json(await updateCategory(req.params.id, input));
  })
);

router.delete(
  '/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    res.json(await deleteCategory(req.params.id));
  })
);

export default router;
