import { useState, useEffect } from 'react';
import { ShoppingCart, Plus, Edit2, Trash2, CheckCircle, Clock, XCircle, FileText, X } from 'lucide-react';
import { api } from '../services/api';
import toast from 'react-hot-toast';
import { useAuthStore } from '../store/authStore';

export default function PurchaseOrdersPage() {
    const { user } = useAuthStore();
    const [purchaseOrders, setPurchaseOrders] = useState<any[]>([]);
    const [suppliers, setSuppliers] = useState<any[]>([]);
    const [inventoryItems, setInventoryItems] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingPo, setEditingPo] = useState<any | null>(null);

    const [formData, setFormData] = useState({
        supplier_id: '',
        po_number: '',
        total_amount: 0,
        expected_delivery_date: '',
        status: 'pending',
        notes: '',
        items: [] as any[] // array of { inventory_item_id, quantity, unit_price, notes }
    });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [poRes, supRes, invRes] = await Promise.all([
                api.purchaseOrders.list(),
                api.suppliers.list(),
                api.inventory.list()
            ]);

            if (poRes.success) setPurchaseOrders(poRes.data || []);
            if (supRes.success) setSuppliers(supRes.data || []);
            if (invRes.success) setInventoryItems((invRes.data || []).filter((i: any) => i.is_active !== false));
        } catch (error) {
            console.error('Failed to fetch data:', error);
            toast.error('فشل في جلب البيانات');
        } finally {
            setLoading(false);
        }
    };

    const generatePONumber = () => {
        return `PO-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;
    };

    const openModal = async (po: any = null) => {
        setLoading(true);
        if (po) {
            setEditingPo(po);
            let items: any[] = [];
            try {
                const itemsRes = await api.purchaseOrders.getItems(po.id);
                if (itemsRes.success) items = itemsRes.data || [];
            } catch (err) { }

            setFormData({
                supplier_id: po.supplier_id || '',
                po_number: po.po_number || generatePONumber(),
                total_amount: po.total_amount || 0,
                expected_delivery_date: po.expected_delivery_date ? new Date(po.expected_delivery_date).toISOString().split('T')[0] : '',
                status: po.status || 'pending',
                notes: po.notes || '',
                items: items.map(i => ({
                    ...i,
                    id: i.id // keep id if editing existing
                }))
            });
        } else {
            setEditingPo(null);
            setFormData({
                supplier_id: '',
                po_number: generatePONumber(),
                total_amount: 0,
                expected_delivery_date: '',
                status: 'pending',
                notes: '',
                items: []
            });
        }
        setLoading(false);
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setEditingPo(null);
    };

    // Auto-calculate sum
    useEffect(() => {
        if (isModalOpen) {
            const newTotal = formData.items.reduce((sum, item) => sum + (Number(item.quantity || 0) * Number(item.unit_price || 0)), 0);
            setFormData(prev => ({ ...prev, total_amount: newTotal }));
        }
    }, [formData.items, isModalOpen]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.supplier_id) {
            toast.error('يرجى اختيار المورد');
            return;
        }

        try {
            const payload = {
                supplier_id: formData.supplier_id,
                po_number: formData.po_number,
                total_amount: formData.total_amount,
                expected_delivery_date: formData.expected_delivery_date ? new Date(formData.expected_delivery_date).toISOString() : null,
                status: formData.status,
                notes: formData.notes
            };

            let poId = '';

            if (editingPo) {
                poId = editingPo.id;
                await api.purchaseOrders.update(poId, payload);
                toast.success('تم تحديث الطلب بنجاح');
            } else {
                const res = await api.purchaseOrders.create(payload);
                if (res.success && res.data) {
                    poId = res.data.id;
                    toast.success('تم إنشاء طلب الشراء بنجاح');
                }
            }

            if (poId) {
                await api.purchaseOrders.saveItems(poId, formData.items);
            }

            fetchData();
            closeModal();
        } catch (err) {
            console.error('Save failed', err);
            toast.error('حدث خطأ أثناء الحفظ. قد يكون رقم الـ PO مكرراً.');
        }
    };

    const handleStatusChange = async (id: string, newStatus: string) => {
        try {
            if (newStatus === 'completed') {
                if (!user?.id) {
                    toast.error('جلسة غير صالحة. لا يمكن استلام الطلبية.');
                    return;
                }
                const confirmRes = window.confirm('تأكيد استلام هذه الطلبية؟ سيتم تحديث رصيد المخزون بناءً على العناصر مباشرة.');
                if (!confirmRes) return;

                await api.purchaseOrders.receive(id, user.id);
                toast.success('تم استلام البضاعة وتحديث المخزون بنجاح!');
            } else {
                await api.purchaseOrders.updateStatus(id, newStatus);
                toast.success('تم تحديث الحالة');
            }
            fetchData();
        } catch (err: any) {
            console.error('Status update failed', err);
            toast.error(err.message || 'فشل في تحديث الحالة');
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'completed':
                return <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium flex items-center gap-1"><CheckCircle className="w-3 h-3" /> مكتمل / مستلم</span>;
            case 'cancelled':
                return <span className="px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs font-medium flex items-center gap-1"><XCircle className="w-3 h-3" /> ملغى</span>;
            case 'pending':
            default:
                return <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs font-medium flex items-center gap-1"><Clock className="w-3 h-3" /> قيد الانتظار</span>;
        }
    };

    const addItemRow = () => {
        setFormData(prev => ({
            ...prev,
            items: [...prev.items, { inventory_item_id: '', quantity: 1, unit_price: 0 }]
        }));
    };

    const removeItemRow = (index: number) => {
        setFormData(prev => {
            const updated = [...prev.items];
            updated.splice(index, 1);
            return { ...prev, items: updated };
        });
    };

    const updateItemRow = (index: number, field: string, value: any) => {
        setFormData(prev => {
            const updated = [...prev.items];
            updated[index] = { ...updated[index], [field]: value };

            // Auto default the unit price if they picked an inventory item
            if (field === 'inventory_item_id' && value) {
                const matchedInv = inventoryItems.find(i => i.id === value);
                if (matchedInv && updated[index].unit_price === 0) {
                    updated[index].unit_price = Number(matchedInv.cost_per_unit || 0);
                }
            }

            return { ...prev, items: updated };
        });
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold flex items-center gap-2">
                    <ShoppingCart className="w-6 h-6 text-primary" />
                    طلبات الشراء (PO)
                </h1>
                <button
                    onClick={() => openModal()}
                    className="btn btn-primary flex items-center gap-2"
                >
                    <Plus className="w-5 h-5" />
                    إنشاء طلب شراء
                </button>
            </div>

            <div className="card overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-right">
                        <thead className="bg-gray-50 border-b">
                            <tr>
                                <th className="p-4 text-gray-600 font-medium whitespace-nowrap">رقم الطلب</th>
                                <th className="p-4 text-gray-600 font-medium">المورد</th>
                                <th className="p-4 text-gray-600 font-medium">تاريخ الطلب</th>
                                <th className="p-4 text-gray-600 font-medium">التسليم المتوقع</th>
                                <th className="p-4 text-gray-600 font-medium">القيمة (د.ج)</th>
                                <th className="p-4 text-gray-600 font-medium">الحالة</th>
                                <th className="p-4 text-gray-600 font-medium whitespace-nowrap">إجراءات</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading && purchaseOrders.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="p-8 text-center text-gray-500">جاري التحميل...</td>
                                </tr>
                            ) : purchaseOrders.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="p-8 text-center text-gray-500">لا توجد طلبات شراء مسجلة. قم بإنشاء طلب شراء جديد.</td>
                                </tr>
                            ) : purchaseOrders.map(po => {
                                const supplier = suppliers.find(s => s.id === po.supplier_id);
                                return (
                                    <tr key={po.id} className="border-b last:border-0 hover:bg-gray-50">
                                        <td className="p-4 font-mono text-sm">
                                            <div className="flex items-center gap-2">
                                                <FileText className="w-4 h-4 text-gray-400" />
                                                {po.po_number || `PO-${po.id.slice(0, 6)}`}
                                            </div>
                                        </td>
                                        <td className="p-4 font-bold">{supplier?.name || 'مورد غير معروف'}</td>
                                        <td className="p-4 text-sm text-gray-600">
                                            {new Date(po.created_at).toLocaleDateString('ar-DZ')}
                                        </td>
                                        <td className="p-4 text-sm text-gray-600">
                                            {po.expected_delivery_date ? new Date(po.expected_delivery_date).toLocaleDateString('ar-DZ') : '-'}
                                        </td>
                                        <td className="p-4 font-bold text-primary">
                                            {po.total_amount ? Number(po.total_amount).toLocaleString() : '0'} د.ج
                                        </td>
                                        <td className="p-4">
                                            {getStatusBadge(po.status)}
                                        </td>
                                        <td className="p-4">
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleStatusChange(po.id, 'completed'); }}
                                                    className={`p-2 rounded-lg transition-colors ${po.status === 'completed' ? 'text-gray-400 cursor-not-allowed' : 'text-green-600 hover:bg-green-50'}`}
                                                    title="تحديد كمكتمل (استلام البضاعة إلى المخزون)"
                                                    disabled={po.status === 'completed'}
                                                >
                                                    <CheckCircle className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleStatusChange(po.id, 'cancelled'); }}
                                                    className={`p-2 rounded-lg transition-colors ${po.status === 'cancelled' ? 'text-gray-400 cursor-not-allowed' : 'text-red-600 hover:bg-red-50'}`}
                                                    title="إلغاء الطلب"
                                                    disabled={po.status === 'cancelled'}
                                                >
                                                    <XCircle className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => openModal(po)}
                                                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                    title={po.status === 'pending' ? "تعديل التفاصيل" : "عرض التفاصيل"}
                                                >
                                                    <Edit2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 z-50 flex flex-col items-center justify-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-4xl overflow-hidden max-h-[95vh] flex flex-col shadow-2xl">
                        <div className="p-6 border-b flex justify-between items-center bg-gray-50">
                            <h2 className="text-xl font-bold flex items-center gap-2">
                                <ShoppingCart className="w-5 h-5 text-primary" />
                                {editingPo ? (editingPo.status === 'completed' ? 'تفاصيل طلب الشراء المستلم' : 'تعديل طلب الشراء') : 'إنشاء طلب شراء جديد'}
                            </h2>
                            <button onClick={closeModal} className="p-2 text-gray-500 hover:bg-gray-200 rounded-full transition"><X className="w-5 h-5" /></button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-6 flex-1">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 bg-gray-50 rounded-xl border border-gray-100">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">رقم الطلب (PO Number) *</label>
                                    <input
                                        required
                                        className="input w-full font-mono bg-white"
                                        value={formData.po_number}
                                        onChange={(e) => setFormData({ ...formData, po_number: e.target.value })}
                                        disabled={formData.status === 'completed' || formData.status === 'cancelled'}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">المورد *</label>
                                    <select
                                        required
                                        className="input w-full bg-white"
                                        value={formData.supplier_id}
                                        onChange={(e) => setFormData({ ...formData, supplier_id: e.target.value })}
                                        disabled={formData.status === 'completed' || formData.status === 'cancelled'}
                                    >
                                        <option value="">-- اختر المورد --</option>
                                        {suppliers.map(s => (
                                            <option key={s.id} value={s.id}>{s.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">تاريخ التسليم المتوقع</label>
                                    <input
                                        type="date"
                                        className="input w-full text-left bg-white"
                                        dir="ltr"
                                        value={formData.expected_delivery_date}
                                        onChange={(e) => setFormData({ ...formData, expected_delivery_date: e.target.value })}
                                        disabled={formData.status === 'completed' || formData.status === 'cancelled'}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">ملاحظات عامة</label>
                                    <input
                                        type="text"
                                        className="input w-full bg-white"
                                        value={formData.notes}
                                        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                        disabled={formData.status === 'completed' || formData.status === 'cancelled'}
                                    />
                                </div>
                            </div>

                            <div className="border rounded-xl flex flex-col overflow-hidden">
                                <div className="bg-gray-100 p-4 border-b flex justify-between items-center">
                                    <h3 className="font-bold border-r-4 border-primary pr-2">العناصر المطلوبة (المخزون)</h3>
                                    {formData.status === 'pending' && (
                                        <button type="button" onClick={addItemRow} className="btn btn-primary btn-sm flex items-center gap-1 text-xs">
                                            <Plus className="w-4 h-4" /> إضافة عنصر
                                        </button>
                                    )}
                                </div>

                                {formData.items.length === 0 ? (
                                    <div className="p-8 text-center text-gray-500">لا توجد عناصر. انقر على الزر أعلاه لإضافة أول عنصر للطلبية.</div>
                                ) : (
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-right">
                                            <thead className="bg-gray-50 border-b">
                                                <tr>
                                                    <th className="p-3 text-sm font-medium text-gray-600">عنصر المخزون</th>
                                                    <th className="p-3 text-sm font-medium text-gray-600 w-32">الكمية</th>
                                                    <th className="p-3 text-sm font-medium text-gray-600 w-32">الوحدة</th>
                                                    <th className="p-3 text-sm font-medium text-gray-600 w-36">سعر الوحدة (د.ج)</th>
                                                    <th className="p-3 text-sm font-medium text-gray-600 w-32">الإجمالي</th>
                                                    {formData.status === 'completed' && <th className="p-3 text-sm font-medium text-green-600 w-32">الكمية المستلمة</th>}
                                                    {formData.status === 'pending' && <th className="p-3 w-16 text-center">حذف</th>}
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {formData.items.map((item, index) => {
                                                    const matchedInv = inventoryItems.find(i => i.id === item.inventory_item_id);
                                                    return (
                                                        <tr key={index} className="border-b last:border-0 hover:bg-gray-50">
                                                            <td className="p-2">
                                                                <select
                                                                    required
                                                                    className="input w-full text-sm py-1 min-w-[200px]"
                                                                    value={item.inventory_item_id}
                                                                    onChange={(e) => updateItemRow(index, 'inventory_item_id', e.target.value)}
                                                                    disabled={formData.status !== 'pending'}
                                                                >
                                                                    <option value="">- اختر العنصر -</option>
                                                                    {inventoryItems.map(inv => (
                                                                        <option key={inv.id} value={inv.id}>{inv.name} ({inv.sku || 'N/A'})</option>
                                                                    ))}
                                                                </select>
                                                            </td>
                                                            <td className="p-2">
                                                                <input
                                                                    type="number" required min="1" step="0.01"
                                                                    className="input w-full text-sm py-1"
                                                                    value={item.quantity}
                                                                    onChange={(e) => updateItemRow(index, 'quantity', e.target.value)}
                                                                    disabled={formData.status !== 'pending'}
                                                                />
                                                            </td>
                                                            <td className="p-2 text-sm text-gray-500 font-mono">
                                                                {matchedInv?.unit_of_measure || '-'}
                                                            </td>
                                                            <td className="p-2">
                                                                <input
                                                                    type="number" required min="0" step="0.01"
                                                                    className="input w-full text-sm py-1"
                                                                    value={item.unit_price}
                                                                    onChange={(e) => updateItemRow(index, 'unit_price', e.target.value)}
                                                                    disabled={formData.status !== 'pending'}
                                                                />
                                                            </td>
                                                            <td className="p-2 font-bold text-gray-700 text-sm">
                                                                {((Number(item.quantity) || 0) * (Number(item.unit_price) || 0)).toLocaleString()}
                                                            </td>
                                                            {formData.status === 'completed' && (
                                                                <td className="p-2 font-bold text-green-600 text-sm">
                                                                    {item.received_quantity || item.quantity}
                                                                </td>
                                                            )}
                                                            {formData.status === 'pending' && (
                                                                <td className="p-2 text-center">
                                                                    <button type="button" onClick={() => removeItemRow(index)} className="p-1.5 text-red-500 hover:bg-red-50 rounded" title="حذف">
                                                                        <Trash2 className="w-4 h-4" />
                                                                    </button>
                                                                </td>
                                                            )}
                                                        </tr>
                                                    )
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>

                            <div className="flex justify-between items-center bg-gray-50 p-6 rounded-xl border border-gray-100">
                                <span className="text-gray-600">إجمالي طلب الشراء:</span>
                                <span className="text-2xl font-bold text-primary">{formData.total_amount.toLocaleString()} د.ج</span>
                            </div>

                        </form>

                        <div className="p-6 border-t bg-gray-50 flex justify-end gap-3 flex-shrink-0">
                            <button type="button" onClick={closeModal} className="btn btn-secondary px-6">
                                إغلاق
                            </button>
                            {formData.status === 'pending' && (
                                <button type="button" onClick={handleSubmit} className="btn btn-primary px-8">
                                    حفظ طلب الشراء
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
