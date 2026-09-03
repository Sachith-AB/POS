import { Router } from 'express';
import { supplierReturnSchema } from '@pos/shared';
import { asyncHandler } from '../middleware/errorHandler.js';
import { requireAuth } from '../middleware/auth.js';
import {
  createSupplierReturn,
  listSupplierReturns,
} from '../services/supplierReturnService.js';

const router = Router();

router.get(
  '/',
  requireAuth,
  asyncHandler(async (req, res) => {
    const supplierId = typeof req.query.supplierId === 'string' ? req.query.supplierId : undefined;
    res.json(await listSupplierReturns(supplierId));
  })
);

router.post(
  '/',
  requireAuth,
  asyncHandler(async (req, res) => {
    const input = supplierReturnSchema.parse(req.body);
    res.status(201).json(await createSupplierReturn(input, req.session!.employeeId));
  })
);

export default router;
