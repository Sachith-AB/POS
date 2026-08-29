import { Router } from 'express';
import { productCreateSchema, productUpdateSchema } from '@pos/shared';
import { asyncHandler, HttpError } from '../middleware/errorHandler.js';
import { requireAuth } from '../middleware/auth.js';
import {
  createProduct,
  getProductByBarcode,
  listDeadStock,
  listLowStock,
  listProducts,
  updateProduct,
} from '../services/productService.js';

const router = Router();

router.get(
  '/',
  requireAuth,
  asyncHandler(async (req, res) => {
    const search = typeof req.query.search === 'string' ? req.query.search : undefined;
    const category = typeof req.query.category === 'string' ? req.query.category : undefined;
    res.json(await listProducts({ search, category }));
  })
);

router.get(
  '/low-stock',
  requireAuth,
  asyncHandler(async (_req, res) => {
    res.json(await listLowStock());
  })
);

router.get(
  '/dead-stock',
  requireAuth,
  asyncHandler(async (req, res) => {
    const months = req.query.months ? Number(req.query.months) : 3;
    res.json(await listDeadStock(months));
  })
);

router.get(
  '/barcode/:barcode',
  requireAuth,
  asyncHandler(async (req, res) => {
    const product = await getProductByBarcode(req.params.barcode);
    if (!product) throw new HttpError(404, 'Product not found');
    res.json(product);
  })
);

router.post(
  '/',
  requireAuth,
  asyncHandler(async (req, res) => {
    const input = productCreateSchema.parse(req.body);
    res.status(201).json(await createProduct(input));
  })
);

router.patch(
  '/:id',
  requireAuth,
  asyncHandler(async (req, res) => {
    const input = productUpdateSchema.parse(req.body);
    res.json(await updateProduct(req.params.id, input));
  })
);

export default router;
