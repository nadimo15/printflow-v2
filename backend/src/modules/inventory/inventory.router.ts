/**
 * Inventory module — Router + Service
 * Replaces: client.database.from('inventory_items').*
 */
import { Router, Request, Response, NextFunction } from 'express';
import { authenticate, authorize } from '../../middleware/auth';
import prisma from '../../prisma/client';
import { AppError } from '../../middleware/errorHandler';

const router = Router();
router.use(authenticate, authorize('admin', 'manager'));

// GET /api/inventory
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const where: any = {};
        if (req.query.type) where.type = (req.query.type as string);
        const data = await prisma.inventoryItem.findMany({ where, orderBy: { name: 'asc' } });
        res.json({ success: true, data });
    } catch (err) { next(err); }
});

// GET /api/inventory/movements
router.get('/movements', async (_req, res, next) => {
    try {
        const data = await prisma.inventoryMovement.findMany({
            include: { inventoryItem: { select: { name: true } } },
            orderBy: { createdAt: 'desc' },
        });
        res.json({ success: true, data });
    } catch (err) { next(err); }
});

// POST /api/inventory
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const data = await prisma.inventoryItem.create({ data: req.body });
        res.status(201).json({ success: true, data });
    } catch (err) { next(err); }
});

// PUT /api/inventory/:id
router.put('/:id', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const data = await prisma.inventoryItem.update({ where: { id: (req.params.id as string) }, data: req.body });
        res.json({ success: true, data });
    } catch (err) { next(err); }
});

// PATCH /api/inventory/:id/stock — adjust stock with movement log
router.patch('/:id/stock', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { newQty, reason } = req.body;
        if (newQty === undefined) throw new AppError('newQty is required.', 400);

        const item = await prisma.inventoryItem.findUnique({ where: { id: (req.params.id as string) } });
        if (!item) throw new AppError('Inventory item not found.', 404);

        const delta = Number(newQty) - Number(item.stockQuantity);
        const updated = await prisma.inventoryItem.update({
            where: { id: (req.params.id as string) },
            data: { stockQuantity: newQty },
        });

        await prisma.inventoryMovement.create({
            data: {
                inventoryItemId: (req.params.id as string),
                movementType: 'adjustment',
                quantity: Math.abs(delta),
                notes: `Adjustment: ${delta > 0 ? '+' : ''}${delta}. Reason: ${reason || 'Manual adjustment'}`,
                createdBy: req.user?.id || null,
            },
        });

        res.json({ success: true, data: updated });
    } catch (err) { next(err); }
});

export default router;
