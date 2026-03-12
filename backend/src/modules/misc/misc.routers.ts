/**
 * Miscellaneous modules — combined into one file for conciseness
 * Covers: expenses, workstations, screen-frames, quality (rework logs), roles, dashboard
 * Each is a simple CRUD module matching the api.ts patterns.
 */
import { Router, Request, Response, NextFunction } from 'express';
import { authenticate, authorize } from '../../middleware/auth';
import prisma from '../../prisma/client';

// ─── Expenses Router ──────────────────────────────────────────────────────────
export const expensesRouter = Router();
expensesRouter.use(authenticate, authorize('admin'));

expensesRouter.get('/', async (_req, res, next) => {
    try { res.json({ success: true, data: await prisma.expense.findMany({ orderBy: { date: 'desc' } }) }); }
    catch (err) { next(err); }
});

expensesRouter.post('/', async (req: Request, res: Response, next: NextFunction) => {
    try { res.status(201).json({ success: true, data: await prisma.expense.create({ data: req.body }) }); }
    catch (err) { next(err); }
});

// ─── Workstations Router ──────────────────────────────────────────────────────
export const workstationsRouter = Router();
workstationsRouter.use(authenticate, authorize('admin', 'manager'));

workstationsRouter.get('/', async (_req, res, next) => {
    try { res.json({ success: true, data: await prisma.workstation.findMany({ orderBy: { name: 'asc' } }) }); }
    catch (err) { next(err); }
});

workstationsRouter.post('/', async (req: Request, res: Response, next: NextFunction) => {
    try { res.status(201).json({ success: true, data: await prisma.workstation.create({ data: req.body }) }); }
    catch (err) { next(err); }
});

workstationsRouter.patch('/:id/maintenance', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const data = await prisma.workstation.update({
            where: { id: (req.params.id as string) },
            data: { lastMaintenanceDate: (req.body.date as any) ? new Date(req.body.date) : null },
        });
        res.json({ success: true, data });
    } catch (err) { next(err); }
});

// ─── Screen Frames Router ─────────────────────────────────────────────────────
export const screenFramesRouter = Router();
screenFramesRouter.use(authenticate, authorize('admin', 'manager'));

screenFramesRouter.get('/', async (_req, res, next) => {
    try { res.json({ success: true, data: await prisma.screenFrame.findMany({ orderBy: { name: 'asc' } }) }); }
    catch (err) { next(err); }
});

screenFramesRouter.post('/', async (req: Request, res: Response, next: NextFunction) => {
    try { res.status(201).json({ success: true, data: await prisma.screenFrame.create({ data: req.body }) }); }
    catch (err) { next(err); }
});

screenFramesRouter.put('/:id', async (req: Request, res: Response, next: NextFunction) => {
    try { res.json({ success: true, data: await prisma.screenFrame.update({ where: { id: (req.params.id as string) }, data: req.body }) }); }
    catch (err) { next(err); }
});

screenFramesRouter.delete('/:id', async (req: Request, res: Response, next: NextFunction) => {
    try { await prisma.screenFrame.delete({ where: { id: (req.params.id as string) } }); res.json({ success: true }); }
    catch (err) { next(err); }
});

// ─── Quality Control (Rework Logs) Router ─────────────────────────────────────
export const qualityRouter = Router();
qualityRouter.use(authenticate, authorize('admin', 'manager'));

qualityRouter.get('/rework', async (_req, res, next) => {
    try {
        const data = await prisma.reworkLog.findMany({
            include: {
                task: { select: { title: true } },
                worker: { select: { name: true } },
            },
            orderBy: { createdAt: 'desc' },
        });
        // Add order_number via a separate query join using the orderId
        const enriched = await Promise.all(data.map(async (log) => {
            const order = await prisma.order.findUnique({ where: { id: log.orderId }, select: { orderNumber: true } });
            return { ...log, order: { order_number: order?.orderNumber } };
        }));
        res.json({ success: true, data: enriched });
    } catch (err) { next(err); }
});

// ─── Roles & Permissions Router ───────────────────────────────────────────────
export const rolesRouter = Router();
rolesRouter.use(authenticate, authorize('admin'));

rolesRouter.get('/', async (_req, res, next) => {
    try { res.json({ success: true, data: await prisma.rolePermission.findMany() }); }
    catch (err) { next(err); }
});

rolesRouter.put('/:role', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const data = await prisma.rolePermission.upsert({
            where: { role: (req.params.role as string) },
            update: { permissions: (req.body.permissions as any) },
            create: { role: (req.params.role as string), permissions: (req.body.permissions as any) },
        });
        res.json({ success: true, data });
    } catch (err) { next(err); }
});

// ─── Dashboard Stats Router ───────────────────────────────────────────────────
// Replaces the dashboard-stats.js edge function (which was a stub returning [])
// Now computes real aggregated stats from the database.
export const dashboardRouter = Router();
dashboardRouter.use(authenticate, authorize('admin', 'manager'));

dashboardRouter.get('/stats', async (_req, res, next) => {
    try {
        const [
            totalOrders,
            pendingOrders,
            inProductionOrders,
            readyOrders,
            totalRevenue,
            totalExpenses,
        ] = await Promise.all([
            prisma.order.count({ where: { status: { not: 'cancelled' } } }),
            prisma.order.count({ where: { status: 'pending' } }),
            prisma.order.count({ where: { status: 'in_production' } }),
            prisma.order.count({ where: { status: 'ready' } }),
            prisma.order.aggregate({ where: { status: { not: 'cancelled' } }, _sum: { total: true } }),
            prisma.expense.aggregate({ _sum: { amount: true } }),
        ]);

        res.json({
            success: true,
            data: {
                totalOrders,
                pendingOrders,
                inProductionOrders,
                readyOrders,
                totalRevenue: Number(totalRevenue._sum.total) || 0,
                totalExpenses: Number(totalExpenses._sum.amount) || 0,
            },
        });
    } catch (err) { next(err); }
});
