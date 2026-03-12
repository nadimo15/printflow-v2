import { Router } from 'express';
import { authenticate, authorize } from '../../middleware/auth';
import * as ctrl from './orders.controller';

const router = Router();

// Public order tracking
// GET /api/orders/track/:orderNumber
router.get('/track/:orderNumber', ctrl.track);

// POST /api/orders — Create new order (Public for storefront)
router.post('/', ctrl.create);

// GET /api/orders — List all orders (admin + manager)
router.get('/', authenticate, authorize('admin', 'manager'), ctrl.list);

// GET /api/orders/production — List production-eligible orders
router.get('/production', authenticate, authorize('admin', 'manager'), ctrl.listProductionEligible);

// GET /api/orders/:id — Get order by ID
router.get('/:id', authenticate, authorize('admin', 'manager'), ctrl.getById);

// PATCH /api/orders/:id/status — Update order status
router.patch('/:id/status', authenticate, authorize('admin', 'manager'), ctrl.updateStatus);

// PATCH /api/orders/:id/fields — Update order fields (notes, payment_status, tracking, etc.)
router.patch('/:id/fields', authenticate, authorize('admin', 'manager'), ctrl.updateFields);

// DELETE /api/orders/:id — Soft-delete (cancel)
router.delete('/:id', authenticate, authorize('admin', 'manager'), ctrl.softDelete);

// PUT /api/orders/:id/items — Replace all order items
router.put('/:id/items', authenticate, authorize('admin', 'manager'), ctrl.replaceItems);

export default router;
