import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Search, Filter, Package, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { api } from '../services/api';

export default function ProductsPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true);
        const response = await api.products.list();
        if (response.success && response.data) {
          setProducts(response.data);
        } else {
          // Fallback to demo products if API fails
          setProducts([
            {
              id: '1',
              name: 'أكياس كرافت',
              name_ar: 'أكياس كرافت',
              description: 'أكياس ورقية كرافت بجودة عالية مع طباعة شعارك.',
              base_price: 850,
              min_quantity: 100,
              image: 'https://images.unsplash.com/photo-1544816155-12df9643f363?w=400',
              category: 'bags'
            },
            {
              id: '2',
              name: 'تيشرتات قطنية',
              name_ar: 'تيشرتات قطنية',
              description: 'تيشرتات قطنية 100% بألوان متعددة.',
              base_price: 1500,
              min_quantity: 24,
              image: 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400',
              category: 'apparel'
            },
            {
              id: '3',
              name: 'صناديق كرتونية',
              name_ar: 'صناديق كرتونية',
              description: 'صناديق كرتونية للتغليف والشحن.',
              base_price: 1200,
              min_quantity: 50,
              image: 'https://images.unsplash.com/photo-1589829085413-56de8ae18c73?w=400',
              category: 'boxes'
            },
            {
              id: '4',
              name: 'أكواب ورقية',
              name_ar: 'أكواب ورقية',
              description: 'أكواب ورقية للمشروبات الساخنة.',
              base_price: 600,
              min_quantity: 100,
              image: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=400',
              category: 'cups'
            },
            {
              id: '5',
              name: 'كابات مطرزة',
              name_ar: 'كابات مطرزة',
              description: 'كابات بيسبول مع تطريز الشعار.',
              base_price: 2200,
              min_quantity: 24,
              image: 'https://images.unsplash.com/photo-1588850561407-ed78c282e89b?w=400',
              category: 'apparel'
            },
            {
              id: '6',
              name: 'ملصقات لاصقة',
              name_ar: 'ملصقات لاصقة',
              description: 'ملصقات لاصقة بأشكال وأحجام متنوعة.',
              base_price: 400,
              min_quantity: 100,
              image: 'https://images.unsplash.com/photo-1566159313318-d0bd3e4d3426?w=400',
              category: 'stickers'
            }
          ]);
        }
      } catch (error) {
        console.error('Failed to fetch products:', error);
        toast.error('فشل في تحميل المنتجات');
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, []);

  const categories = [
    { id: 'all', name: 'الكل' },
    { id: 'bags', name: 'أكياس' },
    { id: 'apparel', name: 'ملابس' },
    { id: 'boxes', name: 'صناديق' },
    { id: 'cups', name: 'أكواب' },
    { id: 'stickers', name: 'ملصقات' },
  ];

  const filteredProducts = products.filter((product) => {
    const matchesSearch = (product.name_ar || product.name).toLowerCase().includes(search.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || product.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-surface-darker flex items-center justify-center pt-24">
        <Loader2 className="w-8 h-8 animate-spin text-pakomi-glow" />
      </div>
    );
  }

  return (
    <div className="min-h-screen relative overflow-hidden bg-surface-darker pt-24 pb-16">
      {/* Background elements */}
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none mix-blend-overlay"></div>
      <div className="blob-purple w-[800px] h-[800px] top-[-200px] right-[-200px] opacity-40 mix-blend-screen" />

      <div className="max-w-7xl mx-auto px-4 relative z-10">
        {/* Header */}
        <div className="text-center mb-16">
          <span className="text-pakomi-glow font-bold tracking-wider uppercase text-sm">تصفح الكتالوج</span>
          <h1 className="text-4xl md:text-5xl font-bold mt-3 mb-4 text-white">منتجاتنا</h1>
          <p className="text-gray-400 max-w-2xl mx-auto text-lg">
            اكتشف مجموعتنا المتنوعة من المنتجات القابلة للطباعة والتخصيص
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-6 mb-12">
          <div className="relative flex-1">
            <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
            <input
              type="text"
              placeholder="بحث عن منتج..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input pr-12 w-full bg-surface-dark/50 border-white/10 text-white placeholder:text-gray-500 hover:border-pakomi-purple/50 focus:border-pakomi-purple focus:ring-1 focus:ring-pakomi-purple focus:bg-surface-dark transition-all duration-300"
            />
          </div>
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
            <Filter className="w-5 h-5 text-pakomi-glow flex-shrink-0 ml-2" />
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-5 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all duration-300 border ${selectedCategory === cat.id
                    ? 'bg-pakomi-purple text-white border-pakomi-purple shadow-[0_0_15px_rgba(102,45,145,0.4)]'
                    : 'bg-surface-dark/50 border-white/10 text-gray-400 hover:text-white hover:border-white/20 hover:bg-surface-dark'
                  }`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>

        {/* Products Grid */}
        {filteredProducts.length === 0 ? (
          <div className="text-center py-20 glass-card mx-auto max-w-2xl">
            <Package className="w-16 h-16 text-gray-600 mx-auto mb-6" />
            <p className="text-xl text-gray-400 font-medium">لا توجد منتجات مطابقة للبحث</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {filteredProducts.map((product, index) => (
              <motion.div
                key={product.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Link
                  to={`/product/${product.id}`}
                  className="glass-card block group overflow-hidden border border-white/10 hover:border-pakomi-purple/50 bg-surface-dark transition-all duration-300"
                >
                  <div className="relative h-60 overflow-hidden bg-surface-darker">
                    <img
                      src={product.image || product.images?.[0] || '/placeholder.png'}
                      alt={product.name_ar || product.name}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 brightness-90 group-hover:brightness-100"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-surface-darker to-transparent opacity-80" />
                  </div>
                  <div className="p-6 relative -mt-4 bg-surface-dark/95 backdrop-blur-sm rounded-t-2xl">
                    <h3 className="font-bold text-xl mb-2 text-white group-hover:text-pakomi-glow transition-colors">
                      {product.name_ar || product.name}
                    </h3>
                    <p className="text-gray-400 text-sm mb-6 line-clamp-2 leading-relaxed">
                      {product.description_ar || product.description}
                    </p>
                    <div className="flex items-end justify-between pt-4 border-t border-white/5">
                      <div>
                        <p className="text-xs text-gray-500 mb-1">يبدأ من</p>
                        <span className="text-2xl font-bold text-white">
                          {(product.base_price || product.basePrice || 0).toLocaleString()}
                        </span>
                        <span className="text-pakomi-glow text-sm mr-1 font-bold">دج</span>
                      </div>
                      <span className="text-xs text-white bg-pakomi-purple/20 border border-pakomi-purple/30 px-3 py-1.5 rounded-full font-medium shadow-[0_0_10px_rgba(102,45,145,0.2)]">
                        أقل كمية: {product.min_quantity || product.minQuantity || 1}
                      </span>
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
