import { Router, Request, Response } from 'express';
import { insforge } from '../config/insforge';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// Helper: Convert snake_case keys to camelCase
function toCamelCase(obj: any): any {
  if (Array.isArray(obj)) return obj.map(toCamelCase);
  if (obj === null || typeof obj !== 'object') return obj;
  const result: any = {};
  for (const key of Object.keys(obj)) {
    const camelKey = key.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
    result[camelKey] = toCamelCase(obj[key]);
  }
  return result;
}

// Helper: Upload base64 image to InsForge Storage
async function uploadImage(base64Data: string, folder: string = 'products'): Promise<string | null> {
  try {
    if (!base64Data || !base64Data.startsWith('data:image')) return null;

    const matches = base64Data.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) return null;

    const contentType = matches[1];
    const buffer = Buffer.from(matches[2], 'base64');
    const fileName = `${folder}/${uuidv4()}.${contentType.split('/')[1]}`;

    // Convert Buffer to Blob for InsForge SDK (expects File | Blob)
    const blob = new Blob([buffer], { type: contentType });

    const { data, error } = await insforge.storage
      .from('products')
      .upload(fileName, blob);

    if (error || !data) {
      console.error('Storage Upload Error:', error);
      return null;
    }

    // StorageFileSchema has url directly
    return data.url;
  } catch (err) {
    console.error('Image Upload Exception:', err);
    return null;
  }
}

// Helper: Convert camelCase to snake_case for DB
function toSnakeCase(data: any): any {
  const mapping: Record<string, string> = {
    basePrice: 'base_price',
    minQuantity: 'min_quantity',
    unitOfMeasure: 'unit_of_measure',
    isActive: 'is_active',
    isPublished: 'is_published',
    stockQuantity: 'stock_quantity',
    nameAr: 'name_ar',
    descriptionAr: 'description_ar',
    priceTiers: 'price_tiers',
    printOptions: 'print_options',
  };

  const result: any = {};
  for (const [key, value] of Object.entries(data)) {
    const snakeKey = mapping[key] || key;
    result[snakeKey] = value;
  }
  return result;
}

// GET /api/products - List all products (ERP)
router.get('/', async (req: Request, res: Response) => {
  try {
    const { page = 1, limit = 20, category, isPublished, search } = req.query;

    let query = insforge.database
      .from('products')
      .select('*', { count: 'exact' });

    if (category) query = query.eq('category', category as string);
    if (isPublished !== undefined) query = query.eq('is_published', isPublished === 'true');
    if (search) query = query.ilike('name', `%${search}%`);

    const from = (Number(page) - 1) * Number(limit);
    const to = from + Number(limit) - 1;

    const { data, error, count } = await query
      .range(from, to)
      .order('created_at', { ascending: false });

    if (error) throw error;

    res.json({
      success: true,
      data: toCamelCase(data),
      meta: {
        page: Number(page),
        limit: Number(limit),
        total: count || 0,
        totalPages: Math.ceil((count || 0) / Number(limit)),
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: { code: 'FETCH_ERROR', message: error.message || 'Failed to fetch products' },
    });
  }
});

// GET /api/products/:id - Get single product
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { data, error } = await insforge.database
      .from('products')
      .select('*')
      .eq('id', req.params.id)
      .single();

    if (error || !data) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Product not found' },
      });
    }

    res.json({ success: true, data: toCamelCase(data) });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: { code: 'FETCH_ERROR', message: error.message },
    });
  }
});

// POST /api/products - Create product
router.post('/', async (req: Request, res: Response) => {
  try {
    const { images, ...productData } = req.body;

    // Process images
    const uploadedImages: string[] = [];
    if (Array.isArray(images)) {
      for (const img of images) {
        if (img.startsWith('http')) {
          uploadedImages.push(img);
        } else {
          const url = await uploadImage(img);
          if (url) uploadedImages.push(url);
        }
      }
    }

    const dbData = toSnakeCase(productData);
    dbData.images = uploadedImages;

    const { data: newProduct, error } = await insforge.database
      .from('products')
      .insert([dbData])
      .select()
      .single();

    if (error) throw error;
    res.status(201).json({ success: true, data: toCamelCase(newProduct) });
  } catch (error: any) {
    console.error('Create Product Error:', error);
    res.status(400).json({
      success: false,
      error: { code: 'CREATE_ERROR', message: error.message },
    });
  }
});

// PUT /api/products/:id - Update product
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { images, ...updates } = req.body;

    // Process images if provided
    let uploadedImages: string[] | undefined;
    if (images) {
      uploadedImages = [];
      for (const img of images) {
        if (img.startsWith('http')) {
          uploadedImages.push(img);
        } else {
          const url = await uploadImage(img);
          if (url) uploadedImages.push(url);
        }
      }
    }

    const dbData = toSnakeCase(updates);
    if (uploadedImages) dbData.images = uploadedImages;

    const { data, error } = await insforge.database
      .from('products')
      .update(dbData)
      .eq('id', req.params.id)
      .select()
      .single();

    if (error) throw error;
    res.json({ success: true, data: toCamelCase(data) });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      error: { code: 'UPDATE_ERROR', message: error.message },
    });
  }
});

// DELETE /api/products/:id - Delete product
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { error } = await insforge.database
      .from('products')
      .delete()
      .eq('id', req.params.id);

    if (error) throw error;
    res.json({ success: true, message: 'Product deleted' });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      error: { code: 'DELETE_ERROR', message: error.message },
    });
  }
});

// ============ STOREFRONT ROUTES ============

// GET /api/storefront/products - List published products
router.get('/storefront/list', async (req: Request, res: Response) => {
  try {
    const { category } = req.query;

    let query = insforge.database
      .from('products')
      .select('*')
      .eq('is_published', true)
      .eq('is_active', true);

    if (category) query = query.eq('category', category as string);

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) throw error;
    res.json({ success: true, data: toCamelCase(data) });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: { code: 'FETCH_ERROR', message: error.message },
    });
  }
});

// GET /api/storefront/products/:id - Get single product for storefront
router.get('/storefront/:id', async (req: Request, res: Response) => {
  try {
    const { data, error } = await insforge.database
      .from('products')
      .select('*')
      .eq('id', req.params.id)
      .eq('is_published', true)
      .eq('is_active', true)
      .single();

    if (error || !data) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Product not found' },
      });
    }

    res.json({ success: true, data: toCamelCase(data) });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: { code: 'FETCH_ERROR', message: error.message },
    });
  }
});

export default router;
