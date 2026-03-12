import { Router, Request, Response } from 'express';
import { insforge } from '../config/insforge';

const router = Router();
const db = insforge.database;

// GET /api/roles - List all roles and permissions
router.get('/', async (_req: Request, res: Response) => {
    try {
        const { data, error } = await db
            .from('role_permissions')
            .select('*');

        if (error) throw error;
        res.json({ success: true, data });
    } catch (error: any) {
        console.error('Failed to fetch roles:', error);
        res.status(500).json({
            success: false,
            error: { code: 'FETCH_ERROR', message: error.message },
        });
    }
});

// PUT /api/roles/:role - Update permissions for a role
router.put('/:role', async (req: Request, res: Response) => {
    try {
        const { role } = req.params;
        const { permissions } = req.body;

        if (!permissions) {
            return res.status(400).json({
                success: false,
                error: { code: 'VALIDATION_ERROR', message: 'Permissions object is required' },
            });
        }

        const { data, error } = await db
            .from('role_permissions')
            .upsert({ role, permissions })
            .select()
            .single();

        if (error) throw error;
        res.json({ success: true, data });
    } catch (error: any) {
        console.error('Failed to update role permissions:', error);
        res.status(500).json({
            success: false,
            error: { code: 'UPDATE_ERROR', message: error.message },
        });
    }
});

export default router;
