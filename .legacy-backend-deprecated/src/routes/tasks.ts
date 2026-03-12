import { Router, Request, Response } from 'express';
import { insforge } from '../config/insforge';

const router = Router();
const db = insforge.database;

// GET /api/tasks - List all tasks with filters
router.get('/', async (req: Request, res: Response) => {
  try {
    const { status, assignedToId, orderId, type } = req.query;

    let query = db
      .from('tasks')
      .select('*, profiles(*), orders(id, order_number, status, order_items(*)), order_items(*)');

    if (status) query = query.eq('status', status as string);
    if (assignedToId) query = query.eq('assigned_to_id', assignedToId as string);
    if (orderId) query = query.eq('order_id', orderId as string);
    if (type) query = query.eq('type', type as string);

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) throw error;
    res.json({ success: true, data });
  } catch (error: any) {
    console.error('Error fetching tasks:', error);
    res.status(500).json({
      success: false,
      error: { code: 'FETCH_ERROR', message: error.message || 'Failed to fetch tasks' },
    });
  }
});

// GET /api/tasks/kanban/board - Get tasks grouped by status
router.get('/kanban/board', async (_req: Request, res: Response) => {
  try {
    const { data: tasks, error } = await db
      .from('tasks')
      .select('*, profiles(*), orders(id, order_number), order_items(*)')
      .order('created_at', { ascending: false });

    if (error) throw error;

    const kanban = {
      pending: (tasks || []).filter((t: any) => t.status === 'pending'),
      in_progress: (tasks || []).filter((t: any) => t.status === 'in_progress'),
      paused: (tasks || []).filter((t: any) => t.status === 'paused'),
      completed: (tasks || []).filter((t: any) => t.status === 'completed'),
    };

    res.json({ success: true, data: kanban });
  } catch (error: any) {
    console.error('Error fetching kanban:', error);
    res.status(500).json({
      success: false,
      error: { code: 'FETCH_ERROR', message: error.message || 'Failed to fetch kanban board' },
    });
  }
});

// GET /api/tasks/worker/:workerId - Get tasks assigned to specific worker
router.get('/worker/:workerId', async (req: Request, res: Response) => {
  try {
    const { workerId } = req.params;
    const { status } = req.query;

    let query = db
      .from('tasks')
      .select('*, orders(id, order_number), order_items(*)')
      .eq('assigned_to_id', workerId);

    if (status) query = query.eq('status', status as string);

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) throw error;
    res.json({ success: true, data });
  } catch (error: any) {
    console.error('Error fetching worker tasks:', error);
    res.status(500).json({
      success: false,
      error: { code: 'FETCH_ERROR', message: error.message || 'Failed to fetch worker tasks' },
    });
  }
});

// GET /api/tasks/:id - Get single task
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { data, error } = await db
      .from('tasks')
      .select('*, profiles(*), orders(*, order_items(*)), order_items(*)')
      .eq('id', req.params.id)
      .single();

    if (error || !data) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Task not found' },
      });
    }

    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: { code: 'FETCH_ERROR', message: error.message || 'Failed to fetch task' },
    });
  }
});

// POST /api/tasks - Create new task
router.post('/', async (req: Request, res: Response) => {
  try {
    const {
      title, description, type, priority,
      orderId, orderItemId, assignedToId,
      estimatedHours, deadlineAt, notes
    } = req.body;

    if (!title || !orderId) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Title and orderId are required' },
      });
    }

    // Validate order exists
    const { data: order, error: orderErr } = await db
      .from('orders')
      .select('id')
      .eq('id', orderId)
      .single();

    if (orderErr || !order) {
      return res.status(404).json({
        success: false,
        error: { code: 'ORDER_NOT_FOUND', message: 'Order not found' },
      });
    }

    // Create task
    const { data: task, error } = await db
      .from('tasks')
      .insert([{
        title,
        description,
        type: type || 'printing',
        priority: priority || 'normal',
        order_id: orderId,
        order_item_id: orderItemId,
        assigned_to_id: assignedToId,
        estimated_hours: estimatedHours || 0,
        deadline_at: deadlineAt,
        notes,
        status: 'pending',
      }])
      .select()
      .single();

    if (error) throw error;

    // Update order production status
    await updateOrderProductionStatus(orderId);

    res.status(201).json({ success: true, data: task });
  } catch (error: any) {
    console.error('Error creating task:', error);
    res.status(400).json({
      success: false,
      error: { code: 'CREATE_ERROR', message: error.message },
    });
  }
});

