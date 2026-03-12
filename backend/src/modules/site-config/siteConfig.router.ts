/**
 * Site Config module (CMS)
 * Replaces: client.database.from('site_config').*
 * Public GET for published_data (storefront reads this).
 * Admin can update draft and publish.
 */
import { Router, Request, Response, NextFunction } from 'express';
import { authenticate, authorize } from '../../middleware/auth';
import prisma from '../../prisma/client';
import { AppError } from '../../middleware/errorHandler';

const router = Router();

async function ensureDefaultRow() {
    const existing = await prisma.siteConfig.findUnique({ where: { id: 'default' } });
    if (!existing) {
        await prisma.siteConfig.create({ data: { id: 'default', draftData: {}, publishedData: {} } });
    }
}

// GET /api/site-config — public (storefront reads published_data)
router.get('/', async (_req: Request, res: Response, next: NextFunction) => {
    try {
        await ensureDefaultRow();
        const data = await prisma.siteConfig.findUnique({ where: { id: 'default' } });
        res.json({ success: true, data });
    } catch (err) { next(err); }
});

// PATCH /api/site-config/draft — update draft_data (admin only)
router.patch('/draft', authenticate, authorize('admin'), async (req: Request, res: Response, next: NextFunction) => {
    try {
        await ensureDefaultRow();
        const data = await prisma.siteConfig.update({
            where: { id: 'default' },
            data: { draftData: req.body.draft_data ?? req.body },
        });
        res.json({ success: true, data });
    } catch (err) { next(err); }
});

// POST /api/site-config/publish — promote draft to published (admin only)
router.post('/publish', authenticate, authorize('admin'), async (_req: Request, res: Response, next: NextFunction) => {
    try {
        await ensureDefaultRow();
        const config = await prisma.siteConfig.findUnique({ where: { id: 'default' } });
        if (!config) throw new AppError('Site config not found.', 404);
        const data = await prisma.siteConfig.update({
            where: { id: 'default' },
            data: { publishedData: config.draftData },
        });
        res.json({ success: true, data });
    } catch (err) { next(err); }
});

export default router;
