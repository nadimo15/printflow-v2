/**
 * Suppliers module
 * Replaces: client.database.from('suppliers').*
 */
import { Router } from 'express';
import { authenticate, authorize } from '../../middleware/auth';
import prisma from '../../prisma/client';

const router = Router();
router.use(authenticate, authorize('admin', 'manager'));

router.get('/', async (_req, res, next) => {
    try { res.json({ success: true, data: await prisma.supplier.findMany({ orderBy: { name: 'asc' } }) }); }
    catch (err) { next(err); }
});

router.post('/', async (req, res, next) => {
    try { res.status(201).json({ success: true, data: await prisma.supplier.create({ data: req.body }) }); }
    catch (err) { next(err); }
});

router.put('/:id', async (req, res, next) => {
    try { res.json({ success: true, data: await prisma.supplier.update({ where: { id: req.params.id }, data: req.body }) }); }
    catch (err) { next(err); }
});

router.delete('/:id', authenticate, authorize('admin'), async (req, res, next) => {
    try { await prisma.supplier.delete({ where: { id: req.params.id } }); res.json({ success: true }); }
    catch (err) { next(err); }
});

export default router;
