import { Link } from 'react-router-dom';
import { Plus, Minus, Trash2, ShoppingBag, ArrowRight } from 'lucide-react';
import { useCartStore } from '../store/cartStore';
import { motion } from 'framer-motion';

export default function CartPage() {
  const { items, removeItem, updateQuantity, getTotalPrice, clearCart } = useCartStore();

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 py-20" style={{ color: '#111827' }}>
        <div className="max-w-2xl mx-auto px-4 text-center">
          <div className="w-24 h-24 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-6">
            <ShoppingBag className="w-12 h-12 text-gray-400" />
          </div>
          <h2 className="text-2xl font-bold mb-4">سلة التسوق فارغة</h2>
          <p className="text-gray-600 mb-8">ابدأ التسوق واضف منتجات إلى سلة التسوق</p>
          <Link to="/" className="btn-primary">
            تصفح المنتجات
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8" style={{ color: '#111827' }}>
      <div className="max-w-6xl mx-auto px-4">
        <h1 className="text-3xl font-bold mb-8">سلة التسوق</h1>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Cart Items */}
          <div className="lg:col-span-2 space-y-4">
            {items.map((item, index) => {
              const itemKey = item.cartItemId || `${item.productId}-${item.variantId}-${index}`;
              const { designUrl, designFile, notes, designFileName, ...configOptions } = item.customization || {};

              return (
                <motion.div
                  key={itemKey}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="bg-white rounded-2xl p-6 flex gap-4 shadow-sm"
                >
                  <img
                    src={item.image || '/placeholder.png'}
                    alt={item.name}
                    className="w-24 h-24 object-cover rounded-xl"
                  />
                  <div className="flex-1">
                    <h3 className="font-bold text-lg text-gray-900">{item.name}</h3>

                    {/* Explicit Configuration Badges */}
                    <div className="flex flex-wrap gap-2 mt-2">
                      {Object.entries(configOptions).map(([key, value]) => {
                        if (!value || typeof value === 'object') return null;
                        let displayKey = key;
                        if (key === 'selected_size') displayKey = 'المقاس';
                        return (
                          <span key={key} className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-md border border-gray-200">
                            <span className="text-gray-500 mr-1">{displayKey}:</span> {String(value)}
                          </span>
                        );
                      })}
                    </div>

                    <div className="flex items-center justify-between mt-4">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => updateQuantity(itemKey, item.quantity - 1)}
                          className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center hover:bg-gray-200"
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                        <span className="font-bold w-8 text-center text-gray-900">{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(itemKey, item.quantity + 1)}
                          className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center hover:bg-gray-200"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="font-bold text-lg text-gray-900">{(item.price * item.quantity).toLocaleString()} دج</span>
                        <button
                          onClick={() => removeItem(itemKey)}
                          className="text-red-500 hover:bg-red-50 p-2 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )
            })}

            <button onClick={clearCart} className="text-red-500 hover:underline">
              إفراغ السلة
            </button>
          </div>

          {/* Summary */}
          <div className="lg:sticky lg:top-24 h-fit">
            <div className="bg-white rounded-2xl p-6 shadow-sm">
              <h3 className="text-xl font-bold mb-6 text-gray-900">ملخص الطلب</h3>
              <div className="space-y-3 mb-6">
                <div className="flex justify-between">
                  <span className="text-gray-600">المجموع</span>
                  <span className="text-gray-900">{getTotalPrice().toLocaleString()} دج</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">التوصيل</span>
                  <span className="text-green-600">مجاني</span>
                </div>
                <div className="border-t border-gray-200 pt-3 flex justify-between font-bold text-lg text-gray-900">
                  <span className="text-gray-900">الإجمالي</span>
                  <span className="text-primary">{getTotalPrice().toLocaleString()} دج</span>
                </div>
              </div>
              <Link to="/checkout" className="btn-primary w-full">
                إتمام الطلب
                <ArrowRight className="w-5 h-5 rotate-180" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
