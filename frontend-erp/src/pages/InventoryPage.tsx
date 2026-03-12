import { useState, useEffect } from 'react';
import { Plus, Package, Droplets, PenTool, LayoutTemplate, AlertCircle, TrendingUp } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../services/api';
import InventoryMovements from '../components/inventory/InventoryMovements';
import StockAdjustmentModal from '../components/inventory/StockAdjustmentModal';

export default function InventoryPage() {
    const [activeTab, setActiveTab] = useState<'all' | 'blank' | 'ink' | 'chemical' | 'screen_mesh' | 'packaging' | 'movements'>('all');
    const [items, setItems] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Feature: Stock Adjustment
    const [isAdjustmentModalOpen, setIsAdjustmentModalOpen] = useState(false);
    const [selectedAdjustmentItem, setSelectedAdjustmentItem] = useState<any>(null);

    const [formData, setFormData] = useState({
        sku: '',
        name: '',
        type: 'blank',
        stock_quantity: '',
        low_stock_threshold: '',
        unit_of_measure: 'pcs',
        cost_per_unit: ''
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setIsSubmitting(true);
            const response = await api.inventory.create({
                ...formData,
                stock_quantity: Number(formData.stock_quantity),
                low_stock_threshold: Number(formData.low_stock_threshold),
                cost_per_unit: Number(formData.cost_per_unit)
            });
            if (response.success) {
                toast.success('تمت إضافة المادة بنجاح');
                setIsAddModalOpen(false);
                setFormData({ sku: '', name: '', type: 'blank', stock_quantity: '', low_stock_threshold: '', unit_of_measure: 'pcs', cost_per_unit: '' });
                fetchItems();
            }
        } catch (error) {
            toast.error('حدث خطأ أثناء إضافة المادة');
        } finally {
            setIsSubmitting(false);
        }
    };

    const fetchItems = async () => {
        try {
            setLoading(true);
            const { data, success } = await api.inventory.list(activeTab === 'all' ? undefined : activeTab);
            if (success) setItems(data || []);
        } catch (error) {
            toast.error('Failed to load inventory');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchItems();
    }, [activeTab]);

    const getIcon = (type: string) => {
        switch (type) {
            case 'blank': return <Package className="w-5 h-5 text-blue-500" />;
            case 'ink': return <Droplets className="w-5 h-5 text-purple-500" />;
            case 'chemical': return <AlertCircle className="w-5 h-5 text-orange-500" />;
            case 'screen_mesh': return <LayoutTemplate className="w-5 h-5 text-indigo-500" />;
            default: return <PenTool className="w-5 h-5 text-gray-500" />;
        }
    };

    const getTypeLabel = (type: string) => {
        switch (type) {
            case 'blank': return 'أقمشة (Blanks)';
            case 'ink': return 'حبر (Ink)';
            case 'chemical': return 'مواد كيميائية';
            case 'screen_mesh': return 'إطارات حريرية';
            case 'packaging': return 'مواد تغليف';
            default: return 'أخرى';
        }
    };

    return (
        <div className="p-8 max-w-7xl mx-auto">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">إدارة المخزون (Inventory)</h1>
                    <p className="text-gray-500">تتبع المواد الأولية، الحبر، والإطارات</p>
                </div>
                <button
                    onClick={() => setIsAddModalOpen(true)}
                    className="btn-primary flex items-center gap-2"
                >
                    <Plus className="w-4 h-4" />
                    إضافة مادة جديدة
                </button>
            </div>

            <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
                {(['all', 'blank', 'ink', 'chemical', 'screen_mesh', 'packaging', 'movements'] as const).map((tab) => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`px-4 py-2 rounded-lg whitespace-nowrap transition-colors flex items-center gap-2 ${activeTab === tab
                            ? 'bg-primary text-white font-medium'
                            : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
                            }`}
                    >
                        {tab === 'movements' && <TrendingUp className="w-4 h-4" />}
                        {tab === 'all' ? 'الكل' : tab === 'movements' ? 'سجل الحركات' : getTypeLabel(tab)}
                    </button>
                ))}
            </div>

            {activeTab === 'movements' ? (
                <InventoryMovements />
            ) : (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    {loading ? (
                        <div className="p-8 text-center text-gray-500">جاري التحميل...</div>
                    ) : items.length === 0 ? (
                        <div className="p-12 text-center text-gray-500">لا توجد مواد في المخزون لهذه الفئة.</div>
                    ) : (
                        <table className="w-full text-right bg-white overflow-hidden rounded-xl border-collapse">
                            <thead className="bg-gray-50 border-b border-gray-100">
                                <tr>
                                    <th className="p-4 font-semibold text-gray-600">الرمز (SKU)</th>
                                    <th className="p-4 font-semibold text-gray-600">الاسم</th>
                                    <th className="p-4 font-semibold text-gray-600">النوع</th>
                                    <th className="p-4 font-semibold text-gray-600">الكمية المتوفرة</th>
                                    <th className="p-4 font-semibold text-gray-600">التكلفة للوحدة</th>
                                    <th className="p-4 font-semibold text-gray-600">تنبيه المخزون المنخفض</th>
                                    <th className="p-4 font-semibold text-gray-600">الإجراءات</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {items.map((item) => {
                                    const isLowStock = Number(item.stock_quantity) <= Number(item.low_stock_threshold);
                                    return (
                                        <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                                            <td className="p-4 text-sm font-medium text-gray-600" dir="ltr">{item.sku}</td>
                                            <td className="p-4 font-bold text-gray-900">{item.name}</td>
                                            <td className="p-4">
                                                <div className="flex items-center gap-2">
                                                    {getIcon(item.type)}
                                                    <span className="text-sm font-medium">{getTypeLabel(item.type)}</span>
                                                </div>
                                            </td>
                                            <td className="p-4">
                                                <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-bold ${isLowStock ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'
                                                    }`}>
                                                    {item.stock_quantity} {item.unit_of_measure}
                                                    {isLowStock && <AlertCircle className="w-4 h-4 ml-1" />}
                                                </div>
                                            </td>
                                            <td className="p-4 text-gray-600" dir="ltr">{item.cost_per_unit} DZD</td>
                                            <td className="p-4 text-gray-600">{item.low_stock_threshold} {item.unit_of_measure}</td>
                                            <td className="p-4 space-x-2 space-x-reverse flex items-center">
                                                <button
                                                    onClick={() => {
                                                        setSelectedAdjustmentItem(item);
                                                        setIsAdjustmentModalOpen(true);
                                                    }}
                                                    className="text-orange-600 bg-orange-50 hover:bg-orange-100 px-3 py-1.5 rounded-lg font-medium text-sm transition-colors border border-orange-200 mr-2"
                                                >
                                                    تسوية المخزون
                                                </button>
                                                <button className="text-primary hover:text-primary-dark font-medium text-sm">تعديل</button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    )}
                </div>
            )}

            {/* Add Inventory Modal */}
            {isAddModalOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-xl max-h-[90vh] overflow-y-auto">
                        <h2 className="text-xl font-bold mb-4">إضافة مادة جديدة للمخزون</h2>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="col-span-2">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">الاسم</label>
                                    <input type="text" required className="input w-full" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">الرمز (SKU)</label>
                                    <input type="text" required className="input w-full text-left" dir="ltr" value={formData.sku} onChange={(e) => setFormData({ ...formData, sku: e.target.value })} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">النوع</label>
                                    <select required className="input w-full bg-white" value={formData.type} onChange={(e) => setFormData({ ...formData, type: e.target.value })}>
                                        <option value="blank">أقمشة (Blanks)</option>
                                        <option value="ink">حبر (Ink)</option>
                                        <option value="chemical">مواد كيميائية</option>
                                        <option value="screen_mesh">إطارات حريرية</option>
                                        <option value="packaging">مواد تغليف</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">الكمية الابتدائية</label>
                                    <input type="number" required min="0" className="input w-full" value={formData.stock_quantity} onChange={(e) => setFormData({ ...formData, stock_quantity: e.target.value })} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">تنبيه النقص عند</label>
                                    <input type="number" required min="0" className="input w-full" value={formData.low_stock_threshold} onChange={(e) => setFormData({ ...formData, low_stock_threshold: e.target.value })} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">وحدة القياس</label>
                                    <input type="text" required className="input w-full" placeholder="قطعة, غرام, لتر..." value={formData.unit_of_measure} onChange={(e) => setFormData({ ...formData, unit_of_measure: e.target.value })} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">التكلفة للوحدة (دج)</label>
                                    <input type="number" required min="0" step="0.01" className="input w-full" value={formData.cost_per_unit} onChange={(e) => setFormData({ ...formData, cost_per_unit: e.target.value })} />
                                </div>
                            </div>
                            <div className="flex gap-3 justify-end mt-6">
                                <button type="button" onClick={() => setIsAddModalOpen(false)} className="btn btn-secondary">إلغاء</button>
                                <button type="submit" disabled={isSubmitting} className="btn btn-primary">{isSubmitting ? 'جاري الإضافة...' : 'حفظ'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {isAdjustmentModalOpen && selectedAdjustmentItem && (
                <StockAdjustmentModal
                    isOpen={isAdjustmentModalOpen}
                    onClose={() => {
                        setIsAdjustmentModalOpen(false);
                        setSelectedAdjustmentItem(null);
                    }}
                    item={selectedAdjustmentItem}
                    onSuccess={fetchItems}
                />
            )}
        </div>
    );
}
