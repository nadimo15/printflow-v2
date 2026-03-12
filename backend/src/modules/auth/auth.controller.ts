/**
 * Auth module — Controller layer
 * Handles request/response for auth routes.
 */
import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import * as authService from './auth.service';

const loginSchema = z.object({
    email: z.string().email('Invalid email format'),
    password: z.string().min(1, 'Password is required'),
});

const registerSchema = z.object({
    email: z.string().email('Invalid email format'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    name: z.string().min(1, 'Name is required'),
    role: z.enum(['admin', 'manager', 'worker', 'designer']).optional(),
    phone: z.string().optional(),
});

export async function login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const parsed = loginSchema.safeParse(req.body);
        if (!parsed.success) {
            res.status(400).json({
                success: false,
                error: { message: parsed.error.errors[0].message, status: 400 },
            });
            return;
        }
        const result = await authService.loginUser(parsed.data.email, parsed.data.password);
        res.json({ success: true, data: result });
    } catch (err) {
        next(err);
    }
}

export async function register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const parsed = registerSchema.safeParse(req.body);
        if (!parsed.success) {
            res.status(400).json({
                success: false,
                error: { message: parsed.error.errors[0].message, status: 400 },
            });
            return;
        }
        const user = await authService.registerUser(parsed.data);
        res.status(201).json({ success: true, data: user });
    } catch (err) {
        next(err);
    }
}

export async function logout(_req: Request, res: Response, _next: NextFunction): Promise<void> {
    // JWT is stateless — logout is handled client-side by discarding the token.
    // If needed in future, add a token blacklist here (Redis recommended).
    res.json({ success: true, message: 'Logged out successfully.' });
}

export async function me(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const user = await authService.getMe(req.user!.id);
        res.json({ success: true, data: user });
    } catch (err) {
        next(err);
    }
}
