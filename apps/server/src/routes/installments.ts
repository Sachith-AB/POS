import { Router } from 'express';
import { installmentPlanCreateSchema, installmentPaymentSchema } from '@pos/shared';
import { asyncHandler } from '../middleware/errorHandler.js';
import { requireAuth } from '../middleware/auth.js';
import {
  createInstallmentPlan,
  getInstallmentPlan,
  listInstallmentPlans,
  recordInstallmentPayment,
} from '../services/installmentService.js';
import { z } from 'zod';

const router = Router();

// 1. List installment plans
router.get(
  '/',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { status, page, limit } = req.query;
    const result = await listInstallmentPlans({
      status: status as string,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
    res.json(result);
  })
);

// 2. Get installment plan details
router.get(
  '/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    res.json(await getInstallmentPlan(req.params.id));
  })
);

// 3. Create installment plan
router.post(
  '/',
  requireAuth,
  asyncHandler(async (req, res) => {
    const input = installmentPlanCreateSchema.parse(req.body);
    const plan = await createInstallmentPlan(input);
    res.status(201).json(plan);
  })
);

// 4. Record installment payment
const recordPaymentPayload = installmentPaymentSchema.extend({
  method: z.enum(['CASH', 'CARD', 'BANK_TRANSFER', 'EZ_CASH_ONLINE']),
});

router.post(
  '/:id/pay',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { amount, method } = recordPaymentPayload.parse(req.body);
    const plan = await recordInstallmentPayment(req.params.id, amount, method);
    res.json(plan);
  })
);

export default router;
