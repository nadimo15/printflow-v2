import { Router, Request, Response } from 'express';
import { insforge } from '../config/insforge';

const router = Router();

// GET /api/customers - List customers
router.get('/', async (req: Request, res: Response) => {
  try {
    const { page = 1, limit = 20, search } = req.query;

    let query = insforge.database
      .from('customers')
      .select('*, orders(*)', { count: 'exact' });

    if (search) {
      query = query.or(`name.ilike.%${search}%,phone.ilike.%${search}%`);
    }

    const from = (Number(page) - 1) * Number(limit);
    const to = from + Number(limit) - 1;

    const { data, error, count } = await query
      .range(from, to)
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json({
      success: true,
      data,
      meta: {
        page: Number(page),
        limit: Number(limit),
        total: count || 0,
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: { code: 'FETCH_ERROR', message: error.message || 'Failed to fetch customers' },
    });
  }
});

// GET /api/customers/:id - Get single customer
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { data, error } = await insforge.database
      .from('customers')
      .select('*, orders(*)')
      .eq('id', req.params.id)
      .single();

    if (error || !data) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Customer not found' },
      });
    }

    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: { code: 'FETCH_ERROR', message: error.message || 'Failed to fetch customer' },
    });
  }
});

export default router;
