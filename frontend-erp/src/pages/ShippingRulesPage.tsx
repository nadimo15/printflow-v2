import { useState, useEffect } from 'react';
import { Truck, Plus, Edit2, Trash2, CheckCircle, XCircle } from 'lucide-react';
import { api } from '../services/api';

export default function ShippingRulesPage() {
    const [rules, setRules] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingRule, setEditingRule] = useState<any | null>(null);

    const [formData, setFormData] = useState({
        wilaya_name: '',
        base_fee: 0,
        is_active: true
    });

    useEffect(() => {
        fetchRules();
    }, []);

    const fetchRules = async () => {
        setLoading(true);
        try {
            const res = await api.shippingRules.list();
            if (res.success) {
                setRules(res.data || []);
            }
        } catch (error) {
            console.error('Failed to fetch shipping rules:', error);
        } finally {
            setLoading(false);
        }
    };

    const openModal = (rule: any = null) => {
        if (rule) {
            setEditingRule(rule);
            setFormData({
                wilaya_name: rule.wilaya_name,
                base_fee: rule.base_fee,
                is_active: rule.is_active
            });
        } else {
            setEditingRule(null);
            setFormData({
                wilaya_name: '',
                base_fee: 0,
                is_active: true
            });
        }
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setEditingRule(null);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editingRule) {
                await api.shippingRules.update(editingRule.id, formData);
            } else {
                await api.shippingRules.create(formData);
            }
            fetchRules();
            closeModal();
        } catch (err) {
            console.error('Save failed', err);
            alert('حدث خطأ أثناء الحفظ');
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('هل أنت متأكد من حذف هذه التسعيرة؟')) return;
        try {
            await api.shippingRules.delete(id);
            fetchRules();
        } catch (err) {
            console.error('Delete failed', err);
            alert('حدث خطأ أثناء الحذف');
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold flex items-center gap-2">
                    <Truck className="w-6 h-6 text-primary" />
                    إدارة تسعيرة الشحن
                </h1>
                <button
                    onClick={() => openModal()}
                    className="btn btn-primary flex items-center gap-2"
                >
                    <Plus className="w-5 h-5" />
                    إضافة تسعيرة جديدة
                </button>
            </div>

            <div className="card overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-right">
                        <thead className="bg-gray-50 border-b">
                            <tr>
                                <th className="p-4 text-gray-600 font-medium">الولاية / المنطقة</th>
                                <th className="p-4 text-gray-600 font-medium">تكلفة الشحن الأساسية (د.ج)</th>
                                <th className="p-4 text-gray-600 font-medium">الحالة</th>
                                <th className="p-4 text-gray-600 font-medium">إجراءات</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={4} className="p-8 text-center text-gray-500">جاري التحميل...</td>
                                </tr>
                            ) : rules.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="p-8 text-center text-gray-500">لا توجد تسعيرات مسجلة. قم بإضافة تسعيرة جديدة.</td>
                                </tr>
                            ) : rules.map(rule => (
                                <tr key={rule.id} className="border-b last:border-0 hover:bg-gray-50">
                                    <td className="p-4 font-bold">{rule.wilaya_name}</td>
                                    <td className="p-4">{rule.base_fee} د.ج</td>
                                    <td className="p-4">
                                        {rule.is_active ? (
                                            <span className="flex items-center gap-1 text-green-600 text-sm font-medium">
                                                <CheckCircle className="w-4 h-4" /> نشط
                                            </span>
                                        ) : (
                                            <span className="flex items-center gap-1 text-red-600 text-sm font-medium">
                                                <XCircle className="w-4 h-4" /> غير نشط
                                            </span>
                                        )}
                                    </td>
                                    <td className="p-4 flex items-center gap-3">
                                        <button
                                            onClick={() => openModal(rule)}
                                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                            title="تعديل"
                                        >
                                            <Edit2 className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(rule.id)}
                                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                            title="حذف"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden">
                        <div className="p-6 border-b">
                            <h2 className="text-xl font-bold">
                                {editingRule ? 'تعديل تسعيرة الشحن' : 'إضافة تسعيرة شحن جديدة'}
                            </h2>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    الولاية / المنطقة *
                                </label>
                                <input
                                    type="text"
                                    required
                                    className="input"
                                    value={formData.wilaya_name}
                                    onChange={(e) => setFormData({ ...formData, wilaya_name: e.target.value })}
                                    placeholder="مثال: الجزائر العاصمة، وهران، ..."
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    تكلفة الشحن الأساسية (د.ج) *
                                </label>
                                <input
                                    type="number"
                                    required
                                    min="0"
                                    className="input"
                                    value={formData.base_fee}
                                    onChange={(e) => setFormData({ ...formData, base_fee: Number(e.target.value) })}
                                    placeholder="مثال: 600"
                                />
                            </div>

                            <div className="flex items-center gap-2 mt-4">
                                <input
                                    type="checkbox"
                                    id="isActive"
                                    checked={formData.is_active}
                                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                                    className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
                                />
                                <label htmlFor="isActive" className="text-sm font-medium text-gray-700">
                                    تفعيل هذه التسعيرة
                                </label>
                            </div>

                            <div className="flex justify-end gap-3 mt-8">
                                <button
                                    type="button"
                                    onClick={closeModal}
                                    className="btn btn-secondary"
                                >
                                    إلغاء
                                </button>
                                <button
                                    type="submit"
                                    className="btn btn-primary"
                                >
                                    حفظ
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
