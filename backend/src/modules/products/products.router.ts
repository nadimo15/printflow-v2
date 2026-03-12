/**
 * Products module — Router + Service
 * Replaces: client.database.from('products').*
 * Public: list published products, get by ID (for storefront)
 * Admin: full CRUD, BOM management
 */
import { Router, Request, Response, NextFunction } from 'express';
import { authenticate, authorize } from '../../middleware/auth';
import prisma from '../../prisma/client';
import { AppError } from '../../middleware/errorHandler';

const router = Router();

// ─── Service functions ────────────────────────────────────────────────────────

async function listPublicProducts(category?: string) {
    const where: any = { isActive: true, isPublished: true };
    if (category) where.category = category;
    return prisma.product.findMany({ where });
}

async function listAllProducts() {
    return prisma.product.findMany({ orderBy: { createdAt: 'desc' } });
}

async function getProduct(id: string) {
    const p = await prisma.product.findUnique({ where: { id } });
    if (!p) throw new AppError('Product not found.', 404);
    return p;
}

async function listBOM(productId: string) {
    return prisma.productBOM.findMany({
        where: { productId },
        include: { inventoryItem: true },
        orderBy: { variantSize: 'asc' },
    });
}

// ─── Routes ──────────────────────────────────────────────────────────────────

// GET /api/products — public (storefront), filtered by is_published
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const data = await listPublicProducts(req.query.category as string);
        res.json({ success: true, data });
    } catch (err) { next(err); }
});

// GET /api/products/all — admin/manager: all products regardless of published status
router.get('/all', authenticate, authorize('admin', 'manager'), async (_req: Request, res: Response, next: NextFunction) => {
    try {
        const data = await listAllProducts();
        res.json({ success: true, data });
    } catch (err) { next(err); }
});

// GET /api/products/:id
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
    try {
        const data = await getProduct(req.params.id as string);
        res.json({ success: true, data });
    } catch (err) { next(err); }
});

// POST /api/products — admin/manager only
router.post('/', authenticate, authorize('admin', 'manager'), async (req: Request, res: Response, next: NextFunction) => {
    try {
        const data = await prisma.product.create({ data: req.body });
        res.status(201).json({ success: true, data });
    } catch (err) { next(err); }
});

// PUT /api/products/:id — admin/manager only
router.put('/:id', authenticate, authorize('admin', 'manager'), async (req: Request, res: Response, next: NextFunction) => {
    try {
        const data = await prisma.product.update({ where: { id: (req.params.id as string) }, data: req.body });
        res.json({ success: true, data });
    } catch (err) { next(err); }
});

// DELETE /api/products/:id — admin only
router.delete('/:id', authenticate, authorize('admin'), async (req: Request, res: Response, next: NextFunction) => {
    try {
        await prisma.product.delete({ where: { id: (req.params.id as string) } });
        res.json({ success: true });
    } catch (err) { next(err); }
});

// GET /api/products/:id/bom — get BOM for a product
router.get('/:id/bom', authenticate, authorize('admin', 'manager'), async (req: Request, res: Response, next: NextFunction) => {
    try {
        const data = await listBOM(req.params.id as string);
        res.json({ success: true, data });
    } catch (err) { next(err); }
});

// PUT /api/products/:id/bom — replace entire BOM
router.put('/:id/bom', authenticate, authorize('admin', 'manager'), async (req: Request, res: Response, next: NextFunction) => {
    try {
        const productId = (req.params.id as string);
        await prisma.productBOM.deleteMany({ where: { productId } });
        if (req.body.items?.length) {
            await prisma.productBOM.createMany({
                data: (req.body.items as any).map((item: any) => ({ ...item, productId })),
            });
        }
        const data = await listBOM(productId);
        res.json({ success: true, data });
    } catch (err) { next(err); }
});

export default router;
