/**
 * Auth module — Router
 */
import { Router } from 'express';
import { authenticate } from '../../middleware/auth';
import * as authController from './auth.controller';

const router = Router();

// POST /api/auth/login
router.post('/login', authController.login);

// POST /api/auth/register
router.post('/register', authController.register);

// POST /api/auth/logout
router.post('/logout', authController.logout);

// GET /api/auth/me — requires authentication
router.get('/me', authenticate, authController.me);

export default router;
