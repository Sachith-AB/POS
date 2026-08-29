import { Router } from 'express';
import { saleCreateSchema, paymentCreateSchema } from '@pos/shared';
import { asyncHandler } from '../middleware/errorHandler.js';
import { requireAuth } from '../middleware/auth.js';
import { completeSale, createSale, getSale, listParkedSales, updateSaleItems, voidSale } from '../services/saleService.js';

const router = Router();

router.get(
  '/parked',
  requireAuth,
  asyncHandler(async (req, res) => {
    res.json(await listParkedSales(req.session!.employeeId));
  })
);

router.get(
  '/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    res.json(await getSale(req.params.id));
  })
);

router.post(
  '/',
  requireAuth,
  asyncHandler(async (req, res) => {
    const input = saleCreateSchema.parse(req.body);
    res.status(201).json(await createSale(input, req.session!.employeeId));
  })
);

const updateSchema = saleCreateSchema.pick({ items: true, discount: true, customerId: true });

router.patch(
  '/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    const input = updateSchema.parse(req.body);
    res.json(await updateSaleItems(req.params.id, input));
  })
);

const completeSchema = paymentCreateSchema.omit({ saleId: true });

router.post(
  '/:id/complete',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { amount, method } = completeSchema.parse(req.body);
    res.json(await completeSale(req.params.id, req.session!.employeeId, amount, method));
  })
);

router.post(
  '/:id/void',
  requireAuth,
  asyncHandler(async (req, res) => {
    res.json(await voidSale(req.params.id, req.session!.employeeId));
  })
);

export default router;
