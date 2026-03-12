import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import path from 'path';

// Routes
import productRoutes from './routes/products';
import orderRoutes from './routes/orders';
import customerRoutes from './routes/customers';
import authRoutes from './routes/auth';
import dashboardRoutes from './routes/dashboard';
import taskRoutes from './routes/tasks';
import employeeRoutes from './routes/employees';
import rolesRoutes from './routes/roles';
import { requireAuth } from './middleware/auth';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(helmet({
  contentSecurityPolicy: false, // Allow inline scripts from Vite build
  crossOriginEmbedderPolicy: false,
}));
app.use(cors({
  origin: process.env.CORS_ORIGINS
    ? process.env.CORS_ORIGINS.split(',')
    : [
      'http://localhost:3000', 'http://localhost:3001', 'http://localhost:3003',
      'http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175',
      'https://bp44w5kz.insforge.site',
    ],
  credentials: true,
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// API Routes (ERP — protected by auth middleware on individual routes where needed, but mostly global here)
// Mount auth first without requireAuth so login works
app.use('/api/auth', authRoutes);

// Protect all other ERP routes
app.use('/api/products', requireAuth, productRoutes);
app.use('/api/orders', requireAuth, orderRoutes);
app.use('/api/customers', requireAuth, customerRoutes);
app.use('/api/dashboard', requireAuth, dashboardRoutes);
app.use('/api/tasks', requireAuth, taskRoutes);
app.use('/api/employees', requireAuth, employeeRoutes);
app.use('/api/roles', requireAuth, rolesRoutes);

// Public Storefront API
app.use('/api/storefront/products', productRoutes);
app.use('/api/storefront/orders', orderRoutes);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), version: '2.0.0' });
});

// Serve static storefront files (production)
const publicPath = path.join(__dirname, '..', 'public');
app.use(express.static(publicPath));

// ERP SPA catch-all — serve admin/index.html for any /admin route
app.get('/admin/*', (_req, res) => {
  res.sendFile(path.join(publicPath, 'admin', 'index.html'));
});

// Storefront SPA catch-all — serve index.html for any other non-API route
app.get('*', (_req, res, next) => {
  // Don't catch API routes
  if (_req.path.startsWith('/api')) {
    return next();
  }
  res.sendFile(path.join(publicPath, 'index.html'));
});

// Error handling
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled error:', err.stack);
  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
    },
  });
});

// Start server (local development only, skipped in serverless)
if (process.env.VERCEL !== '1') {
  async function startServer() {
    try {
      console.log('🔗 Backend using InsForge as data layer');
      app.listen(Number(PORT), '0.0.0.0', () => {
        console.log(`🚀 Server running on port ${PORT}`);
        console.log(`📦 Storefront API: http://localhost:${PORT}/api/storefront`);
        console.log(`🔧 ERP API: http://localhost:${PORT}/api`);
      });
    } catch (error) {
      console.error('❌ Failed to start server:', error);
      process.exit(1);
    }
  }
  startServer();
}

// Export for serverless (Vercel)
export default app;
module.exports = app;
