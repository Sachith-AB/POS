import { Router } from 'express';
import multer from 'multer';
import path from 'node:path';
import fs from 'node:fs';
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

const uploadsDir = process.env.UPLOADS_DIR ?? './uploads';
const guarantorsUploadsDir = path.join(uploadsDir, 'guarantors');

if (!fs.existsSync(guarantorsUploadsDir)) {
  fs.mkdirSync(guarantorsUploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, guarantorsUploadsDir);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname) || '.jpg';
    cb(null, `guarantor-${uniqueSuffix}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
});

router.post(
  '/upload-photo',
  requireAuth,
  upload.single('photo'),
  asyncHandler(async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: 'No photo uploaded' });
    }
    const photoUrl = `/uploads/guarantors/${req.file.filename}`;
    res.json({ url: photoUrl });
  })
);

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

import { INSTALLMENT_PAYMENT_METHODS } from '@pos/shared';

// 4. Record installment payment
const recordPaymentPayload = installmentPaymentSchema.extend({
  method: z.enum(INSTALLMENT_PAYMENT_METHODS),
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
