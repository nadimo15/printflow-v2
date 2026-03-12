import { useState, useEffect } from 'react';
import { X, Plus, Trash2 } from 'lucide-react';
import { api } from '../services/api';
import toast from 'react-hot-toast';

interface OrderCreationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export default function OrderCreationModal({ isOpen, onClose, onSuccess }: OrderCreationModalProps) {
    const [loading, setLoading] = useState(false);
    const [products, setProducts] = useState<any[]>([]);
    const [shippingRules, setShippingRules] = useState<any[]>([]);

    const [customerInfo, setCustomerInfo] = useState({
        name: '',
        phone: '',
        wilaya: '',
        address: ''
    });

    const [orderOptions, setOrderOptions] = useState({
        courierName: 'Courier A', // Default or select from shippingRules
        paymentMethod: 'cash_on_delivery',
        notes: ''
    });

    const [items, setItems] = useState<any[]>([]);

    useEffect(() => {
        if (isOpen) {
            fetchDependencies();
            // Reset form
            setCustomerInfo({ name: '', phone: '', wilaya: '', address: '' });
            setItems([]);
            setOrderOptions({ courierName: 'Courier A', paymentMethod: 'cash_on_delivery', notes: '' });
        }
    }, [isOpen]);

    const fetchDependencies = async () => {
        try {
            const [prodRes, shipRes] = await Promise.all([
                api.products.list(),
                api.shippingRules.list()
            ]);
            if (prodRes.success) setProducts(prodRes.data || []);
            if (shipRes.success) {
                setShippingRules(shipRes.data || []);
                if (shipRes.data && shipRes.data.length > 0) {
                    setOrderOptions(prev => ({ ...prev, courierName: shipRes.data[0].courier_name }));
                }
            }
        } catch (error) {
            console.error('Failed to fetch dependencies', error);
            toast.error('فشل في جلب البيانات');
        }
    };

    const handleAddItem = () => {
        setItems([...items, { productId: '', quantity: 1, price: 0, customizationStr: '' }]);
    };

    const handleRemoveItem = (index: number) => {
        setItems(items.filter((_, i) => i !== index));
    };

