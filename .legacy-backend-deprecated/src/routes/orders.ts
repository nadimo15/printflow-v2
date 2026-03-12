import { Router, Request, Response } from 'express';
import { insforge } from '../config/insforge';
import { generateOrderNumber } from '../utils/helpers';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// Helper: Get or Create Customer
async function getOrCreateCustomer(guestInfo: any, customerId?: string): Promise<string | null> {
  if (customerId) return customerId;
  if (!guestInfo) return null;

  // Check if customer exists by phone
  const { data: existing } = await insforge.database
    .from('customers')
    .select('id')
    .eq('phone', guestInfo.phone)
    .single();

  if (existing) return existing.id;

  // Create new customer
  const { data: newCustomer, error } = await insforge.database
    .from('customers')
    .insert([{
      name: guestInfo.name,
      phone: guestInfo.phone,
      email: guestInfo.email,
      wilaya: guestInfo.wilaya,
      address: guestInfo.address,
      is_guest: true,
    }])
    .select('id')
    .single();

  if (error) {
    console.error('Failed to create customer:', error);
    throw new Error('Failed to create customer record');
  }
  return newCustomer.id;
}

// GET /api/orders - List orders
router.get('/', async (req: Request, res: Response) => {
  try {
    const { page = 1, limit = 20, status, customerId } = req.query;

    let query = insforge.database
      .from('orders')
      .select('*, customers(*), order_items(*), tasks(*, profiles(name))', { count: 'exact' });

    if (status) query = query.eq('status', status as string);
    if (customerId) query = query.eq('customer_id', customerId as string);

    const from = (Number(page) - 1) * Number(limit);
    const to = from + Number(limit) - 1;

    const { data, error, count } = await query
      .range(from, to)
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json({
      success: true,
      data: data,
      meta: {
        page: Number(page),
        limit: Number(limit),
        total: count || 0,
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: { code: 'FETCH_ERROR', message: error.message || 'Failed to fetch orders' },
    });
  }
});

// GET /api/orders/:id - Get single order
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { data, error } = await insforge.database
      .from('orders')
      .select('*, customers(*), order_items(*), tasks(*, profiles(name))')
      .eq('id', req.params.id)
      .single();

    if (error || !data) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Order not found' },
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

// POST /api/orders - Create order from ERP
router.post('/', async (req: Request, res: Response) => {
  try {
    const {
      customerName, customerPhone, customerEmail,
      wilaya, address,
      items, paymentMethod, notes, internalNotes,
    } = req.body;

    if (!customerName || !customerPhone || !items || items.length === 0) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Customer name, phone, and items are required' },
      });
    }

    const orderId = uuidv4();
    const orderNumber = generateOrderNumber();

    // Get or create customer
    const customerId = await getOrCreateCustomer({
      name: customerName,
      phone: customerPhone,
      email: customerEmail,
      wilaya,
      address,
    });

    // Calculate totals
    let subtotal = 0;
    const orderItems: any[] = [];

    for (const item of items) {
      const unitPrice = item.unitPrice || item.price || 0;
      const total = unitPrice * item.quantity;
      subtotal += total;

      orderItems.push({
        order_id: orderId,
        product_id: item.productId || null,
        variant_id: item.variantId || null,
        name: item.name,
        name_ar: item.nameAr || item.name,
        sku: item.sku || 'N/A',
        unit_price: unitPrice,
        quantity: item.quantity,
        total,
        customization: item.customization,
      });
    }

    const shipping = 0; // ERP orders: shipping calculated separately
    const totalAmount = subtotal + shipping;

    // Insert Order
    const { error: orderError } = await insforge.database
      .from('orders')
      .insert([{
        id: orderId,
        order_number: orderNumber,
        customer_id: customerId,
        guest_info: { name: customerName, phone: customerPhone, email: customerEmail, wilaya, address },
        subtotal,
        discount: 0,
        shipping,
        tax: 0,
        total: totalAmount,
        shipping_address: { name: customerName, phone: customerPhone, wilaya, address },
        payment_method: paymentMethod || 'cash_on_delivery',
        notes,
        internal_notes: internalNotes,
        source: 'erp',
        status: 'pending',
      }]);

    if (orderError) throw orderError;

    // Insert Order Items
    if (orderItems.length > 0) {
      const { error: itemsError } = await insforge.database
        .from('order_items')
        .insert(orderItems);

      if (itemsError) {
        console.error('Failed to insert items:', itemsError);
        throw itemsError;
      }
    }

    res.status(201).json({
      success: true,
      data: { id: orderId, orderNumber, order_number: orderNumber, total: totalAmount },
      message: 'Order created successfully',
    });
  } catch (error: any) {
    console.error('ERP Order Create Error:', error);
    res.status(400).json({
      success: false,
      error: { code: 'CREATE_ERROR', message: error.message },
    });
  }
});

