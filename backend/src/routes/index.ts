/**
 * Main routes aggregator
 * All module routers are mounted here.
 * Prefix: /api
 */
import { Router } from 'express';
import authRouter from '../modules/auth/auth.router';
import profilesRouter from '../modules/profiles/profiles.router';
import ordersRouter from '../modules/orders/orders.router';
import tasksRouter from '../modules/tasks/tasks.router';
import productsRouter from '../modules/products/products.router';
import customersRouter from '../modules/customers/customers.router';
import inventoryRouter from '../modules/inventory/inventory.router';
import shippingRouter from '../modules/shipping/shipping.router';
import suppliersRouter from '../modules/suppliers/suppliers.router';
import purchaseOrdersRouter from '../modules/purchase-orders/purchaseOrders.router';
import siteConfigRouter from '../modules/site-config/siteConfig.router';
import {
    expensesRouter,
    workstationsRouter,
    screenFramesRouter,
    qualityRouter,
    rolesRouter,
    dashboardRouter,
} from '../modules/misc/misc.routers';

const router = Router();

// Auth
router.use('/auth', authRouter);

// ERP — User management
router.use('/profiles', profilesRouter);

// Orders (ERP + Storefront)
router.use('/orders', ordersRouter);

// Production tasks
router.use('/tasks', tasksRouter);

// Products (ERP admin + Storefront public)
router.use('/products', productsRouter);

// Customers (ERP + Storefront checkout upsert)
router.use('/customers', customersRouter);

// Inventory
router.use('/inventory', inventoryRouter);

// Shipping rules (public for storefront checkout)
router.use('/shipping-rules', shippingRouter);

// Suppliers
router.use('/suppliers', suppliersRouter);

// Purchase orders
router.use('/purchase-orders', purchaseOrdersRouter);

// Site CMS config
router.use('/site-config', siteConfigRouter);

// Misc ERP modules
router.use('/expenses', expensesRouter);
router.use('/workstations', workstationsRouter);
router.use('/screen-frames', screenFramesRouter);
router.use('/quality', qualityRouter);
router.use('/roles', rolesRouter);
router.use('/dashboard', dashboardRouter);

export default router;
