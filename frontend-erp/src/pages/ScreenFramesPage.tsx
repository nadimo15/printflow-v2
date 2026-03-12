import { useState, useEffect } from 'react';
import { Layers, Plus, Edit2, Trash2, CheckCircle, XCircle } from 'lucide-react';
import { api } from '../services/api';
import toast from 'react-hot-toast';

export default function ScreenFramesPage() {
    const [frames, setFrames] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingFrame, setEditingFrame] = useState<any | null>(null);

    const [formData, setFormData] = useState({
        name: '',
        mesh_count: '',
        size: '',
        status: 'active',
        notes: ''
    });

    useEffect(() => {
        fetchFrames();
    }, []);

    const fetchFrames = async () => {
        setLoading(true);
        try {
            const res = await api.screenFrames.list();
            if (res.success) setFrames(res.data || []);
        } catch (error) {
            console.error('Failed to fetch frames:', error);
            toast.error('فشل في جلب الإطارات');
        } finally {
            setLoading(false);
        }
    };

    const openModal = (frame: any = null) => {
        if (frame) {
            setEditingFrame(frame);
            setFormData({
                name: frame.name || '',
                mesh_count: frame.mesh_count || '',
                size: frame.size || '',
                status: frame.status || 'active',
                notes: frame.notes || ''
            });
        } else {
            setEditingFrame(null);
            setFormData({
                name: '',
                mesh_count: '',
                size: '',
                status: 'active',
                notes: ''
            });
        }
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setEditingFrame(null);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editingFrame) {
                await api.screenFrames.update(editingFrame.id, formData);
                toast.success('تم التحديث بنجاح');
            } else {
                await api.screenFrames.create(formData);
                toast.success('تم إضافة الإطار بنجاح');
            }
            fetchFrames();
            closeModal();
        } catch (err) {
            console.error('Save failed', err);
            toast.error('حدث خطأ أثناء الحفظ');
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('هل أنت متأكد من حذف هذا الإطار؟')) return;
        try {
            await api.screenFrames.delete(id);
            toast.success('تم الحذف بنجاح');
            fetchFrames();
        } catch (err) {
            console.error('Delete failed', err);
            toast.error('حدث خطأ أثناء الحذف');
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'active':
                return <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium flex items-center gap-1 w-max"><CheckCircle className="w-3 h-3" /> متاح (نشط)</span>;
            case 'in_use':
                return <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium flex items-center gap-1 w-max"><Layers className="w-3 h-3" /> قيد الاستخدام</span>;
            case 'damaged':
                return <span className="px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs font-medium flex items-center gap-1 w-max"><XCircle className="w-3 h-3" /> تالف</span>;
            default:
                return <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-medium flex items-center gap-1 w-max">{status}</span>;
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold flex items-center gap-2">
                    <Layers className="w-6 h-6 text-primary" />
                    إدارة إطارات الشاشة (Screens)
                </h1>
                <button
                    onClick={() => openModal()}
                    className="btn btn-primary flex items-center gap-2"
                >
                    <Plus className="w-5 h-5" />
                    إضافة إطار جديد
                </button>
            </div>

            <div className="card overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-right">
                        <thead className="bg-gray-50 border-b">
                            <tr>
                                <th className="p-4 text-gray-600 font-medium">الاسم / الرمز</th>
                                <th className="p-4 text-gray-600 font-medium">عدد الخيوط (Mesh)</th>
                                <th className="p-4 text-gray-600 font-medium">المقاس</th>
                                <th className="p-4 text-gray-600 font-medium">الحالة</th>
                                <th className="p-4 text-gray-600 font-medium">ملاحظات</th>
                                <th className="p-4 text-gray-600 font-medium">إجراءات</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={6} className="p-8 text-center text-gray-500">جاري التحميل...</td>
                                </tr>
                            ) : frames.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="p-8 text-center text-gray-500">لا توجد إطارات مسجلة لحريريات السحب.</td>
                                </tr>
                            ) : frames.map(frame => (
                                <tr key={frame.id} className="border-b last:border-0 hover:bg-gray-50">
                                    <td className="p-4 font-bold">{frame.name}</td>
                                    <td className="p-4 text-gray-600">{frame.mesh_count || '-'}</td>
                                    <td className="p-4 text-gray-600" dir="ltr">{frame.size || '-'}</td>
                                    <td className="p-4">
                                        {getStatusBadge(frame.status)}
                                    </td>
                                    <td className="p-4 text-gray-500 text-sm max-w-[200px] truncate" title={frame.notes}>
                                        {frame.notes || '-'}
                                    </td>
                                    <td className="p-4 flex items-center gap-3">
                                        <button
                                            onClick={() => openModal(frame)}
                                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                            title="تعديل"
                                        >
                                            <Edit2 className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(frame.id)}
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
                    <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden flex flex-col">
                        <div className="p-6 border-b flex-shrink-0">
                            <h2 className="text-xl font-bold">
                                {editingFrame ? 'تعديل الإطار' : 'إضافة إطار جديد'}
                            </h2>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    الاسم / الرمز المرجعي *
                                </label>
                                <input
                                    type="text"
                                    required
                                    className="input w-full"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    placeholder="مثال: Frame-A1, Screen #105"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        عدد الخيوط (Mesh)
                                    </label>
                                    <input
                                        type="text"
                                        className="input w-full"
                                        value={formData.mesh_count}
                                        onChange={(e) => setFormData({ ...formData, mesh_count: e.target.value })}
                                        placeholder="مثال: 120T, 90T"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        المقاس (سم)
                                    </label>
                                    <input
                                        type="text"
                                        className="input w-full text-left"
                                        dir="ltr"
                                        value={formData.size}
                                        onChange={(e) => setFormData({ ...formData, size: e.target.value })}
                                        placeholder="40x50"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    الحالة التشغيلية
                                </label>
                                <select
                                    className="input w-full"
                                    value={formData.status}
                                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                                >
                                    <option value="active">متاح (نشط)</option>
                                    <option value="in_use">قيد الاستخدام (ينتظر غسيل)</option>
                                    <option value="damaged">تالف (يحتاج شد حرير)</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    ملاحظات التصميم الممسوح / أخرى
                                </label>
                                <textarea
                                    className="input w-full resize-none"
                                    rows={3}
                                    value={formData.notes}
                                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                    placeholder="طباعة وجه واحد، حبر مخفف..."
                                />
                            </div>

                            <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
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