// PUT /api/tasks/:id/status - Update task status
router.put('/:id/status', async (req: Request, res: Response) => {
  try {
    const { status } = req.body;

    // Fetch existing task
    const { data: existingTask, error: fetchErr } = await db
      .from('tasks')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (fetchErr || !existingTask) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Task not found' },
      });
    }

    const updateData: any = { status };
    const { designFileUrl, approvalStatus, rejectionReason } = req.body;

    if (designFileUrl !== undefined) updateData.design_file_url = designFileUrl;
    if (approvalStatus !== undefined) updateData.approval_status = approvalStatus;
    if (rejectionReason !== undefined) updateData.rejection_reason = rejectionReason;

    if (status === 'in_progress' && !existingTask.started_at) {
      updateData.started_at = new Date().toISOString();
    } else if (status === 'completed') {
      updateData.completed_at = new Date().toISOString();
      if (existingTask.started_at) {
        const hours = (new Date().getTime() - new Date(existingTask.started_at).getTime()) / (1000 * 60 * 60);
        updateData.actual_hours = Math.round(hours * 10) / 10;
      }
      if (existingTask.approval_status === 'pending') {
        updateData.approval_status = 'approved';
      }
    }

    const { data: task, error } = await db
      .from('tasks')
      .update(updateData)
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) throw error;

    // Update order production status
    await updateOrderProductionStatus(existingTask.order_id);

    res.json({ success: true, data: task });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      error: { code: 'UPDATE_ERROR', message: error.message },
    });
  }
});

// PUT /api/tasks/:id/assign - Assign task to worker
router.put('/:id/assign', async (req: Request, res: Response) => {
  try {
    const { assignedToId } = req.body;

    // Validate worker exists if provided
    if (assignedToId) {
      const { data: worker, error: workerErr } = await db
        .from('profiles')
        .select('id')
        .eq('id', assignedToId)
        .single();

      if (workerErr || !worker) {
        return res.status(404).json({
          success: false,
          error: { code: 'USER_NOT_FOUND', message: 'Worker not found' },
        });
      }
    }

    const { data: task, error } = await db
      .from('tasks')
      .update({ assigned_to_id: assignedToId })
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) throw error;
    res.json({ success: true, data: task });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      error: { code: 'UPDATE_ERROR', message: error.message },
    });
  }
});

// PUT /api/tasks/:id/time - Update time tracking
router.put('/:id/time', async (req: Request, res: Response) => {
  try {
    const { actualHours } = req.body;

    const { data: task, error } = await db
      .from('tasks')
      .update({ actual_hours: actualHours })
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) throw error;
    res.json({ success: true, data: task });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      error: { code: 'UPDATE_ERROR', message: error.message },
    });
  }
});

// DELETE /api/tasks/:id - Delete task
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    // Fetch task to get orderId before deleting
    const { data: task, error: fetchErr } = await db
      .from('tasks')
      .select('order_id')
      .eq('id', req.params.id)
      .single();

    if (fetchErr || !task) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Task not found' },
      });
    }

    const orderId = task.order_id;

    const { error } = await db
      .from('tasks')
      .delete()
      .eq('id', req.params.id);

    if (error) throw error;

    // Update order production status
    await updateOrderProductionStatus(orderId);

    res.json({ success: true, message: 'Task deleted' });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      error: { code: 'DELETE_ERROR', message: error.message },
    });
  }
});

// Helper: Update order production status based on tasks
async function updateOrderProductionStatus(orderId: string) {
  try {
    const { data: tasks } = await db
      .from('tasks')
      .select('*')
      .eq('order_id', orderId);

    if (!tasks || tasks.length === 0) {
      await db
        .from('orders')
        .update({ production_status: null })
        .eq('id', orderId);
      return;
    }

    const totalTasks = tasks.length;
    const completedTasks = tasks.filter((t: any) => t.status === 'completed').length;
    const inProgressTasks = tasks.filter((t: any) => t.status === 'in_progress').length;

    const currentTask = tasks.find((t: any) => t.status !== 'completed');
    const currentStage = currentTask ? currentTask.type : 'completed';

    const completedStages = [...new Set(
      tasks
        .filter((t: any) => t.status === 'completed')
        .map((t: any) => t.type)
    )];

    const progressPercentage = Math.round((completedTasks / totalTasks) * 100);

    let orderStatus = 'pending';
    if (completedTasks === totalTasks) {
      orderStatus = 'ready';
    } else if (inProgressTasks > 0 || completedTasks > 0) {
      orderStatus = 'in_production';
    } else {
      // Tasks exist but none started yet — keep as confirmed
      orderStatus = 'confirmed';
    }

    await db
      .from('orders')
      .update({
        production_status: {
          currentStage,
          completedStages,
          totalTasks,
          completedTasks,
          progressPercentage,
        },
        status: orderStatus,
      })
      .eq('id', orderId);
  } catch (error) {
    console.error('Error updating order production status:', error);
  }
}

export default router;
