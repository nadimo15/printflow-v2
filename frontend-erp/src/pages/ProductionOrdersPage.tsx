import { useState, useEffect } from 'react';
import { Search, CheckCircle, AlertTriangle, ArrowRight, Layers, FileDown, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../services/api';

export default function ProductionOrdersPage() {
    const [orders, setOrders] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
    const [bomCalculation, setBomCalculation] = useState<any | null>(null);
    const [isCalculatingBOM, setIsCalculatingBOM] = useState(false);

    useEffect(() => {
        fetchProductionOrders();
    }, []);

    const fetchProductionOrders = async () => {
        setIsLoading(true);
        try {
            const response = await api.orders.listProductionEligible();
            if (response.success && response.data) {
                setOrders(response.data);
            } else {
                toast.error('فشل في جلب طلبات الإنتاج');
            }
        } catch (error) {
            console.error(error);
            toast.error('حدث خطأ في الاتصال');
        } finally {
            setIsLoading(false);
        }
    };

    const calculateBOM = async (order: any) => {
        setSelectedOrder(order);
        setIsCalculatingBOM(true);
        setBomCalculation(null); // Reset

        try {
            const response = await api.orders.calculateBOM(order.id);
            if (response.success && response.data) {
                setBomCalculation(response.data);
            } else {
                toast.error('فشل في حساب شجرة المواد');
                setBomCalculation(null);
            }
        } catch (e) {
            console.error(e);
            toast.error('حدث خطأ أثناء الاتصال بالخادم');
        } finally {
            setIsCalculatingBOM(false);
        }
    };

    const handleReleaseToProduction = async () => {
        if (!selectedOrder) return;

        const confirmRelease = window.confirm(`هل أنت متأكد من تحويل الطلب ${selectedOrder.order_number || selectedOrder.id.slice(0, 8)} للإنتاج؟`);
        if (confirmRelease) {
            try {
                // 1. Update order status
                await api.orders.updateStatus(selectedOrder.id, 'in_production');

                // 2. Generate initial generic task (in full implementation this iterates over steps)
                // Check if there are order items to create tasks for.
                if (selectedOrder.order_items && selectedOrder.order_items.length > 0) {
                    for (const item of selectedOrder.order_items) {
                        await api.tasks.create({
                            title: `إنتاج: ${item.name}`,
                            type: 'production',
                            orderId: selectedOrder.id,
                            orderItemId: item.id,
                            priority: 'high',
                            status: 'pending'
                        });
                    }
                } else {
                    await api.tasks.create({
                        title: `إنتاج الطلب ${selectedOrder.order_number || selectedOrder.id.slice(0, 8)}`,
                        type: 'production',
                        orderId: selectedOrder.id,
                        priority: 'high',
                        status: 'pending'
                    });
                }

                toast.success('تم تحرير الطلب للإنتاج وتم إنشاء المهام بنجاح!');
                setSelectedOrder(null);
                await fetchProductionOrders();
            } catch (err) {
                toast.error('حدث خطأ أثناء تحرير الطلب');
                console.error(err);
            }
        }
    };

    const filteredOrders = orders.filter(o =>
        (o.order_number || o.id).toLowerCase().includes(search.toLowerCase()) ||
        (o.customer?.name || '').toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 font-cairo">طلبات الإنتاج</h1>
                    <p className="text-sm text-gray-500 font-cairo mt-1">
                        إدارة الطلبات الجاهزة للإنتاج والتحقق من توفر المخزون
                    </p>
                </div>
                <button
                    onClick={fetchProductionOrders}
                    className={`p-2 text-gray-600 hover:text-indigo-600 dark:text-gray-400 dark:hover:text-indigo-400 bg-white dark:bg-gray-800 rounded-lg shadow-sm ${isLoading ? 'opacity-50' : ''}`}
                    title="تحديث"
                >
                    <RefreshCw size={20} className={isLoading ? 'animate-spin' : ''} />
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* Left Side: Orders List (2 cols) */}
                <div className="lg:col-span-2 space-y-4">
                    <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 flex items-center gap-4">
                        <div className="relative flex-1">
                            <input
                                type="text"
                                placeholder="بحث برقم الطلب أو العميل..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent font-cairo text-right"
                                dir="rtl"
                            />
                            <Search className="absolute left-3 top-2.5 text-gray-400" size={20} />
                        </div>
                    </div>

                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-right font-cairo">
                                <thead className="bg-gray-50 dark:bg-gray-700 border-b border-gray-100 dark:border-gray-600">
                                    <tr>
                                        <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">الطلب</th>
                                        <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">التاريخ</th>
                                        <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">الحالة</th>
                                        <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">إجراء</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                    {isLoading ? (
                                        <tr>
                                            <td colSpan={4} className="px-6 py-12 text-center text-gray-500">
                                                <RefreshCw className="animate-spin mx-auto mb-2" size={24} />
                                                جاري التحميل...
                                            </td>
                                        </tr>
                                    ) : filteredOrders.length === 0 ? (
                                        <tr>
                                            <td colSpan={4} className="px-6 py-12 text-center text-gray-500">
                                                لا توجد طلبات معلقة للإنتاج
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredOrders.map((order) => (
                                            <tr
                                                key={order.id}
                                                className={`transition-colors cursor-pointer ${selectedOrder?.id === order.id ? 'bg-indigo-50 dark:bg-indigo-900/20' : 'hover:bg-gray-50 dark:hover:bg-gray-700'}`}
                                                onClick={() => calculateBOM(order)}
                                            >
                                                <td className="px-6 py-4">
                                                    <div className="font-semibold text-gray-900 dark:text-white">#{order.order_number || order.id.slice(0, 8)}</div>
                                                    <div className="text-sm text-gray-500">{order.customer?.name || order.guest_info?.name || 'عميل'}</div>
                                                </td>
                                                <td className="px-6 py-4 text-sm text-gray-500">
                                                    {new Date(order.created_at).toLocaleDateString('ar-DZ')}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${order.status === 'in_production'
                                                        ? 'bg-purple-100 text-purple-800'
                                                        : 'bg-blue-100 text-blue-800'
                                                        }`}>
                                                        {order.status === 'in_production' ? 'قيد الإنتاج' : 'مؤكد'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-left">
                                                    <button
                                                        className="inline-flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-200 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                                                    >
                                                        <Layers size={16} />
                                                        تحليل BOM
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                {/* Right Side: BOM Control Panel */}
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 flex flex-col font-cairo">
                    <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                        <CheckCircle className="text-indigo-600" size={20} />
                        تفاصيل الإنتاج
                    </h2>

                    {!selectedOrder ? (
                        <div className="flex-1 flex flex-col items-center justify-center text-gray-400 py-12">
                            <FileDown size={48} className="mb-4 opacity-50" />
                            <p>الرجاء تحديد طلب من القائمة لمعاينة متطلبات الإنتاج</p>
                        </div>
                    ) : isCalculatingBOM ? (
                        <div className="flex-1 flex flex-col items-center justify-center text-gray-500 py-12">
                            <RefreshCw className="animate-spin mb-4 text-indigo-500" size={32} />
                            <p>جاري تحليل شجرة المواد (BOM)...</p>
                        </div>
                    ) : bomCalculation ? (
                        <div className="flex-1 flex flex-col">
                            <div className="mb-6 p-4 rounded-lg bg-gray-50 dark:bg-gray-700 border border-gray-100 dark:border-gray-600">
                                <div className="flex justify-between items-center mb-2">
                                    <span className="text-sm text-gray-500">الطلب المختار</span>
                                    <span className="font-bold">#{selectedOrder.order_number || selectedOrder.id.slice(0, 8)}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-gray-500">إجمالي المنتجات</span>
                                    <span className="font-semibold">{selectedOrder.order_items?.length || 0} منتج</span>
                                </div>
                            </div>

                            <h3 className="font-semibold text-gray-800 dark:text-gray-200 mb-3">المواد المطلوبة للإنتاج:</h3>

                            <div className="space-y-3 mb-6 flex-1">
                                {bomCalculation.components.map((comp: any, idx: number) => {
                                    const hasEnough = comp.available >= comp.required;
                                    return (
                                        <div key={idx} className={`p-3 rounded-lg border ${hasEnough ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
                                            <div className="flex justify-between items-start mb-1">
                                                <span className="font-medium text-sm">{comp.name}</span>
                                                {!hasEnough && <AlertTriangle size={16} className="text-red-500" />}
                                            </div>
                                            <div className="flex justify-between text-xs mt-2">
                                                <span className="text-gray-500">المطلوب: <b className="text-gray-900">{comp.required} {comp.unit}</b></span>
                                                <span className="text-gray-500">المتوفر: <b className={hasEnough ? 'text-green-600' : 'text-red-600'}>{comp.available} {comp.unit}</b></span>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>

                            <button
                                onClick={handleReleaseToProduction}
                                disabled={!bomCalculation.isSufficient}
                                className={`w-full py-3 rounded-lg font-bold flex items-center justify-center gap-2 transition-colors ${bomCalculation.isSufficient
                                    ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-md cursor-pointer'
                                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                    }`}
                            >
                                {bomCalculation.isSufficient ? 'تحرير للإنتاج (إنشاء المهام)' : 'المخزون غير كافٍ للإنتاج'}
                                <ArrowRight size={20} />
                            </button>
                        </div>
                    ) : null}
                </div>
            </div>
        </div>
    );
}
