import { useState, useEffect } from 'react';
import { Target, AlertOctagon, RefreshCcw, TrendingDown, DollarSign } from 'lucide-react';
import { api } from '../services/api';
import toast from 'react-hot-toast';

export default function QualityControlPage() {
    const [reworkLogs, setReworkLogs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchLogs = async () => {
        try {
            setLoading(true);
            const res = await api.quality.listRework();
            if (res.success) setReworkLogs(res.data || []);
        } catch (error) {
            toast.error('خطأ في تحميل بيانات الجودة');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLogs();
    }, []);

    const totalRuined = reworkLogs.reduce((sum, log) => sum + Number(log.quantity_ruined || 0), 0);
    const totalCostLoss = reworkLogs.reduce((sum, log) => sum + Number(log.estimated_cost_loss || 0), 0);

    return (
        <div className="p-8 max-w-7xl mx-auto">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">مراقبة الجودة (Quality Control)</h1>
                    <p className="text-gray-500">تحليل الأخطاء المصنعية، الهدر، وتكاليف إعادة العمل</p>
                </div>
                <button className="btn-secondary flex items-center gap-2" onClick={fetchLogs}>
                    <RefreshCcw className="w-4 h-4" />
                    تحديث البيانات
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="card p-6 border-r-4 border-red-500 bg-red-50/30">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-gray-500 text-sm font-medium">إجمالي القطع التالفة</p>
                            <p className="text-3xl font-bold text-red-700">{totalRuined}</p>
                        </div>
                        <div className="bg-red-100 p-3 rounded-xl">
                            <AlertOctagon className="w-6 h-6 text-red-600" />
                        </div>
                    </div>
                </div>
                <div className="card p-6 border-r-4 border-orange-500 bg-orange-50/30">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-gray-500 text-sm font-medium">تكلفة خسائر الهدر المالي</p>
                            <p className="text-3xl font-bold text-orange-700">{totalCostLoss.toLocaleString()} دج</p>
                        </div>
                        <div className="bg-orange-100 p-3 rounded-xl">
                            <DollarSign className="w-6 h-6 text-orange-600" />
                        </div>
                    </div>
                </div>
                <div className="card p-6 border-r-4 border-blue-500">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-gray-500 text-sm font-medium">معدل الدقة (تاريخي)</p>
                            <p className="text-3xl font-bold text-blue-700">98.4%</p>
                        </div>
                        <div className="bg-blue-100 p-3 rounded-xl">
                            <Target className="w-6 h-6 text-blue-600" />
                        </div>
                    </div>
                </div>
            </div>

            <div className="card">
                <div className="p-6 border-b">
                    <h2 className="text-xl font-bold flex items-center gap-2 text-gray-800">
                        <TrendingDown className="w-5 h-5 text-gray-500" />
                        سجل الأخطاء وإعادة العمل (Rework Logs)
                    </h2>
                </div>
                <div className="p-4">
                    {loading ? (
                        <div className="py-12 text-center text-gray-500">جاري التحميل...</div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-right bg-white overflow-hidden border-collapse">
                                <thead className="bg-gray-50 border-b border-gray-100">
                                    <tr>
                                        <th className="p-4 font-semibold text-gray-600">التاريخ</th>
                                        <th className="p-4 font-semibold text-gray-600">المهمة/الطلب</th>
                                        <th className="p-4 font-semibold text-gray-600">العامل</th>
                                        <th className="p-4 font-semibold text-gray-600">سبب التلف (Reason)</th>
                                        <th className="p-4 font-semibold text-gray-600">ملاحظات وتفاصيل</th>
                                        <th className="p-4 font-semibold text-gray-600 text-center">الكمية التالفة</th>
                                        <th className="p-4 font-semibold text-gray-600 text-left">الخسارة المالية</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {reworkLogs.length === 0 ? (
                                        <tr><td colSpan={6} className="p-8 text-center text-gray-500">لا توجد سجلات أخطاء مسجلة. أداء ممتاز!</td></tr>
                                    ) : (
                                        reworkLogs.map(log => (
                                            <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                                                <td className="p-4 text-sm text-gray-600 min-w-[100px]">{new Date(log.created_at).toLocaleDateString('ar-DZ')}</td>
                                                <td className="p-4">
                                                    <div className="flex flex-col">
                                                        <span className="font-bold text-gray-900">{log.tasks?.title || log.task_id?.substring(0, 8)}</span>
                                                        <span className="text-xs text-gray-500 font-medium tracking-wider mt-0.5">طلب: {log.orders?.order_number || log.order_id?.substring(0, 8) || '-'}</span>
                                                    </div>
                                                </td>
                                                <td className="p-4 font-bold text-gray-800">{log.profiles?.name || log.worker_id?.substring(0, 8) || 'غير معروف'}</td>
                                                <td className="p-4">
                                                    <span className="px-2 py-1 bg-red-100 text-red-700 text-xs font-bold rounded-lg border border-red-200 whitespace-nowrap">
                                                        {log.reason}
                                                    </span>
                                                </td>
                                                <td className="p-4 text-sm text-gray-600 max-w-[200px]" title={log.notes}>
                                                    <p className="truncate block">{log.notes || '-'}</p>
                                                </td>
                                                <td className="p-4 text-center font-black text-red-600 whitespace-nowrap">{log.quantity_ruined} قطعة</td>
                                                <td className="p-4 text-left font-black text-gray-800 whitespace-nowrap">{log.estimated_cost_loss?.toLocaleString() || 0} دج</td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
