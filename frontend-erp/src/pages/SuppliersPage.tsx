import { useState, useEffect } from 'react';
import { Users2, Plus, Edit2, Trash2, Mail, Phone, MapPin } from 'lucide-react';
import { api } from '../services/api';
import toast from 'react-hot-toast';

export default function SuppliersPage() {
    const [suppliers, setSuppliers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingSupplier, setEditingSupplier] = useState<any | null>(null);

    const [formData, setFormData] = useState({
        name: '',
        contact_person: '',
        phone: '',
        email: '',
        address: '',
        notes: ''
    });

    useEffect(() => {
        fetchSuppliers();
    }, []);

    const fetchSuppliers = async () => {
        setLoading(true);
        try {
            const res = await api.suppliers.list();
            if (res.success) {
                setSuppliers(res.data || []);
            }
        } catch (error) {
            console.error('Failed to fetch suppliers:', error);
            toast.error('فشل في جلب الموردين');
        } finally {
            setLoading(false);
        }
    };

    const openModal = (supplier: any = null) => {
        if (supplier) {
            setEditingSupplier(supplier);
            setFormData({
                name: supplier.name || '',
                contact_person: supplier.contact_person || '',
                phone: supplier.phone || '',
                email: supplier.email || '',
                address: supplier.address || '',
                notes: supplier.notes || ''
            });
        } else {
            setEditingSupplier(null);
            setFormData({
                name: '',
                contact_person: '',
                phone: '',
                email: '',
                address: '',
                notes: ''
            });
        }
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setEditingSupplier(null);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editingSupplier) {
                await api.suppliers.update(editingSupplier.id, formData);
                toast.success('تم التحديث بنجاح');
            } else {
                await api.suppliers.create(formData);
                toast.success('تم إضافة المورد بنجاح');
            }
            fetchSuppliers();
            closeModal();
        } catch (err) {
            console.error('Save failed', err);
            toast.error('حدث خطأ أثناء الحفظ');
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('هل أنت متأكد من حذف هذا المورد؟')) return;
        try {
            await api.suppliers.delete(id);
            toast.success('تم الحذف بنجاح');
            fetchSuppliers();
        } catch (err) {
            console.error('Delete failed', err);
            toast.error('حدث خطأ أثناء الحذف');
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold flex items-center gap-2">
                    <Users2 className="w-6 h-6 text-primary" />
                    إدارة الموردين
                </h1>
                <button
                    onClick={() => openModal()}
                    className="btn btn-primary flex items-center gap-2"
                >
                    <Plus className="w-5 h-5" />
                    إضافة مورد جديد
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {loading ? (
                    <p className="text-gray-500 col-span-full">جاري التحميل...</p>
                ) : suppliers.length === 0 ? (
                    <div className="card p-8 text-center text-gray-500 col-span-full">
                        لا يوجد موردين مسجلين. قم بإضافة المورد الأول.
                    </div>
                ) : suppliers.map(supplier => (
                    <div key={supplier.id} className="card p-6 flex flex-col justify-between">
                        <div>
                            <div className="flex justify-between items-start mb-4">
                                <h3 className="font-bold text-lg text-gray-900">{supplier.name}</h3>
                                <div className="flex gap-2">
                                    <button onClick={() => openModal(supplier)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg" title="تعديل">
                                        <Edit2 className="w-4 h-4" />
                                    </button>
                                    <button onClick={() => handleDelete(supplier.id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg" title="حذف">
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-2 mt-4">
                                {supplier.contact_person && (
                                    <p className="text-sm text-gray-600 flex items-center gap-2">
                                        <Users2 className="w-4 h-4 text-gray-400" />
                                        {supplier.contact_person}
                                    </p>
                                )}
                                {supplier.phone && (
                                    <p className="text-sm text-gray-600 flex items-center gap-2">
                                        <Phone className="w-4 h-4 text-gray-400" />
                                        <span dir="ltr">{supplier.phone}</span>
                                    </p>
                                )}
                                {supplier.email && (
                                    <p className="text-sm text-gray-600 flex items-center gap-2">
                                        <Mail className="w-4 h-4 text-gray-400" />
                                        {supplier.email}
                                    </p>
                                )}
                                {supplier.address && (
                                    <p className="text-sm text-gray-600 flex items-center gap-2">
                                        <MapPin className="w-4 h-4 text-gray-400" />
                                        {supplier.address}
                                    </p>
                                )}
                            </div>
                        </div>
                        {supplier.notes && (
                            <div className="mt-4 pt-4 border-t text-sm text-gray-500">
                                {supplier.notes}
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-lg overflow-hidden max-h-[90vh] flex flex-col">
                        <div className="p-6 border-b flex-shrink-0">
                            <h2 className="text-xl font-bold">
                                {editingSupplier ? 'تعديل بيانات المورد' : 'إضافة مورد جديد'}
                            </h2>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    اسم المورد أو الشركة *
                                </label>
                                <input
                                    type="text"
                                    required
                                    className="input w-full"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    الشخص المسؤول (جهة الاتصال)
                                </label>
                                <input
                                    type="text"
                                    className="input w-full"
                                    value={formData.contact_person}
                                    onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        رقم الهاتف
                                    </label>
                                    <input
                                        type="text"
                                        dir="ltr"
                                        className="input w-full text-left"
                                        value={formData.phone}
                                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        البريد الإلكتروني
                                    </label>
                                    <input
                                        type="email"
                                        dir="ltr"
                                        className="input w-full text-left"
                                        value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    العنوان
                                </label>
                                <textarea
                                    className="input w-full resize-none"
                                    rows={2}
                                    value={formData.address}
                                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    ملاحظات إضافية
                                </label>
                                <textarea
                                    className="input w-full resize-none"
                                    rows={3}
                                    value={formData.notes}
                                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                />
                            </div>

                            <div className="flex justify-end gap-3 pt-4 border-t mt-6">
                                <button type="button" onClick={closeModal} className="btn btn-secondary">
                                    إلغاء
                                </button>
                                <button type="submit" className="btn btn-primary">
                                    حفظ البيانات
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
