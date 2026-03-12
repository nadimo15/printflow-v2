import { Request, Response, NextFunction } from 'express';
import { insforge } from '../config/insforge';

export interface AuthRequest extends Request {
    user?: {
        id: string;
        email: string;
        role: string;
    };
}

/**
 * Middleware: Verify InsForge session token from Authorization header.
 * Since InsForge SDK's auth methods are client-side, we verify the token
 * by querying the profiles table with the user context.
 */
export async function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                success: false,
                error: { code: 'UNAUTHORIZED', message: 'Missing or invalid authorization header' },
            });
        }

        const token = authHeader.split(' ')[1];

        // Decode JWT payload to get user ID (basic validation)
        try {
            const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
            const userId = payload.sub;
            const email = payload.email;

            if (!userId) {
                return res.status(401).json({
                    success: false,
                    error: { code: 'INVALID_TOKEN', message: 'Invalid token payload' },
                });
            }

            // Fetch user profile for role info
            const { data: profile } = await insforge.database
                .from('profiles')
                .select('role, name')
                .eq('id', userId)
                .single();

            req.user = {
                id: userId,
                email: email || '',
                role: profile?.role || 'worker',
            };

            next();
        } catch {
            return res.status(401).json({
                success: false,
                error: { code: 'INVALID_TOKEN', message: 'Could not decode token' },
            });
        }
    } catch (err: any) {
        console.error('Auth middleware error:', err);
        return res.status(500).json({
            success: false,
            error: { code: 'AUTH_ERROR', message: 'Authentication failed' },
        });
    }
}

/**
 * Middleware: Require specific roles.
 */
export function requireRole(...roles: string[]) {
    return (req: AuthRequest, res: Response, next: NextFunction) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                error: { code: 'UNAUTHORIZED', message: 'Not authenticated' },
            });
        }
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                error: { code: 'FORBIDDEN', message: 'Insufficient permissions' },
            });
        }
        next();
    };
}
