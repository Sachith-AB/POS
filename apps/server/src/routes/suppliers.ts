import { Router } from 'express';
import { supplierSchema, supplierTransactionSchema } from '@pos/shared';
import { asyncHandler } from '../middleware/errorHandler.js';
import { requireAuth } from '../middleware/auth.js';
import {
  createSupplier,
  getSupplier,
  listSuppliers,
  recordSupplierTransaction,
  updateSupplier,
} from '../services/supplierService.js';

const router = Router();

router.get(
  '/',
  requireAuth,
  asyncHandler(async (req, res) => {
    const search = typeof req.query.search === 'string' ? req.query.search : undefined;
    res.json(await listSuppliers(search));
  })
);

router.get(
  '/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    res.json(await getSupplier(req.params.id));
  })
);

router.post(
  '/',
  requireAuth,
  asyncHandler(async (req, res) => {
    const input = supplierSchema.parse(req.body);
    res.status(201).json(await createSupplier(input));
  })
);

router.patch(
  '/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    const input = supplierSchema.partial().parse(req.body);
    res.json(await updateSupplier(req.params.id, input));
  })
);

router.post(
  '/transactions',
  requireAuth,
  asyncHandler(async (req, res) => {
    const input = supplierTransactionSchema.parse(req.body);
    res.status(201).json(await recordSupplierTransaction(input));
  })
);

export default router;
