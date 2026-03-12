import { useState, useEffect } from 'react';
import { Plus, Receipt, Search, Filter, TrendingDown } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../services/api';

export default function ExpensesPage() {
    const [expenses, setExpenses] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formData, setFormData] = useState({
        category: '',
        amount: '',
        notes: '',
        date: new Date().toISOString().split('T')[0]
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setIsSubmitting(true);
            const response = await api.expenses.create({
                category: formData.category,
                amount: Number(formData.amount),
                notes: formData.notes,
                date: formData.date
            });
            if (response.success) {
                toast.success('تمت إضافة المصروف بنجاح');
                setIsAddModalOpen(false);
                setFormData({ category: '', amount: '', notes: '', date: new Date().toISOString().split('T')[0] });
                fetchExpenses();
            }
        } catch (error) {
            toast.error('حدث خطأ أثناء إضافة المصروف');
        } finally {
            setIsSubmitting(false);
        }
    };

    const fetchExpenses = async () => {
        try {
            setLoading(true);
            const response = await api.expenses.list();
            if (response.success) setExpenses(response.data || []);
        } catch (error) {
            toast.error('Failed to load expenses');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchExpenses();
    }, []);

    const totalExpenses = expenses.reduce((sum, exp) => sum + Number(exp.amount), 0);

    const filteredExpenses = expenses.filter(exp =>
        exp.category.toLowerCase().includes(search.toLowerCase()) ||
        (exp.notes && exp.notes.toLowerCase().includes(search.toLowerCase()))
    );

    return (
        <div className="p-8 max-w-7xl mx-auto">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">المصروفات (Expenses)</h1>
                    <p className="text-gray-500">تتبع الإيجار، الرواتب، وتكاليف التشغيل</p>
                </div>
                <button
                    onClick={() => setIsAddModalOpen(true)}
                    className="btn-primary flex items-center gap-2"
                >
                    <Plus className="w-4 h-4" />
                    إضافة مصروف جديد
                </button>
            </div>

            {/* Summary Card */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-red-100 flex items-center justify-between">
                    <div>
                        <p className="text-gray-500 text-sm font-medium mb-1">إجمالي المصروفات (هذا الشهر)</p>
                        <p className="text-2xl font-bold text-red-600">{totalExpenses.toLocaleString()} دج</p>
                    </div>
                    <div className="w-12 h-12 bg-red-50 rounded-xl flex items-center justify-center text-red-500">
                        <TrendingDown className="w-6 h-6" />
                    </div>
                </div>
            </div>

            <div className="card">
                <div className="p-4 border-b flex flex-wrap gap-4">
                    <div className="relative max-w-md flex-1">
                        <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                            type="text"
                            placeholder="بحث في المصروفات..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="input pr-12"
                        />
                    </div>
                    <button className="btn btn-secondary flex items-center gap-2">
                        <Filter className="w-4 h-4" />
                        تصفية
                    </button>
                </div>

                <div className="overflow-x-auto">
                    {loading ? (
                        <div className="p-12 text-center text-gray-500">جاري التحميل...</div>
                    ) : filteredExpenses.length === 0 ? (
                        <div className="p-12 text-center text-gray-500">لا توجد مصروفات مسجلة</div>
                    ) : (
                        <table className="w-full text-right bg-white overflow-hidden border-collapse">
                            <thead className="bg-gray-50 border-b border-gray-100">
                                <tr>
                                    <th className="p-4 font-semibold text-gray-600">التاريخ</th>
                                    <th className="p-4 font-semibold text-gray-600">التصنيف</th>
                                    <th className="p-4 font-semibold text-gray-600">المبلغ</th>
                                    <th className="p-4 font-semibold text-gray-600">ملاحظات</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {filteredExpenses.map((exp) => (
                                    <tr key={exp.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="p-4 text-gray-600">{new Date(exp.date).toLocaleDateString('ar-DZ')}</td>
                                        <td className="p-4 font-medium text-gray-900">
                                            <div className="flex items-center gap-2">
                                                <Receipt className="w-4 h-4 text-gray-400" />
                                                {exp.category}
                                            </div>
                                        </td>
                                        <td className="p-4 font-bold text-red-600">{Number(exp.amount).toLocaleString()} دج</td>
                                        <td className="p-4 text-gray-500 text-sm max-w-xs truncate">{exp.notes || '—'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>

            {/* Add Expense Modal */}
            {isAddModalOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl">
                        <h2 className="text-xl font-bold mb-4">إضافة مصروف جديد</h2>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">التصنيف</label>
                                <input
                                    type="text"
                                    required
                                    className="input w-full"
                                    value={formData.category}
                                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">المبلغ (دج)</label>
                                <input
                                    type="number"
                                    required
                                    min="0"
                                    step="0.01"
                                    className="input w-full text-left"
                                    dir="ltr"
                                    value={formData.amount}
                                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">التاريخ</label>
                                <input
                                    type="date"
                                    required
                                    className="input w-full"
                                    value={formData.date}
                                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">ملاحظات (اختياري)</label>
                                <textarea
                                    className="input w-full h-24 resize-none"
                                    value={formData.notes}
                                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                ></textarea>
                            </div>
                            <div className="flex gap-3 justify-end mt-6">
                                <button
                                    type="button"
                                    onClick={() => setIsAddModalOpen(false)}
                                    className="btn btn-secondary"
                                >
                                    إلغاء
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="btn btn-primary"
                                >
                                    {isSubmitting ? 'جاري الإضافة...' : 'حفظ'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
