/**
 * Express Application Bootstrap
 * Sets up middleware, routes, and error handling.
 */
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import morgan from 'morgan';
import { config } from './config/env';
import apiRoutes from './routes';
import { errorHandler } from './middleware/errorHandler';

const app = express();

// ─── CORS ─────────────────────────────────────────────────────────────────────
app.use(
    cors({
        origin: (origin, callback) => {
            // Allow requests with no origin (curl, mobile apps, etc. in dev)
            if (!origin || config.corsOrigins.includes(origin) || config.isDev) {
                return callback(null, true);
            }
            callback(new Error(`CORS blocked: ${origin}`));
        },
        credentials: true,
    })
);

// ─── Body Parsing ─────────────────────────────────────────────────────────────
app.use(express.json({ limit: '25mb' })); // 25mb for design file JSON payloads
app.use(express.urlencoded({ extended: true }));

// ─── HTTP Request Logging ─────────────────────────────────────────────────────
const morganFormat = config.isDev ? 'dev' : 'combined';
app.use(morgan(morganFormat));

// ─── Health Check ─────────────────────────────────────────────────────────────
app.get('/health', (_req: Request, res: Response) => {
    res.json({
        status: 'ok',
        service: 'printflow-backend',
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        environment: config.env,
    });
});

// ─── API Routes ───────────────────────────────────────────────────────────────
app.use('/api', apiRoutes);

// ─── 404 Handler ──────────────────────────────────────────────────────────────
app.use((_req: Request, res: Response) => {
    res.status(404).json({
        success: false,
        error: { message: 'Route not found.', status: 404 },
    });
});

// ─── Global Error Handler (must be last) ──────────────────────────────────────
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
    errorHandler(err, req, res, next);
});

export default app;
