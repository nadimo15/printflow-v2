/**
 * Customers module — Router + Service
 * Replaces: client.database.from('customers').*
 */
import { Router, Request, Response, NextFunction } from 'express';
import { authenticate, authorize } from '../../middleware/auth';
import prisma from '../../prisma/client';
import { AppError } from '../../middleware/errorHandler';

const router = Router();
router.use(authenticate);

// GET /api/customers
router.get('/', authorize('admin', 'manager'), async (_req, res, next) => {
    try {
        const data = await prisma.customer.findMany({ orderBy: { createdAt: 'desc' } });
        res.json({ success: true, data });
    } catch (err) { next(err); }
});

// GET /api/customers/:id — with orders
router.get('/:id', authorize('admin', 'manager'), async (req, res, next) => {
    try {
        const data = await prisma.customer.findUnique({
            where: { id: req.params.id },
            include: { orders: true },
        });
        if (!data) throw new AppError('Customer not found.', 404);
        res.json({ success: true, data });
    } catch (err) { next(err); }
});

// POST /api/customers/upsert — used by storefront checkout (upsert by phone)
router.post('/upsert', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { phone, name, email, wilaya, address, isGuest } = req.body;
        if (!phone) throw new AppError('Phone number is required.', 400);

        const existing = await prisma.customer.findUnique({ where: { phone } });
        let customer;
        if (existing) {
            customer = existing;
        } else {
            customer = await prisma.customer.create({
                data: { name, phone, email: email || null, wilaya: wilaya || null, address: address || null, isGuest: isGuest ?? true },
            });
        }
        res.json({ success: true, data: customer });
    } catch (err) { next(err); }
});

// POST /api/customers/:id/payment — record a payment (reduces outstanding_balance)
router.post('/:id/payment', authorize('admin', 'manager'), async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { amount } = req.body;
        if (!amount || amount <= 0) throw new AppError('Invalid payment amount.', 400);
        const customer = await prisma.customer.findUnique({ where: { id: req.params.id } });
        if (!customer) throw new AppError('Customer not found.', 404);
        const newBalance = Math.max(0, Number(customer.outstandingBalance) - Number(amount));
        const updated = await prisma.customer.update({
            where: { id: req.params.id },
            data: { outstandingBalance: newBalance },
        });
        res.json({ success: true, data: { customer: updated, newBalance } });
    } catch (err) { next(err); }
});

export default router;