// PUT /api/orders/:id/status - Update order status
router.put('/:id/status', async (req: Request, res: Response) => {
  try {
    const { status } = req.body;

    const updateData: any = { status };
    if (status === 'confirmed') updateData.confirmed_at = new Date().toISOString();
    if (status === 'shipped') updateData.shipped_at = new Date().toISOString();
    if (status === 'delivered') updateData.delivered_at = new Date().toISOString();

    const { data, error } = await insforge.database
      .from('orders')
      .update(updateData)
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) throw error;
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      error: { code: 'UPDATE_ERROR', message: error.message },
    });
  }
});

// ============ STOREFRONT ROUTES ============

// POST /api/storefront/orders - Create order from storefront
router.post('/storefront/create', async (req: Request, res: Response) => {
  try {
    const {
      guestInfo, items, shippingAddress, paymentMethod, notes,
    } = req.body;

    // Calculate totals
    let subtotal = 0;
    const orderItems: any[] = [];
    const orderId = uuidv4();
    const orderNumber = generateOrderNumber();

    for (const item of items) {
      const unitPrice = item.unitPrice || item.price || 0;
      const total = unitPrice * item.quantity;
      subtotal += total;

      orderItems.push({
        order_id: orderId,
        product_id: item.productId || null,
        variant_id: item.variantId || null,
        name: item.name,
        name_ar: item.nameAr || item.name,
        sku: item.sku || 'N/A',
        unit_price: unitPrice,
        quantity: item.quantity,
        total,
        customization: item.customization,
      });
    }

    const shipping = subtotal > 50000 ? 0 : 1000;
    const totalAmount = subtotal + shipping;

    // Get/Create Customer
    const customerId = await getOrCreateCustomer(guestInfo);

    // Insert Order
    const { error: orderError } = await insforge.database
      .from('orders')
      .insert([{
        id: orderId,
        order_number: orderNumber,
        customer_id: customerId,
        guest_info: guestInfo,
        subtotal,
        discount: 0,
        shipping,
        tax: 0,
        total: totalAmount,
        shipping_address: shippingAddress,
        payment_method: paymentMethod || 'cash_on_delivery',
        notes,
        source: 'storefront',
        status: 'pending',
      }]);

    if (orderError) throw orderError;

    // Insert Order Items
    if (orderItems.length > 0) {
      const { error: itemsError } = await insforge.database
        .from('order_items')
        .insert(orderItems);

      if (itemsError) {
        console.error('Failed to insert items:', itemsError);
        throw itemsError;
      }
    }

    res.status(201).json({
      success: true,
      data: { id: orderId, orderNumber, order_number: orderNumber, total: totalAmount },
      message: 'Order created successfully',
    });
  } catch (error: any) {
    console.error('Order Create Error:', error);
    res.status(400).json({
      success: false,
      error: { code: 'CREATE_ERROR', message: error.message },
    });
  }
});

// GET /api/storefront/orders/track/:orderNumber - Track order
router.get('/track/:orderNumber', async (req: Request, res: Response) => {
  try {
    const { data, error } = await insforge.database
      .from('orders')
      .select('*, order_items(*)')
      .eq('order_number', req.params.orderNumber)
      .single();

    if (error || !data) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Order not found' },
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

export default router;
