import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CreditCard, Truck, MapPin, Package, Shield, Star, CheckCircle, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { useCartStore } from '../store/cartStore';
import { useOrdersStore } from '../store/ordersStore';
import { api } from '../services/api';
import { useSiteConfig } from '../hooks/useSiteConfig';

const ICON_MAP: Record<string, any> = { Truck, Shield, Package, Star, CheckCircle };

const wilayas = [
  'الجزائر العاصمة', 'وهران', 'قسنطينة', 'عنابة', 'سطيف', 'باتنة', 'بجاية', 'بليدة',
  'بويرة', 'تيزي وزو', 'المدية', 'الوادي', 'سعيدة', 'سكيكدة', 'قالمة', 'مستغانم',
  'تلمسان', 'جيجل', 'بسكرة', 'ورقلة', 'الأغواط', 'الشلف', 'تيبازة', 'البويرة'
];

interface ShippingRule {
  id: string;
  courier_name: string;
  base_fee: number;
  base_weight_kg: number;
  extra_fee_per_kg: number;
}

export default function CheckoutPage() {
  const navigate = useNavigate();
  const { config } = useSiteConfig();
  const cForm = config.forms.checkout;
  const cConfig = config.checkout;

  const { items, getTotalPrice, getTotalWeight, clearCart } = useCartStore();
  const { addOrder } = useOrdersStore();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [paymentMethod, setPaymentMethod] = useState<'cash_on_delivery' | 'bank_transfer' | 'office_pickup'>('cash_on_delivery');

  const [shippingRules, setShippingRules] = useState<ShippingRule[]>([]);
  const [selectedCourier, setSelectedCourier] = useState<ShippingRule | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    wilaya: '',
    address: '',
    notes: '',
  });

  useEffect(() => {
    const fetchRules = async () => {
      try {
        const res = await api.shippingRules.list();
        if (res.success && res.data) {
          setShippingRules(res.data);
          if (res.data.length > 0) setSelectedCourier(res.data[0]);
        }
      } catch (err) {
        console.error('Failed to load shipping rules', err);
      }
    };
    fetchRules();
  }, []);

  const subtotal = Math.round(getTotalPrice() * 100) / 100;
  const totalWeight = Math.round(getTotalWeight() * 1000) / 1000;

  let shippingCost = 0;
  if (subtotal <= 50000 && paymentMethod !== 'office_pickup') {
    if (selectedCourier) {
      if (totalWeight > selectedCourier.base_weight_kg) {
        let extraWeightKg = Math.ceil(totalWeight - selectedCourier.base_weight_kg);
        shippingCost = selectedCourier.base_fee + (extraWeightKg * selectedCourier.extra_fee_per_kg);
      } else {
        shippingCost = selectedCourier.base_fee;
      }
    } else {
      shippingCost = 1000;
    }
  }

  const orderTotal = subtotal + shippingCost;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const formFields = [
      { key: 'name', value: formData.name, check: cForm.name },
      { key: 'phone', value: formData.phone, check: cForm.phone },
      { key: 'email', value: formData.email, check: cForm.email },
      { key: 'wilaya', value: formData.wilaya, check: cForm.wilaya },
      { key: 'address', value: formData.address, check: cForm.address },
    ];

    for (const field of formFields) {
      if (field.check?.visible && field.check?.required && !field.value?.trim()) {
        toast.error(`حقل ${field.check.label} مطلوب`);
        return;
      }
    }

    setIsSubmitting(true);

    try {
      const order = {
        id: '',
        orderNumber: '',
        customer: formData.name,
        phone: formData.phone,
        email: formData.email || undefined,
        wilaya: formData.wilaya,
        address: formData.address,
        subtotal: subtotal,
        shipping: shippingCost,
        total: orderTotal,
        status: 'pending' as const,
        date: new Date().toISOString().split('T')[0],
        courier_name: selectedCourier?.courier_name || 'Courier A',
        items: items.map(item => {
          const itemKey = item.cartItemId || `${item.productId}-${item.variantId || 'base'}`;
          return {
            productId: item.productId,
            variantId: item.variantId,
            cartItemId: itemKey,
            name: item.name,
            quantity: item.quantity,
            price: item.price,
            unitPrice: item.price,
            unit_weight: item.unit_weight ?? 0,
            total: item.price * item.quantity,
            customization: item.customization,
          };
        }),
        notes: formData.notes || undefined,
        productionProgress: 0,
        paymentMethod: paymentMethod,
      };

      const success = await addOrder(order);

      if (success) {
        clearCart();
        toast.success('تم إنشاء الطلب بنجاح!');
        const currentOrder = useOrdersStore.getState().currentOrder;
        const displayId = currentOrder?.orderNumber || currentOrder?.id || '';
        navigate(`/order-success/${displayId}`);
      } else {
        toast.error('فشل في حفظ الطلب');
      }

    } catch (error) {
      console.error('Order error:', error);
      toast.error('حدث خطأ أثناء إنشاء الطلب');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-surface-darker py-32 text-center text-white">
        <h2 className="text-3xl font-bold mb-6">سلة التسوق فارغة</h2>
        <a href="/products" className="btn-primary inline-flex gap-2"><Package className="w-5 h-5" /> تصفح المنتجات</a>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative overflow-hidden bg-surface-darker pt-24 pb-16 text-white">
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none mix-blend-overlay"></div>
      <div className="blob-purple w-[800px] h-[800px] top-[-200px] right-[-200px] opacity-20 mix-blend-screen pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 relative z-10">
        <h1 className="text-4xl font-bold mb-10 tracking-tight">إتمام الطلب</h1>

        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            <form onSubmit={handleSubmit} className="space-y-6">

              {/* Contact Info */}
              <div className="glass-card p-8 border border-white/10 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-pakomi-purple/10 rounded-full blur-3xl -mr-16 -mt-16"></div>

                <h3 className="text-2xl font-bold mb-8 flex items-center gap-3 relative z-10">
                  <div className="p-2 bg-pakomi-purple/20 rounded-xl border border-pakomi-purple/30 text-pakomi-glow">
                    <MapPin className="w-6 h-6" />
                  </div>
                  معلومات التوصيل
                </h3>

                <div className="grid md:grid-cols-2 gap-5 relative z-10">
                  {cForm.name?.visible !== false && (
                    <div className="md:col-span-1">
                      <label className="text-sm font-medium text-gray-400 mb-2 block">
                        {cForm.name?.label || 'الاسم الكامل'} {cForm.name?.required && <span className="text-red-500">*</span>}
                      </label>
                      <input type="text" placeholder={cForm.name?.placeholder || 'محمد بن عبد الله'} value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="input bg-black/40 border-white/10 text-white placeholder:text-gray-600 focus:bg-black/60 focus:border-pakomi-purple transition-all" required={cForm.name?.required} />
                      {cForm.name?.help_text && <p className="text-xs text-gray-500 mt-1">{cForm.name.help_text}</p>}
                    </div>
                  )}
                  {cForm.phone?.visible !== false && (
                    <div className="md:col-span-1">
                      <label className="text-sm font-medium text-gray-400 mb-2 block">
                        {cForm.phone?.label || 'رقم الهاتف'} {cForm.phone?.required && <span className="text-red-500">*</span>}
                      </label>
                      <input type="tel" placeholder={cForm.phone?.placeholder || '05XXXXXXXX'} value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} className="input bg-black/40 border-white/10 text-white placeholder:text-gray-600 focus:bg-black/60 focus:border-pakomi-purple transition-all text-left" dir="ltr" required={cForm.phone?.required} />
                      {cForm.phone?.help_text && <p className="text-xs text-gray-500 mt-1">{cForm.phone.help_text}</p>}
                    </div>
                  )}
                  {cForm.email?.visible && (
                    <div className="md:col-span-2">
                      <label className="text-sm font-medium text-gray-400 mb-2 block">
                        {cForm.email.label} {cForm.email.required && <span className="text-red-500">*</span>}
                      </label>
                      <input type="email" placeholder={cForm.email.placeholder} value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="input bg-black/40 border-white/10 text-white placeholder:text-gray-600 focus:bg-black/60 focus:border-pakomi-purple transition-all text-left" dir="ltr" required={cForm.email.required} />
                      {cForm.email?.help_text && <p className="text-xs text-gray-500 mt-1">{cForm.email.help_text}</p>}
                    </div>
                  )}
                  {cForm.wilaya?.visible !== false && (
                    <div className="md:col-span-1">
                      <label className="text-sm font-medium text-gray-400 mb-2 block">
                        {cForm.wilaya?.label || 'الولاية'} {cForm.wilaya?.required && <span className="text-red-500">*</span>}
                      </label>
                      <select value={formData.wilaya} onChange={(e) => setFormData({ ...formData, wilaya: e.target.value })} className="input appearance-none bg-black/40 border-white/10 text-white focus:bg-black/60 focus:border-pakomi-purple transition-all" required={cForm.wilaya?.required}>
                        <option value="" className="text-gray-500 bg-surface-dark">{cForm.wilaya?.placeholder || 'اختر الولاية *'}</option>
                        {wilayas.map(w => <option key={w} value={w} className="bg-surface-dark">{w}</option>)}
                      </select>
                      {cForm.wilaya?.help_text && <p className="text-xs text-gray-500 mt-1">{cForm.wilaya.help_text}</p>}
                    </div>
                  )}
                  {cForm.address?.visible !== false && (
                    <div className="md:col-span-1">
                      <label className="text-sm font-medium text-gray-400 mb-2 block">
                        {cForm.address?.label || 'العنوان بالتفصيل'} {cForm.address?.required && <span className="text-red-500">*</span>}
                      </label>
                      <input type="text" placeholder={cForm.address?.placeholder || 'الحي، البلدية...'} value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} className="input bg-black/40 border-white/10 text-white placeholder:text-gray-600 focus:bg-black/60 focus:border-pakomi-purple transition-all" required={cForm.address?.required} />
                      {cForm.address?.help_text && <p className="text-xs text-gray-500 mt-1">{cForm.address.help_text}</p>}
                    </div>
                  )}
                  {cForm.notes?.visible !== false && (
                    <div className="md:col-span-2 mt-2">
                      <label className="text-sm font-medium text-gray-400 mb-2 block">
                        {cForm.notes?.label || 'ملاحظات إضافية'}
                      </label>
                      <textarea placeholder={cForm.notes?.placeholder || "ملاحظات للتوصيل (اختياري)"} value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} className="input resize-none bg-black/40 border-white/10 text-white placeholder:text-gray-600 focus:bg-black/60 focus:border-pakomi-purple transition-all" rows={3} />
                      {cForm.notes?.help_text && <p className="text-xs text-gray-500 mt-1">{cForm.notes.help_text}</p>}
                    </div>
                  )}
                </div>
              </div>

              {/* Shipping Method */}
              {paymentMethod !== 'office_pickup' && (
                <div className="glass-card p-8 border border-white/10 relative overflow-hidden">
                  <h3 className="text-2xl font-bold mb-8 flex items-center gap-3">
                    <div className="p-2 bg-pakomi-purple/20 rounded-xl border border-pakomi-purple/30 text-pakomi-glow">
                      <Truck className="w-6 h-6" />
                    </div>
                    شركة التوصيل
                  </h3>

                  <div className="space-y-4">
                    {shippingRules.map((courier) => {
                      let cost = Number(courier.base_fee);
                      if (totalWeight > courier.base_weight_kg) {
                        const extra = Math.ceil(totalWeight - courier.base_weight_kg);
                        cost += extra * Number(courier.extra_fee_per_kg);
                      }

                      return (
                        <label key={courier.id} className={`flex items-center gap-4 p-5 rounded-2xl border-2 cursor-pointer transition-all ${selectedCourier?.id === courier.id ? 'border-pakomi-purple bg-pakomi-purple/10 shadow-[0_0_20px_rgba(102,45,145,0.15)]' : 'border-white/10 bg-black/20 hover:border-white/20'}`}>
                          <input type="radio" name="courier" checked={selectedCourier?.id === courier.id} onChange={() => setSelectedCourier(courier)} className="w-5 h-5 text-pakomi-purple focus:ring-pakomi-glow bg-transparent border-gray-600" />
                          <div className="flex-1">
                            <p className="font-bold text-lg text-white">{courier.courier_name}</p>
                            <p className="text-sm text-gray-400">{cConfig.shipping_calculator_text || 'التكلفة التقديرية حسب الوزن'} ({totalWeight} كغ)</p>
                          </div>
                          <span className="font-bold text-xl text-pakomi-glow">{cost.toLocaleString()} دج</span>
                        </label>
                      );
                    })}
                    {shippingRules.length === 0 && <p className="text-gray-500 text-sm">جاري تحميل شركات التوصيل...</p>}
                  </div>
                </div>
              )}

              {/* Payment Method */}
              <div className="glass-card p-8 border border-white/10 relative overflow-hidden">
                <h3 className="text-2xl font-bold mb-8 flex items-center gap-3">
                  <div className="p-2 bg-pakomi-purple/20 rounded-xl border border-pakomi-purple/30 text-pakomi-glow">
                    <CreditCard className="w-6 h-6" />
                  </div>
                  {cConfig?.payment_title || 'طريقة الدفع'}
                </h3>

                <div className="space-y-4">
                  {/* COD */}
                  <label className={`flex items-center gap-4 p-5 rounded-2xl border-2 cursor-pointer transition-all ${paymentMethod === 'cash_on_delivery' ? 'border-pakomi-purple bg-pakomi-purple/10 shadow-[0_0_20px_rgba(102,45,145,0.15)]' : 'border-white/10 bg-black/20 hover:border-white/20'}`}>
                    <input type="radio" name="payment" checked={paymentMethod === 'cash_on_delivery'} onChange={() => setPaymentMethod('cash_on_delivery')} className="w-5 h-5 text-pakomi-purple focus:ring-pakomi-glow flex-shrink-0 bg-transparent border-gray-600" />
                    <div className="flex-1">
                      <p className="font-bold text-lg text-white">{cConfig?.payment_methods?.cod?.label || 'الدفع عند الاستلام'}</p>
                      <p className="text-sm text-gray-400">{cConfig?.payment_methods?.cod?.description || 'ادفع نقداً عند استلام طلبك'}</p>
                    </div>
                  </label>

                  {/* Bank Transfer */}
                  <label className={`flex items-center gap-4 p-5 rounded-2xl border-2 cursor-pointer transition-all ${paymentMethod === 'bank_transfer' ? 'border-pakomi-purple bg-pakomi-purple/10 shadow-[0_0_20px_rgba(102,45,145,0.15)]' : 'border-white/10 bg-black/20 hover:border-white/20'}`}>
                    <input type="radio" name="payment" checked={paymentMethod === 'bank_transfer'} onChange={() => setPaymentMethod('bank_transfer')} className="w-5 h-5 text-pakomi-purple focus:ring-pakomi-glow flex-shrink-0 bg-transparent border-gray-600" />
                    <div className="flex-1">
                      <p className="font-bold text-lg text-white">{cConfig?.payment_methods?.bank?.label || 'تحويل بنكي'}</p>
                      <p className="text-sm text-gray-400">{cConfig?.payment_methods?.bank?.description || 'تحويل مباشر إلى حسابنا البنكي'}</p>
                    </div>
                  </label>

                  {/* Pickup */}
                  <label className={`flex items-center gap-4 p-5 rounded-2xl border-2 cursor-pointer transition-all ${paymentMethod === 'office_pickup' ? 'border-pakomi-purple bg-pakomi-purple/10 shadow-[0_0_20px_rgba(102,45,145,0.15)]' : 'border-white/10 bg-black/20 hover:border-white/20'}`}>
                    <input type="radio" name="payment" checked={paymentMethod === 'office_pickup'} onChange={() => setPaymentMethod('office_pickup')} className="w-5 h-5 text-pakomi-purple focus:ring-pakomi-glow flex-shrink-0 bg-transparent border-gray-600" />
                    <div className="flex-1">
                      <p className="font-bold text-lg text-white">{cConfig?.payment_methods?.pickup?.label || 'الاستلام من المحل'}</p>
                      <p className="text-sm text-gray-400">{cConfig?.payment_methods?.pickup?.description || 'استلم طلبك من مقرنا دُون توقُع رسوم توصيل'}</p>
                    </div>
                  </label>
                </div>
              </div>

              {/* Badges Display */}
              {cConfig?.shipping_badges?.length > 0 && (
                <div className="flex flex-wrap gap-4 mt-6">
                  {cConfig.shipping_badges.filter(b => b.enabled).map((badge, idx) => {
                    const BIcon = ICON_MAP[badge.icon] || Package;
                    return (
                      <div key={idx} className="flex items-center gap-2 bg-black/30 border border-white/5 px-4 py-3 rounded-xl">
                        <BIcon className="w-5 h-5 text-pakomi-glow" />
                        <span className="text-sm font-medium text-gray-300">{badge.text}</span>
                      </div>
                    );
                  })}
                </div>
              )}

              <button type="submit" disabled={isSubmitting} className="btn-primary w-full text-xl py-5 shadow-[0_0_30px_rgba(138,77,204,0.4)] transform hover:scale-105 active:scale-95 transition-all mt-8">
                {isSubmitting ? <span className="flex items-center justify-center gap-2"><Loader2 className="w-6 h-6 animate-spin" /> جاري الإرسال...</span> : 'تأكيد الطلب نهائياً'}
              </button>

            </form>
          </div>

          <div className="lg:sticky lg:top-24 h-fit">
            <div className="glass-card p-6 border border-white/10 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-pakomi-purple/20 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>

              <h3 className="text-xl font-bold mb-6 text-white pb-4 border-b border-white/10">ملخص الطلب</h3>

              <div className="space-y-5 mb-8 overflow-y-auto max-h-[40vh] pr-2 custom-scrollbar">
                {items.map((item, idx) => {
                  const itemKey = item.cartItemId || `${item.productId}-${item.variantId || 'base'}-${idx}`;
                  const { designUrl, designFile, notes, designFileName, ...configOptions } = item.customization || {};

                  return (
                    <div key={itemKey} className="flex gap-4">
                      <div className="w-16 h-16 rounded-xl overflow-hidden bg-black/50 border border-white/5 flex-shrink-0">
                        <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-white truncate">{item.name}</p>

                        <div className="flex flex-wrap gap-1 mt-1 mb-1.5">
                          {Object.entries(configOptions).map(([key, value]) => {
                            if (!value || typeof value === 'object') return null;
                            let displayKey = key;
                            if (key === 'selected_size') displayKey = 'المقاس';
                            return (
                              <span key={key} className="text-[10px] bg-white/5 border border-white/10 text-gray-400 px-1.5 py-0.5 rounded">
                                {displayKey}: {String(value)}
                              </span>
                            );
                          })}
                        </div>

                        <div className="flex justify-between items-center mt-2">
                          <p className="text-sm text-gray-400">{item.quantity} × {item.price.toLocaleString()} دج</p>
                          <p className="font-bold text-pakomi-glow">{(item.quantity * item.price).toLocaleString()} دج</p>
                        </div>
                        {item.unit_weight ? (
                          <p className="text-xs text-gray-500 mt-1">الوزن: {(item.unit_weight * item.quantity).toFixed(2)} كغ</p>
                        ) : null}
                      </div>
                    </div>
                  )
                })}
              </div>

              <div className="space-y-4 bg-black/20 p-5 rounded-2xl border border-white/5">
                <div className="flex justify-between text-gray-300">
                  <span>المجموع الفرعي</span>
                  <span className="font-medium text-white">{subtotal.toLocaleString()} دج</span>
                </div>
                {totalWeight > 0 && (
                  <div className="flex justify-between text-gray-300">
                    <span>الوزن الإجمالي</span>
                    <span className="font-medium text-white">{totalWeight} كغ</span>
                  </div>
                )}
                <div className="flex justify-between text-gray-300">
                  <span>التوصيل {selectedCourier ? `(${selectedCourier.courier_name})` : ''}</span>
                  {shippingCost === 0 ? (
                    <span className="text-green-400 font-medium">مجاني / لا يوجد</span>
                  ) : (
                    <span className="font-medium text-white">{shippingCost.toLocaleString()} دج</span>
                  )}
                </div>
                {shippingCost > 0 && subtotal <= 50000 && (
                  <p className="text-xs text-pakomi-glow/80 text-center">التوصيل مجاني للطلبات فوق 50,000 دج</p>
                )}

                <div className="pt-4 border-t border-white/10">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-bold text-white">الإجمالي</span>
                    <span className="text-2xl font-bold text-pakomi-glow tracking-tight">{orderTotal.toLocaleString()} دج</span>
                  </div>
                </div>
              </div>

              {/* Policies List */}
              {cConfig?.policies?.length > 0 && (
                <div className="mt-8 space-y-3">
                  {cConfig.policies.map((p, idx) => (
                    <div key={idx} className="flex gap-3 text-sm">
                      <CheckCircle className="w-5 h-5 text-pakomi-glow flex-shrink-0" />
                      <div>
                        <p className="font-bold text-gray-200">{p.title}</p>
                        <p className="text-gray-500 leading-relaxed mt-0.5">{p.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
