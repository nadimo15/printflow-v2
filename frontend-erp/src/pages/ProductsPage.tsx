import { useState, useEffect } from 'react';
import { Plus, Search, Edit, Trash2, Loader2, Package, Printer } from 'lucide-react';
import { api } from '../services/api';
import ProductEditorModal from '../components/product-editor/ProductEditorModal';
import toast from 'react-hot-toast';

interface Product {
  id: string;
  name: string;
  name_ar?: string;
  description?: string;
  description_ar?: string;
  category: string;
  base_price: number;
  min_quantity: number;
  unit_of_measure?: string;
  is_active: boolean;
  is_published: boolean;
  images?: string[];
  image?: string;
  attributes?: any[];
  price_tiers?: { quantity: number; price: number }[];
  print_options?: {
    enabled: boolean;
    sides?: {
      enabled: boolean;
      options: any[];
    };
    colors?: {
      enabled: boolean;
      options: any[];
    };
  };
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const response = await api.products.list();
      if (response.success && response.data) {
        setProducts(response.data);
      }
    } catch (error) {
      console.error('Failed to fetch products:', error);
      toast.error('فشل في تحميل المنتجات');
    } finally {
      setLoading(false);
    }
  };

  const getCategoryLabel = (category: string) => {
    const labels: Record<string, string> = {
      bags: 'أكياس',
      packaging: 'تغليف',
      apparel: 'ملابس',
      stationery: 'قرطاسية',
      promotional: 'ترويجية',
      boxes: 'صناديق',
      cups: 'أكواب',
      stickers: 'ملصقات',
    };
    return labels[category] || category;
  };

  const handleSaveProduct = async (productData: any, bomItems?: any[]) => {
    // Whitelist only columns that exist in the DB
    const DB_COLUMNS = [
      'name', 'name_ar', 'name_en', 'description', 'description_ar', 'description_en',
      'category', 'base_price', 'min_quantity', 'unit_of_measure',
      'is_active', 'is_published', 'image', 'images',
      'price_tiers', 'production_options', 'attribute_groups',
      'has_weight', 'weight_per_unit', 'weight_unit',
      'packaging_weight', 'packaging_weight_unit',
    ];

    const payload: any = {};
    DB_COLUMNS.forEach(col => {
      if (productData[col] !== undefined) payload[col] = productData[col];
    });
    // Map name_en → name for backward compat
    payload.name = productData.name_en || productData.name_ar;
    payload.description = productData.description_en || productData.description_ar || '';

    // ── Pricing mode: serialize size_variants → price_tiers (multi-size)
    if (productData.pricing_mode === 'multi-size' && Array.isArray(productData.size_variants)) {
      // Store the full multi-size structure in price_tiers JSONB
      payload.price_tiers = productData.size_variants.map((v: any) => ({
        size: v.size,
        label: v.label,
        tiers: v.tiers.map((t: any) => ({ qty: t.qty, unit_price: t.unit_price })),
      }));
      // Set base_price to the lowest first-tier price across all variants
      const allPrices: number[] = productData.size_variants
        .flatMap((v: any) => v.tiers.map((t: any) => t.unit_price))
        .filter((p: number) => p > 0);
      if (allPrices.length > 0) payload.base_price = Math.min(...allPrices);
    }

    let savedProductId: string | null = null;
    if (editingProduct) {
      const response = await api.products.update(editingProduct.id, payload);
      if (response.success) savedProductId = editingProduct.id;
    } else {
      const response = await api.products.create(payload);
      if (response.success && response.data) savedProductId = response.data.id;
    }

    if (savedProductId && bomItems) {
      const finalBomItems = bomItems.map(item => ({ ...item, product_id: savedProductId }));
      await api.productBom.replaceAll(savedProductId, finalBomItems);
    }

    fetchProducts();
    setIsModalOpen(false);
    setEditingProduct(null);
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setIsModalOpen(true);
  };

  const handleAdd = () => {
    setEditingProduct(null);
    setIsModalOpen(true);
  };

  const handleDelete = async (productId: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا المنتج؟')) return;

    try {
      const response = await api.products.delete(productId);
      if (response.success) {
        toast.success('تم حذف المنتج بنجاح');
        fetchProducts();
      }
    } catch (error) {
      console.error('Failed to delete product:', error);
      toast.error('فشل في حذف المنتج');
    }
  };

  const filteredProducts = products.filter(p =>
    (p.name_ar || p.name).toLowerCase().includes(search.toLowerCase()) ||
    p.category?.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">المنتجات</h1>
        <button
          onClick={handleAdd}
          className="btn btn-primary flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          إضافة منتج
        </button>
      </div>

      <div className="card">
        <div className="p-4 border-b">
          <div className="relative max-w-md">
            <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="بحث عن منتج..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input pr-12"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-right p-4 text-sm font-medium text-gray-500">المنتج</th>
                <th className="text-right p-4 text-sm font-medium text-gray-500">الفئة</th>
                <th className="text-right p-4 text-sm font-medium text-gray-500">السعر الأساسي</th>
                <th className="text-right p-4 text-sm font-medium text-gray-500">درجات الأسعار</th>
                <th className="text-right p-4 text-sm font-medium text-gray-500">الحد الأدنى</th>
                <th className="text-right p-4 text-sm font-medium text-gray-500">الخصائص</th>
                <th className="text-right p-4 text-sm font-medium text-gray-500">الطباعة</th>
                <th className="text-right p-4 text-sm font-medium text-gray-500">الحالة</th>
                <th className="text-right p-4 text-sm font-medium text-gray-500">إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.map((product) => (
                <tr key={product.id} className="border-b last:border-0 hover:bg-gray-50">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      {product.images?.[0] || product.image ? (
                        <img
                          src={product.images?.[0] || product.image}
                          alt={product.name_ar || product.name}
                          className="w-12 h-12 object-cover rounded-lg"
                        />
                      ) : (
                        <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                          <Package className="w-6 h-6 text-gray-400" />
                        </div>
                      )}
                      <div>
                        <p className="font-medium">{product.name_ar || product.name}</p>
                        {(product.description_ar || product.description) && (
                          <p className="text-xs text-gray-500 line-clamp-1">
                            {product.description_ar || product.description}
                          </p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="p-4">{getCategoryLabel(product.category)}</td>
                  <td className="p-4">{(product.base_price || 0).toLocaleString()} دج</td>
                  <td className="p-4">
                    {product.price_tiers && product.price_tiers.length > 0 ? (
                      <span className="text-sm text-primary">
                        {product.price_tiers.length} درجة
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400">-</span>
                    )}
                  </td>
                  <td className="p-4">{product.min_quantity || 1} {product.unit_of_measure || 'قطعة'}</td>
                  <td className="p-4">
                    {product.attributes && product.attributes.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {product.attributes.map((attr: any, idx: number) => (
                          <span key={idx} className="text-xs bg-gray-100 px-2 py-1 rounded">
                            {attr.name_ar || attr.name}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-xs text-gray-400">-</span>
                    )}
                  </td>
                  <td className="p-4">
                    {product.print_options?.enabled ? (
                      <div className="flex flex-col gap-1">
                        <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded flex items-center gap-1">
                          <Printer className="w-3 h-3" />
                          {product.print_options.sides?.enabled && 'وجه'}
                          {product.print_options.sides?.enabled && product.print_options.colors?.enabled && ' + '}
                          {product.print_options.colors?.enabled && 'ألوان'}
                        </span>
                      </div>
                    ) : (
                      <span className="text-xs text-gray-400">-</span>
                    )}
                  </td>
                  <td className="p-4">
                    <div className="flex gap-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${product.is_published ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                        {product.is_published ? 'منشور' : 'مسودة'}
                      </span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${product.is_active ? 'bg-blue-100 text-blue-800' : 'bg-red-100 text-red-800'
                        }`}>
                        {product.is_active ? 'نشط' : 'غير نشط'}
                      </span>
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEdit(product)}
                        className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(product.id)}
                        className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredProducts.length === 0 && (
          <div className="p-8 text-center text-gray-500">
            <Package className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p>لا توجد منتجات</p>
          </div>
        )}
      </div>

      {/* Product Editor Modal */}
      <ProductEditorModal
        product={editingProduct}
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingProduct(null);
        }}
        onSave={handleSaveProduct}
      />
    </div>
  );
}
