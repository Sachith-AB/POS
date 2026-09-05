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
import categoryRoutes from './categories.js';
import warrantyRoutes from './warranties.js';
import supplierRoutes from './suppliers.js';
import supplierReturnRoutes from './supplierReturns.js';
import tradeInRoutes from './tradeIns.js';
import outsourcedRepairRoutes from './outsourcedRepairs.js';
import agreementRoutes from './agreements.js';
import customerCategoryRoutes from './customerCategories.js';
import defaultActionRoutes from './defaultActions.js';

const router = Router();

router.use('/settings', settingsRoutes);
router.use('/auth', authRoutes);
router.use('/products', productRoutes);
router.use('/stock-movements', stockRoutes);
router.use('/labels', labelRoutes);
router.use('/sales', saleRoutes);
router.use('/customers', customerRoutes);
router.use('/customer-categories', customerCategoryRoutes);
router.use('/repairs', repairRoutes);
router.use('/installments', installmentRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/reports', reportsRoutes);
router.use('/categories', categoryRoutes);
router.use('/warranties', warrantyRoutes);
router.use('/suppliers', supplierRoutes);
router.use('/supplier-returns', supplierReturnRoutes);
router.use('/trade-ins', tradeInRoutes);
router.use('/outsourced-repairs', outsourcedRepairRoutes);
router.use('/agreements', agreementRoutes);
router.use('/default-actions', defaultActionRoutes);

export default router;


