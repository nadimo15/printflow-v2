import { useState, useEffect } from 'react';
import { Settings, Wrench, Settings2, Plus, Search } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../services/api';

export default function WorkstationsPage() {
    const [activeTab, setActiveTab] = useState<'machines' | 'screens'>('machines');
    const [machines, setMachines] = useState<any[]>([]);
    const [screens, setScreens] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        type: '',
        sku: '',
        current_tension_newtons: '20',
        total_impressions: '0'
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setIsSubmitting(true);
            if (activeTab === 'machines') {
                const response = await api.workstations.create({
                    name: formData.name,
                    type: formData.type || 'Screen Print Press',
                    status: 'active',
                    last_maintenance_date: new Date().toISOString()
                });
                if (response.success) {
                    toast.success('تمت إضافة الآلة بنجاح');
                    setIsAddModalOpen(false);
                    setFormData({ name: '', type: '', sku: '', current_tension_newtons: '20', total_impressions: '0' });
                    fetchData();
                }
            } else {
                const response = await api.inventory.create({
                    name: formData.name,
                    type: 'screen_mesh',
                    sku: formData.sku,
                    cost_per_unit: 0,
                    stock_quantity: 1,
                    low_stock_threshold: 0,
                    unit_of_measure: 'pcs',
                    current_tension_newtons: Number(formData.current_tension_newtons),
                    total_impressions: Number(formData.total_impressions)
                });
                if (response.success) {
                    toast.success('تمت إضافة الشاشة بنجاح');
                    setIsAddModalOpen(false);
                    setFormData({ name: '', type: '', sku: '', current_tension_newtons: '20', total_impressions: '0' });
                    fetchData();
                }
            }
        } catch (error) {
            toast.error('حدث خطأ أثناء الإضافة');
        } finally {
            setIsSubmitting(false);
        }
    };

    const fetchData = async () => {
        try {
            setLoading(true);
            if (activeTab === 'machines') {
                const res = await api.workstations.list();
                if (res.success) setMachines(res.data || []);
            } else {
                const res = await api.inventory.list('screen_mesh');
                if (res.success) setScreens(res.data || []);
            }
        } catch (error) {
            toast.error('فشل في تحميل البيانات');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [activeTab]);

    const handleMaintenance = async (id: string, type: 'machine' | 'screen') => {
        // Mock maintenance flow for prototype
        toast.success('تم تسجيل الصيانة الدورية بنجاح!');
        if (type === 'machine') {
            setMachines(prev => prev.map(m => m.id === id ? { ...m, last_maintenance_date: new Date().toISOString() } : m));
        }
    };

    return (
        <div className="p-8 max-w-7xl mx-auto">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">إدارة المعدات (Equipment)</h1>
                    <p className="text-gray-500">تتبع دورة حياة الآلات والشاشات الحريرية والصيانة</p>
                </div>
                <button
                    className="btn-primary flex items-center gap-2"
                    onClick={() => setIsAddModalOpen(true)}
                >
                    <Plus className="w-4 h-4" />
                    إضافة {activeTab === 'machines' ? 'آلة' : 'شاشة'}
                </button>
            </div>

            {/* Tabs */}
            <div className="flex gap-4 border-b mb-6">
                <button
                    className={`pb-4 px-4 font-medium transition-colors relative ${activeTab === 'machines' ? 'text-blue-600' : 'text-gray-500 hover:text-gray-700'}`}
                    onClick={() => setActiveTab('machines')}
                >
                    <div className="flex items-center gap-2">
                        <Settings className="w-5 h-5" />
                        الآلات (Press/Dryer)
                    </div>
                    {activeTab === 'machines' && <div className="absolute bottom-0 left-0 w-full h-1 bg-blue-600 rounded-t-full" />}
                </button>
                <button
                    className={`pb-4 px-4 font-medium transition-colors relative ${activeTab === 'screens' ? 'text-purple-600' : 'text-gray-500 hover:text-gray-700'}`}
                    onClick={() => setActiveTab('screens')}
                >
                    <div className="flex items-center gap-2">
                        <Settings2 className="w-5 h-5" />
                        الشاشات الحريرية (Screens)
                    </div>
                    {activeTab === 'screens' && <div className="absolute bottom-0 left-0 w-full h-1 bg-purple-600 rounded-t-full" />}
                </button>
            </div>

            <div className="card">
                <div className="p-4 border-b flex flex-wrap gap-4">
                    <div className="relative max-w-md flex-1">
                        <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                        <input
                            type="text"
                            placeholder="بحث عن معدة..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="input pr-12"
                        />
                    </div>
                </div>

                <div className="p-4">
                    {loading ? (
                        <div className="py-12 text-center text-gray-500">جاري التحميل...</div>
                    ) : activeTab === 'machines' ? (
                        // MACHINES TAB
                        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {machines.length === 0 ? <p className="text-gray-500 col-span-full py-8 text-center">لا توجد آلات مسجلة</p> :
                                machines.map(m => (
                                    <div key={m.id} className="border border-gray-100 rounded-2xl p-5 hover:border-blue-200 transition-colors shadow-sm bg-white">
                                        <div className="flex justify-between items-start mb-4">
                                            <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
                                                <Settings className="w-6 h-6" />
                                            </div>
                                            <span className={`px-3 py-1 text-xs font-bold rounded-full ${m.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                {m.status === 'active' ? 'جاهز' : 'صيانة'}
                                            </span>
                                        </div>
                                        <h3 className="font-bold text-lg mb-1 text-gray-800">{m.name}</h3>
                                        <p className="text-sm text-gray-500 mb-4">{m.type}</p>

                                        <div className="bg-gray-50 rounded-lg p-3 text-sm space-y-2 mb-4">
                                            <div className="flex justify-between">
                                                <span className="text-gray-500">آخر صيانة:</span>
                                                <span className="font-medium text-gray-700">{new Date(m.last_maintenance_date).toLocaleDateString('ar-DZ')}</span>
                                            </div>
                                        </div>

                                        <button
                                            onClick={() => handleMaintenance(m.id, 'machine')}
                                            className="w-full btn border border-gray-200 text-gray-700 hover:bg-gray-50 flex justify-center items-center gap-2"
                                        >
                                            <Wrench className="w-4 h-4" />
                                            تسجيل صيانة دورية
                                        </button>
                                    </div>
                                ))
                            }
                        </div>
                    ) : (
                        // SCREENS TAB
                        <div className="overflow-x-auto">
                            <table className="w-full text-right bg-white overflow-hidden border-collapse">
                                <thead className="bg-gray-50 border-b border-gray-100">
                                    <tr>
                                        <th className="p-4 font-semibold text-gray-600">ID / SKU </th>
                                        <th className="p-4 font-semibold text-gray-600">الحجم والشبك (Mesh)</th>
                                        <th className="p-4 font-semibold text-gray-600">التوتر (Tension)</th>
                                        <th className="p-4 font-semibold text-gray-600">عدد الطبعات (Impressions)</th>
                                        <th className="p-4 font-semibold text-gray-600">الحالة</th>
                                        <th className="p-4 font-semibold text-gray-600">الإجراء</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {screens.length === 0 ? <tr><td colSpan={6} className="p-8 text-center">لا توجد شاشات مسجلة كـ Inventory Item 'screen'</td></tr> :
                                        screens.map((s) => (
                                            <tr key={s.id} className="hover:bg-gray-50">
                                                <td className="p-4 font-medium text-gray-900">{s.sku || s.id.substring(0, 8)}</td>
                                                <td className="p-4 text-gray-600">{s.name}</td>
                                                <td className="p-4 font-bold text-gray-700">{s.current_tension_newtons || '20'} N</td>
                                                <td className="p-4 text-purple-600 font-bold">{s.total_impressions || 0}</td>
                                                <td className="p-4">
                                                    <span className={`px-2 py-1 text-xs font-bold rounded-full ${s.status === 'ready' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                                        {s.status || 'جاهز'}
                                                    </span>
                                                </td>
                                                <td className="p-4">
                                                    <button
                                                        className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                                                    >
                                                        إرسال للتنظيف (Reclaim)
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    }
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>

            {/* Add Modal */}
            {isAddModalOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl">
                        <h2 className="text-xl font-bold mb-4">إضافة {activeTab === 'machines' ? 'آلة جديدة' : 'شاشة حريرية جديدة'}</h2>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            {activeTab === 'machines' ? (
                                <>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">اسم الآلة</label>
                                        <input type="text" required className="input w-full" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">النوع</label>
                                        <select required className="input w-full bg-white" value={formData.type} onChange={(e) => setFormData({ ...formData, type: e.target.value })}>
                                            <option value="">-- اختر النوع --</option>
                                            <option value="Screen Print Press">آلة طباعة (Press)</option>
                                            <option value="Conveyor Dryer">فرن (Dryer)</option>
                                            <option value="Flash Cure">فلاش (Flash)</option>
                                            <option value="Washout Booth">حوض غسيل (Washout)</option>
                                        </select>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">الرمز (SKU)</label>
                                        <input type="text" required className="input w-full text-left" dir="ltr" value={formData.sku} onChange={(e) => setFormData({ ...formData, sku: e.target.value })} />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">الاسم / المواصفات (Mesh Count)</label>
                                        <input type="text" required className="input w-full" placeholder="e.g. 156 Mesh Aluminum" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">التوتر الحالي (نيوتن)</label>
                                        <input type="number" required min="0" className="input w-full" value={formData.current_tension_newtons} onChange={(e) => setFormData({ ...formData, current_tension_newtons: e.target.value })} />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">إجمالي الطبعات (Impressions)</label>
                                        <input type="number" required min="0" className="input w-full" value={formData.total_impressions} onChange={(e) => setFormData({ ...formData, total_impressions: e.target.value })} />
                                    </div>
                                </>
                            )}
                            <div className="flex gap-3 justify-end mt-6">
                                <button type="button" onClick={() => setIsAddModalOpen(false)} className="btn btn-secondary">إلغاء</button>
                                <button type="submit" disabled={isSubmitting} className="btn btn-primary">{isSubmitting ? 'جاري الإضافة...' : 'حفظ'}</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
