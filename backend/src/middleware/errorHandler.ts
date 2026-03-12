/**
 * Global error handling middleware
 * Catches all errors thrown in route handlers.
 */
import { Request, Response, NextFunction } from 'express';

export class AppError extends Error {
    public statusCode: number;
    public isOperational: boolean;

    constructor(message: string, statusCode = 500) {
        super(message);
        this.statusCode = statusCode;
        this.isOperational = true;
        Object.setPrototypeOf(this, AppError.prototype);
    }
}

export function errorHandler(
    err: Error,
    _req: Request,
    res: Response,
    _next: NextFunction
): void {
    // Operational errors (known, safe to expose)
    if (err instanceof AppError) {
        res.status(err.statusCode).json({
            success: false,
            error: {
                message: err.message,
                status: err.statusCode,
            },
        });
        return;
    }

    // Prisma errors (common cases)
    if (err.constructor.name === 'PrismaClientKnownRequestError') {
        const prismaErr = err as any;
        if (prismaErr.code === 'P2002') {
            res.status(409).json({
                success: false,
                error: { message: 'A record with this value already exists.', status: 409 },
            });
            return;
        }
        if (prismaErr.code === 'P2025') {
            res.status(404).json({
                success: false,
                error: { message: 'Record not found.', status: 404 },
            });
            return;
        }
    }

    // Unknown / unexpected errors — do not leak details in production
    console.error('[Unhandled Error]', err);
    res.status(500).json({
        success: false,
        error: {
            message: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
            status: 500,
        },
    });
}
