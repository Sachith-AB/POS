import { Router } from 'express';
import { customerUpsertSchema, customerUpdateSchema, customerListQuerySchema } from '@pos/shared';
import { asyncHandler } from '../middleware/errorHandler.js';
import { requireAuth } from '../middleware/auth.js';
import {
  findCustomerByPhone,
  upsertCustomer,
  updateCustomer,
  listCustomers,
  getCustomerProfile,
  getCustomerOverviewDashboard,
} from '../services/customerService.js';

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

router.get(
  '/overview',
  requireAuth,
  asyncHandler(async (_req, res) => {
    res.json(await getCustomerOverviewDashboard());
  })
);

router.get(
  '/',
  requireAuth,
  asyncHandler(async (req, res) => {
    const parsed = customerListQuerySchema.parse({
      search: req.query.search,
      categoryId: req.query.categoryId,
      paymentStatus: req.query.paymentStatus,
      sortBy: req.query.sortBy,
      sortDir: req.query.sortDir,
      page: req.query.page ? Number(req.query.page) : undefined,
      limit: req.query.limit ? Number(req.query.limit) : undefined,
    });
    res.json(await listCustomers(parsed));
  })
);

router.get(
  '/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    res.json(await getCustomerProfile(req.params.id));
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

router.patch(
  '/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    const input = customerUpdateSchema.parse(req.body);
    res.json(await updateCustomer(req.params.id, input));
  })
);

export default router;
