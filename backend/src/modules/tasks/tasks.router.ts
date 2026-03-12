/**
 * Tasks module — Controller + Router (combined for conciseness)
 */
import { Router, Request, Response, NextFunction } from 'express';
import { authenticate, authorize } from '../../middleware/auth';
import * as tasksService from './tasks.service';

const router = Router();
router.use(authenticate);

// GET /api/tasks — list all tasks
router.get('/', authorize('admin', 'manager', 'worker', 'designer'), async (req: Request, res: Response, next: NextFunction) => {
    try {
        const data = await tasksService.listTasks();
        res.json({ success: true, data });
    } catch (err) { next(err); }
});

// GET /api/tasks/kanban — kanban view
router.get('/kanban', authorize('admin', 'manager', 'worker', 'designer'), async (req: Request, res: Response, next: NextFunction) => {
    try {
        const data = await tasksService.getKanban();
        res.json({ success: true, data });
    } catch (err) { next(err); }
});

// POST /api/tasks — create task
router.post('/', authorize('admin', 'manager'), async (req: Request, res: Response, next: NextFunction) => {
    try {
        const data = await tasksService.createTask(req.body);
        res.status(201).json({ success: true, data });
    } catch (err) { next(err); }
});

// PATCH /api/tasks/:id — update task
router.patch('/:id', authorize('admin', 'manager', 'worker', 'designer'), async (req: Request, res: Response, next: NextFunction) => {
    try {
        const data = await tasksService.updateTask(req.params.id, req.body);
        res.json({ success: true, data });
    } catch (err) { next(err); }
});

// PATCH /api/tasks/:id/status — update status only
router.patch('/:id/status', authorize('admin', 'manager', 'worker', 'designer'), async (req: Request, res: Response, next: NextFunction) => {
    try {
        const data = await tasksService.updateTaskStatus(req.params.id, req.body.status, req.body);
        res.json({ success: true, data });
    } catch (err) { next(err); }
});

// POST /api/tasks/:id/assign — assign task
router.post('/:id/assign', authorize('admin', 'manager'), async (req: Request, res: Response, next: NextFunction) => {
    try {
        const data = await tasksService.assignTask(req.params.id, req.body.assignedToId, req.user?.id);
        res.json({ success: true, data });
    } catch (err) { next(err); }
});

// POST /api/tasks/:id/complete — BOM-aware completion (replaces complete-task edge function)
router.post('/:id/complete', authorize('admin', 'manager', 'worker'), async (req: Request, res: Response, next: NextFunction) => {
    try {
        const data = await tasksService.completeTaskWithInventory({
            taskId: req.params.id,
            orderId: req.body.orderId,
            workerId: req.body.workerId || req.user?.id,
            blanksWasted: req.body.blanksWasted,
            reworkReason: req.body.reworkReason,
        });
        res.json({ success: true, data });
    } catch (err) { next(err); }
});

export default router;
