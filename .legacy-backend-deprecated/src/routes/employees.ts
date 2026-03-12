import { Router, Request, Response } from 'express';
import { insforge } from '../config/insforge';

const router = Router();
const db = insforge.database;

// GET /api/employees — list all employees
router.get('/', async (_req: Request, res: Response) => {
    try {
        const { data, error } = await db
            .from('profiles')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;
        res.json({ success: true, data: data || [] });
    } catch (error: any) {
        console.error('Failed to fetch employees:', error);
        res.status(500).json({
            success: false,
            error: { code: 'FETCH_ERROR', message: error.message },
        });
    }
});

// GET /api/employees/:id — get single employee
router.get('/:id', async (req: Request, res: Response) => {
    try {
        const { data, error } = await db
            .from('profiles')
            .select('*')
            .eq('id', req.params.id)
            .single();

        if (error) throw error;
        if (!data) {
            return res.status(404).json({
                success: false,
                error: { code: 'NOT_FOUND', message: 'Employee not found' },
            });
        }
        res.json({ success: true, data });
    } catch (error: any) {
        res.status(500).json({
            success: false,
            error: { code: 'FETCH_ERROR', message: error.message },
        });
    }
});

// POST /api/employees — create new employee (registers auth user + profile)
router.post('/', async (req: Request, res: Response) => {
    try {
        const { name, email, password, role, phone } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({
                success: false,
                error: { code: 'VALIDATION_ERROR', message: 'Name, email, and password are required' },
            });
        }

        // 1. Create auth user via InsForge
        const { data: authData, error: authError } = await insforge.auth.signUp({
            email,
            password,
            name,
        });

        if (authError) {
            console.error('Auth signup error:', authError);
            return res.status(400).json({
                success: false,
                error: { code: 'AUTH_ERROR', message: authError.message },
            });
        }

        if (!authData?.user) {
            return res.status(400).json({
                success: false,
                error: { code: 'AUTH_ERROR', message: 'Failed to create user' },
            });
        }

        // 2. Create profile record
        const { data: profile, error: profileError } = await db
            .from('profiles')
            .insert([{
                id: authData.user.id,
                name,
                email,
                role: role || 'worker',
                phone: phone || null,
                is_active: true,
            }])
            .select()
            .single();

        if (profileError) {
            console.error('Profile creation error:', profileError);
            return res.status(400).json({
                success: false,
                error: { code: 'PROFILE_ERROR', message: profileError.message },
            });
        }

        res.status(201).json({ success: true, data: profile });
    } catch (error: any) {
        console.error('Create employee error:', error);
        res.status(500).json({
            success: false,
            error: { code: 'CREATE_ERROR', message: error.message },
        });
    }
});

// PUT /api/employees/:id — update employee profile
router.put('/:id', async (req: Request, res: Response) => {
    try {
        const { name, role, phone, is_active } = req.body;
        const updateData: any = {};

        if (name !== undefined) updateData.name = name;
        if (role !== undefined) updateData.role = role;
        if (phone !== undefined) updateData.phone = phone;
        if (is_active !== undefined) updateData.is_active = is_active;

        const { data, error } = await db
            .from('profiles')
            .update(updateData)
            .eq('id', req.params.id)
            .select()
            .single();

        if (error) throw error;
        res.json({ success: true, data });
    } catch (error: any) {
        console.error('Update employee error:', error);
        res.status(500).json({
            success: false,
            error: { code: 'UPDATE_ERROR', message: error.message },
        });
    }
});

// DELETE /api/employees/:id — deactivate employee (soft delete)
router.delete('/:id', async (req: Request, res: Response) => {
    try {
        const { data, error } = await db
            .from('profiles')
            .update({ is_active: false })
            .eq('id', req.params.id)
            .select()
            .single();

        if (error) throw error;
        res.json({ success: true, data });
    } catch (error: any) {
        console.error('Delete employee error:', error);
        res.status(500).json({
            success: false,
            error: { code: 'DELETE_ERROR', message: error.message },
        });
    }
});

// GET /api/employees/stats/overview — employee performance stats
router.get('/stats/overview', async (_req: Request, res: Response) => {
    try {
        // Get all profiles
        const { data: employees, error: empError } = await db
            .from('profiles')
            .select('*')
            .eq('is_active', true);

        if (empError) throw empError;

        // Get all tasks
        const { data: tasks, error: taskError } = await db
            .from('tasks')
            .select('assigned_to_id, status');

        if (taskError) throw taskError;

        // Calculate stats per employee
        const stats = (employees || []).map((emp: any) => {
            const empTasks = (tasks || []).filter((t: any) => t.assigned_to_id === emp.id);
            return {
                id: emp.id,
                name: emp.name,
                role: emp.role,
                totalTasks: empTasks.length,
                completedTasks: empTasks.filter((t: any) => t.status === 'completed').length,
                inProgressTasks: empTasks.filter((t: any) => t.status === 'in_progress').length,
                pendingTasks: empTasks.filter((t: any) => t.status === 'pending').length,
            };
        });

        res.json({ success: true, data: stats });
    } catch (error: any) {
        res.status(500).json({
            success: false,
            error: { code: 'STATS_ERROR', message: error.message },
        });
    }
});


// PUT /api/employees/:id/auth - Update employee auth data (email/password)
router.put('/:id/auth', async (req: Request, res: Response) => {
    try {
        const { email, password } = req.body;

        if (!email && !password) {
            return res.status(400).json({
                success: false,
                error: { code: 'VALIDATION_ERROR', message: 'Email or password is required' },
            });
        }

        const attributes: any = {};
        if (email) attributes.email = email;
        if (password) attributes.password = password;

        // Verify if we can update the user via Admin API
        const adminAuth = (insforge.auth as any).admin;
        if (!adminAuth) {
            throw new Error('Admin Auth API not available');
        }

        const { data, error } = await adminAuth.updateUserById(
            req.params.id,
            attributes
        );

        if (error) {
            console.error('Auth update error:', error);
            return res.status(400).json({
                success: false,
                error: { code: 'AUTH_UPDATE_ERROR', message: error.message },
            });
        }

        // If email changed, also update profile
        if (email) {
            await db.from('profiles').update({ email }).eq('id', req.params.id);
        }

        res.json({ success: true, data: data?.user });
    } catch (error: any) {
        console.error('Update employee auth error:', error);
        res.status(500).json({
            success: false,
            error: { code: 'UPDATE_ERROR', message: error.message },
        });
    }
});

export default router;
