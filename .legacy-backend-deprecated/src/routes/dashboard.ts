import { Router, Request, Response } from 'express';
import { insforge } from '../config/insforge';

const router = Router();

router.get('/stats', async (_req: Request, res: Response) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayISO = today.toISOString();

    const db = insforge.database;

    // Run all counts in parallel
    const [
      ordersResult,
      todayOrdersResult,
      revenueResult,
      todayRevenueResult,
      customersResult,
      productsResult,
      tasksResult,
    ] = await Promise.all([
      db.from('orders').select('*', { count: 'exact', head: true }),
      db.from('orders').select('*', { count: 'exact', head: true }).gte('created_at', todayISO),
      db.from('orders').select('total'),
      db.from('orders').select('total').gte('created_at', todayISO),
      db.from('customers').select('*', { count: 'exact', head: true }),
      db.from('products').select('*', { count: 'exact', head: true }).eq('is_active', true),
      db.from('tasks').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
    ]);

    // Calculate revenue sum from fetched data
    const totalRevenue = (revenueResult.data || []).reduce((sum: number, row: any) => sum + (parseFloat(row.total) || 0), 0);
    const todayRevenue = (todayRevenueResult.data || []).reduce((sum: number, row: any) => sum + (parseFloat(row.total) || 0), 0);

    res.json({
      success: true,
      data: {
        totalOrders: ordersResult.count || 0,
        todayOrders: todayOrdersResult.count || 0,
        totalRevenue,
        todayRevenue,
        totalCustomers: customersResult.count || 0,
        activeProducts: productsResult.count || 0,
        pendingTasks: tasksResult.count || 0,
      },
    });
  } catch (error: any) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({
      success: false,
      error: { code: 'FETCH_ERROR', message: error.message || 'Failed to fetch stats' },
    });
  }
});

export default router;
