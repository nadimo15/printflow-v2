/**
 * Profiles module — Router (Admin only)
 */
import { Router } from 'express';
import { authenticate, authorize } from '../../middleware/auth';
import * as ctrl from './profiles.controller';

const router = Router();

// All profile management routes require authentication + admin role
router.use(authenticate, authorize('admin'));

// GET /api/profiles — List all users
router.get('/', ctrl.list);

// GET /api/profiles/:id — Get user by ID
router.get('/:id', ctrl.getById);

// POST /api/profiles — Create new user (admin_create_user_rpc equivalent)
router.post('/', ctrl.create);

// PUT /api/profiles/:id — Update user (admin_update_user_rpc equivalent)
router.put('/:id', ctrl.update);

// DELETE /api/profiles/:id — Soft-delete (deactivate)
router.delete('/:id', ctrl.deactivate);

// POST /api/profiles/:id/reactivate — Reactivate user
router.post('/:id/reactivate', ctrl.reactivate);

export default router;
