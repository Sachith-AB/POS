import { Router } from 'express';
import settingsRoutes from './settings.js';
import authRoutes from './auth.js';
import productRoutes from './products.js';
import stockRoutes from './stock.js';
import labelRoutes from './labels.js';
import saleRoutes from './sales.js';
import customerRoutes from './customers.js';
import repairRoutes from './repairs.js';
import installmentRoutes from './installments.js';
import dashboardRoutes from './dashboard.js';
import reportsRoutes from './reports.js';

const router = Router();

router.use('/settings', settingsRoutes);
router.use('/auth', authRoutes);
router.use('/products', productRoutes);
router.use('/stock-movements', stockRoutes);
router.use('/labels', labelRoutes);
router.use('/sales', saleRoutes);
router.use('/customers', customerRoutes);
router.use('/repairs', repairRoutes);
router.use('/installments', installmentRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/reports', reportsRoutes);



export default router;

