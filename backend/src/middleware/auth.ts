/**
 * JWT Authentication Middleware
 * Protects routes by verifying the Bearer token.
 * Sets req.user = { id, email, role } on success.
 */
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/env';
import { AppError } from './errorHandler';

export interface JWTPayload {
    id: string;
    email: string;
    role: string;
}

// Extend Express Request type
declare global {
    namespace Express {
        interface Request {
            user?: JWTPayload;
        }
    }
}

export function authenticate(req: Request, _res: Response, next: NextFunction): void {
    const authHeader = req.headers['authorization'];
    if (!authHeader?.startsWith('Bearer ')) {
        return next(new AppError('Authentication required. Provide a Bearer token.', 401));
    }

    const token = authHeader.split(' ')[1];
    try {
        const payload = jwt.verify(token, config.jwtSecret) as JWTPayload;
        req.user = payload;
        next();
    } catch {
        next(new AppError('Invalid or expired token.', 401));
    }
}

/**
 * Role-based access control middleware
 * Use after authenticate()
 * Example: router.get('/team', authenticate, authorize('admin'), handler)
 */
export function authorize(...allowedRoles: string[]) {
    return (req: Request, _res: Response, next: NextFunction): void => {
        if (!req.user) {
            return next(new AppError('Authentication required.', 401));
        }
        if (!allowedRoles.includes(req.user.role)) {
            return next(
                new AppError(`Access denied. Requires role: ${allowedRoles.join(' or ')}.`, 403)
            );
        }
        next();
    };
}
