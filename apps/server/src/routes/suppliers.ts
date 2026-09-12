import { Router } from 'express';
import { supplierSchema, supplierTransactionSchema } from '@pos/shared';
import { asyncHandler } from '../middleware/errorHandler.js';
import { requireAuth } from '../middleware/auth.js';
import {
  createSupplier,
  deleteSupplier,
  getSupplier,
  listAllSupplierTransactions,
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
  '/transactions',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { supplierId, type, search, from, to, limit, offset } = req.query;
    const result = await listAllSupplierTransactions({
      supplierId: typeof supplierId === 'string' ? supplierId : undefined,
      type: typeof type === 'string' ? type : undefined,
      search: typeof search === 'string' ? search : undefined,
      from: typeof from === 'string' ? from : undefined,
      to: typeof to === 'string' ? to : undefined,
      limit: limit ? Number(limit) : undefined,
      offset: offset ? Number(offset) : undefined,
    });
    res.json(result);
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
    if (input.email === '') input.email = null;
    res.status(201).json(await createSupplier(input));
  })
);

router.patch(
  '/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    const input = supplierSchema.partial().parse(req.body);
    if (input.email === '') input.email = null;
    res.json(await updateSupplier(req.params.id, input));
  })
);

router.delete(
  '/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    res.json(await deleteSupplier(req.params.id));
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

router.post(
  '/:id/payments',
  requireAuth,
  asyncHandler(async (req, res) => {
    const amount = Number(req.body.amount);
    const result = await recordSupplierTransaction({
      supplierId: req.params.id,
      type: 'PAYMENT',
      amount,
      reference: req.body.reference || null,
      notes: req.body.notes || (req.body.paymentMethod ? `Payment via ${req.body.paymentMethod}` : null),
    });
    res.status(201).json(result);
  })
);

export default router;