    const handleItemChange = (index: number, field: string, value: any) => {
        const newItems = [...items];
        newItems[index][field] = value;

        // Auto-fill price if product changes
        if (field === 'productId' && value) {
            const product = products.find(p => p.id === value);
            if (product) {
                newItems[index].price = product.base_price || 0;
                newItems[index].name = product.name;
                newItems[index].nameAr = product.name_ar;
                newItems[index].unit_weight = product.weight_kg || 0; // Provide defaults if possible
            }
        }

        setItems(newItems);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (items.length === 0) {
            toast.error('يجب إضافة منتج واحد على الأقل');
            return;
        }
        if (!customerInfo.name || !customerInfo.phone || !customerInfo.wilaya) {
            toast.error('يرجى ملء بيانات العميل الأساسية');
            return;
        }

        setLoading(true);
        try {
            // Map items to match API expectation
            const formattedItems = items.map(item => ({
                ...item,
                customization: item.customizationStr ? { notes: item.customizationStr } : null
            }));

            const payload = {
                customer: customerInfo.name,
                phone: customerInfo.phone,
                wilaya: customerInfo.wilaya,
                address: customerInfo.address,
                items: formattedItems,
                paymentMethod: orderOptions.paymentMethod,
                notes: orderOptions.notes,
                courier_name: orderOptions.courierName,
                source: 'erp' // Explicitly mark as ERP-created
            };

            await api.orders.create(payload);
            toast.success('تم إنشاء الطلب بنجاح');
            onSuccess();
            onClose();
        } catch (error: any) {
            console.error('Order creation failed:', error);
            toast.error(error.message || 'فشل في إنشاء الطلب');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
                <div className="p-6 border-b flex justify-between items-center bg-gray-50 flex-shrink-0">
                    <h2 className="text-xl font-bold">إنشاء طلب جديد (ERP)</h2>
                    <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-lg transition-colors">
                        <X className="w-5 h-5 text-gray-500" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-8 flex-1">
                    {/* Customer Info Section */}
                    <section>
                        <h3 className="text-lg font-bold mb-4 text-gray-800 border-b pb-2">بيانات العميل</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">الاسم الكامل *</label>
                                <input required type="text" className="input w-full" value={customerInfo.name} onChange={e => setCustomerInfo({ ...customerInfo, name: e.target.value })} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">رقم الهاتف *</label>
                                <input required type="tel" className="input w-full text-left" dir="ltr" value={customerInfo.phone} onChange={e => setCustomerInfo({ ...customerInfo, phone: e.target.value })} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">الولاية *</label>
                                <input required type="text" className="input w-full" value={customerInfo.wilaya} onChange={e => setCustomerInfo({ ...customerInfo, wilaya: e.target.value })} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">العنوان التفصيلي</label>
                                <input type="text" className="input w-full" value={customerInfo.address} onChange={e => setCustomerInfo({ ...customerInfo, address: e.target.value })} />
                            </div>
                        </div>
                    </section>

                    {/* Items Section */}
                    <section>
                        <div className="flex justify-between items-center mb-4 border-b pb-2">
                            <h3 className="text-lg font-bold text-gray-800">المنتجات</h3>
                            <button type="button" onClick={handleAddItem} className="btn btn-secondary flex items-center gap-2 text-sm py-1.5 border-primary text-primary hover:bg-primary/5">
                                <Plus className="w-4 h-4" />
                                إضافة منتج
                            </button>
                        </div>

                        <div className="space-y-4">
                            {items.length === 0 ? (
                                <div className="text-center py-8 bg-gray-50 rounded-lg border border-dashed border-gray-300 text-gray-500">
                                    لا توجد منتجات مضافة بعد
                                </div>
                            ) : items.map((item, index) => (
                                <div key={index} className="flex gap-4 items-start p-4 bg-gray-50 rounded-lg border border-gray-100">
                                    <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-4">
                                        <div className="md:col-span-2">
                                            <label className="block text-xs text-gray-500 mb-1">المنتج</label>
                                            <select required className="input w-full py-2 text-sm" value={item.productId} onChange={e => handleItemChange(index, 'productId', e.target.value)}>
                                                <option value="">-- اختر المنتج --</option>
                                                {products.map(p => <option key={p.id} value={p.id}>{p.name_ar || p.name}</option>)}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-xs text-gray-500 mb-1">الكمية</label>
                                            <input required type="number" min="1" className="input w-full py-2 text-sm" value={item.quantity} onChange={e => handleItemChange(index, 'quantity', parseInt(e.target.value))} />
                                        </div>
                                        <div>
                                            <label className="block text-xs text-gray-500 mb-1">السعر الفردي (د.ج)</label>
                                            <input required type="number" min="0" className="input w-full py-2 text-sm" value={item.price} onChange={e => handleItemChange(index, 'price', parseFloat(e.target.value))} />
                                        </div>
                                        <div className="md:col-span-4">
                                            <label className="block text-xs text-gray-500 mb-1">تفاصيل / مقاس / لون</label>
                                            <input type="text" className="input w-full py-2 text-sm" placeholder="مثال: مقاس 40x30، طباعة لونين..." value={item.customizationStr} onChange={e => handleItemChange(index, 'customizationStr', e.target.value)} />
                                        </div>
                                    </div>
                                    <button type="button" onClick={() => handleRemoveItem(index)} className="mt-6 p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                                        <Trash2 className="w-5 h-5" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </section>

                    {/* Logistics Section */}
                    <section>
                        <h3 className="text-lg font-bold mb-4 text-gray-800 border-b pb-2">التوصيل والدفع</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">شركة التوصيل</label>
                                <select className="input w-full" value={orderOptions.courierName} onChange={e => setOrderOptions({ ...orderOptions, courierName: e.target.value })}>
                                    {shippingRules.map(rule => (
                                        <option key={rule.id} value={rule.courier_name}>{rule.courier_name}</option>
                                    ))}
                                    <option value="office_pickup">استلام من المكتب (Office Pickup)</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">طريقة الدفع</label>
                                <select className="input w-full" value={orderOptions.paymentMethod} onChange={e => setOrderOptions({ ...orderOptions, paymentMethod: e.target.value })}>
                                    <option value="cash_on_delivery">الدفع عند الاستلام (COD)</option>
                                    <option value="ccp">بريد الجزائر (CCP/BaridiMob)</option>
                                    <option value="bank_transfer">تحويل بنكي</option>
                                    <option value="cash_in_advance">دفع مسبق نقداً</option>
                                </select>
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-1">ملاحظات الطلب (إختياري)</label>
                                <textarea className="input w-full resize-none" rows={2} value={orderOptions.notes} onChange={e => setOrderOptions({ ...orderOptions, notes: e.target.value })}></textarea>
                            </div>
                        </div>
                    </section>

                </form>

                <div className="p-6 border-t bg-gray-50 flex justify-end gap-3 flex-shrink-0 rounded-b-2xl">
                    <button type="button" onClick={onClose} className="btn btn-secondary">إلغاء</button>
                    <button onClick={handleSubmit} disabled={loading} className="btn btn-primary min-w-[120px]">
                        {loading ? 'جاري الإنشاء...' : 'تأكيد الطلب'}
                    </button>
                </div>
            </div>
        </div>
    );
}
