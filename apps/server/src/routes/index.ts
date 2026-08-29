import { Router } from 'express';
import settingsRoutes from './settings.js';
import authRoutes from './auth.js';
import productRoutes from './products.js';
import stockRoutes from './stock.js';
import labelRoutes from './labels.js';
import saleRoutes from './sales.js';
import customerRoutes from './customers.js';

const router = Router();

router.use('/settings', settingsRoutes);
router.use('/auth', authRoutes);
router.use('/products', productRoutes);
router.use('/stock-movements', stockRoutes);
router.use('/labels', labelRoutes);
router.use('/sales', saleRoutes);
router.use('/customers', customerRoutes);

export default router;
