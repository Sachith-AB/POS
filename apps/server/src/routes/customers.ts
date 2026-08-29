import { Router } from 'express';
import { customerUpsertSchema } from '@pos/shared';
import { asyncHandler } from '../middleware/errorHandler.js';
import { requireAuth } from '../middleware/auth.js';
import { findCustomerByPhone, upsertCustomer } from '../services/customerService.js';

const router = Router();

router.get(
  '/lookup',
  requireAuth,
  asyncHandler(async (req, res) => {
    const phone = typeof req.query.phone === 'string' ? req.query.phone : '';
    if (!phone) return res.json(null);
    res.json(await findCustomerByPhone(phone));
  })
);

router.post(
  '/',
  requireAuth,
  asyncHandler(async (req, res) => {
    const input = customerUpsertSchema.parse(req.body);
    res.status(201).json(await upsertCustomer(input));
  })
);

export default router;
