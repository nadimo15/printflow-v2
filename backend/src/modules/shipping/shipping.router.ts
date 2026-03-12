/**
 * Shipping Rules module
 * Replaces: client.database.from('shipping_rules').*
 */
import { Router } from 'express';
import { authenticate, authorize } from '../../middleware/auth';
import prisma from '../../prisma/client';

const router = Router();

// GET /api/shipping-rules — public (used by storefront checkout for shipping calc)
router.get('/', async (req, res, next) => {
    try {
        const where: any = {};
        // Storefront only needs active rules
        if (req.query.active === 'true') where.isActive = true;
        const data = await prisma.shippingRule.findMany({ where, orderBy: { wilayaName: 'asc' } });
        res.json({ success: true, data });
    } catch (err) { next(err); }
});

// Admin routes
router.post('/', authenticate, authorize('admin', 'manager'), async (req, res, next) => {
    try {
        const data = await prisma.shippingRule.create({ data: req.body });
        res.status(201).json({ success: true, data });
    } catch (err) { next(err); }
});

router.put('/:id', authenticate, authorize('admin', 'manager'), async (req, res, next) => {
    try {
        const data = await prisma.shippingRule.update({ where: { id: (req.params.id as string) }, data: req.body });
        res.json({ success: true, data });
    } catch (err) { next(err); }
});

router.delete('/:id', authenticate, authorize('admin'), async (req, res, next) => {
    try {
        await prisma.shippingRule.delete({ where: { id: (req.params.id as string) } });
        res.json({ success: true });
    } catch (err) { next(err); }
});

export default router;
