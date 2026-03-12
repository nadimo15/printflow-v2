/**
 * Purchase Orders module
 * Replaces: client.database.from('purchase_orders').* + receive logic
 */
import { Router, Request, Response, NextFunction } from 'express';
import { authenticate, authorize } from '../../middleware/auth';
import prisma from '../../prisma/client';
import { AppError } from '../../middleware/errorHandler';

const router = Router();
router.use(authenticate, authorize('admin', 'manager'));

// Generate PO number
function generatePONumber(): string {
    return `PO-${Date.now().toString().slice(-6)}`;
}

// GET /api/purchase-orders
router.get('/', async (_req, res, next) => {
    try {
        const data = await prisma.purchaseOrder.findMany({
            include: { supplier: true },
            orderBy: { createdAt: 'desc' },
        });
        res.json({ success: true, data });
    } catch (err) { next(err); }
});

// POST /api/purchase-orders
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const data = await prisma.purchaseOrder.create({
            data: { ...req.body, poNumber: generatePONumber() },
        });
        res.status(201).json({ success: true, data });
    } catch (err) { next(err); }
});

// PUT /api/purchase-orders/:id
router.put('/:id', async (req, res, next) => {
    try {
        const data = await prisma.purchaseOrder.update({ where: { id: (req.params.id as string) }, data: req.body });
        res.json({ success: true, data });
    } catch (err) { next(err); }
});

// GET /api/purchase-orders/:id/items
router.get('/:id/items', async (req, res, next) => {
    try {
        const data = await prisma.purchaseOrderItem.findMany({
            where: { purchaseOrderId: (req.params.id as string) },
            include: { inventoryItem: true },
        });
        res.json({ success: true, data });
    } catch (err) { next(err); }
});

// PUT /api/purchase-orders/:id/items — replace all items
router.put('/:id/items', async (req: Request, res: Response, next: NextFunction) => {
    try {
        await prisma.purchaseOrderItem.deleteMany({ where: { purchaseOrderId: (req.params.id as string) } });
        const items = (req.body.items || []).map((item: any) => ({
            ...item,
            purchaseOrderId: (req.params.id as string),
        }));
        if (items.length > 0) {
            await prisma.purchaseOrderItem.createMany({ data: items });
        }
        const data = await prisma.purchaseOrderItem.findMany({
            where: { purchaseOrderId: (req.params.id as string) },
            include: { inventoryItem: true },
        });
        res.json({ success: true, data });
    } catch (err) { next(err); }
});

// POST /api/purchase-orders/:id/receive — receive PO, update inventory stock
router.post('/:id/receive', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const poId = (req.params.id as string);
        const po = await prisma.purchaseOrder.update({ where: { id: poId }, data: { status: 'completed' } });
        const items = await prisma.purchaseOrderItem.findMany({ where: { purchaseOrderId: poId } });

        for (const item of items) {
            if (Number(item.receivedQty) >= Number(item.quantity)) continue; // Already received

            const invItem = await prisma.inventoryItem.findUnique({ where: { id: item.inventoryItemId } });
            if (!invItem) continue;

            const newStock = Number(invItem.stockQuantity) + Number(item.quantity);
            await prisma.inventoryItem.update({
                where: { id: item.inventoryItemId },
                data: { stockQuantity: newStock, costPerUnit: item.unitPrice },
            });
            await prisma.inventoryMovement.create({
                data: {
                    inventoryItemId: item.inventoryItemId,
                    movementType: 'receipt',
                    quantity: item.quantity,
                    referenceId: poId,
                    notes: `PO Receipt: ${po.poNumber}`,
                    createdBy: req.user?.id || null,
                },
            });
            await prisma.purchaseOrderItem.update({
                where: { id: item.id },
                data: { receivedQty: item.quantity },
            });
        }

        res.json({ success: true });
    } catch (err) { next(err); }
});

export default router;
