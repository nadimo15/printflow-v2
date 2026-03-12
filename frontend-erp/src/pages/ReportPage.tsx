import { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, DollarSign, Package, RefreshCw, ChevronDown } from 'lucide-react';
import { api } from '../services/api';
import toast from 'react-hot-toast';

interface Order {
    id: string;
    order_number: string;
    status: string;
    subtotal: number;
    shipping: number;
    total: number;
    material_cost: number;
    gross_margin: number;
    created_at: string;
    guest_info?: { name?: string; wilaya?: string };
    items?: any[];
}

const STATUS_LABEL: Record<string, string> = {
    pending: 'معلق', confirmed: 'مؤكد', in_production: 'قيد التنفيذ',
    ready: 'جاهز', shipped: 'تم الشحن', delivered: 'تم التسليم', cancelled: 'ملغى',
};

export default function ReportPage() {
    const [orders, setOrders] = useState<Order[]>([]);
    const [expenses, setExpenses] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [period, setPeriod] = useState<'all' | '7d' | '30d'>('30d');

    const fetchData = async () => {
        setLoading(true);
        try {
            const [ordersRes, expensesRes] = await Promise.all([
                api.orders.list(),
                api.expenses.list()
            ]);

            if (ordersRes.success && ordersRes.data) {
                setOrders(ordersRes.data);
            }
            if (expensesRes.success && expensesRes.data) {
                setExpenses(expensesRes.data);
            }
        } catch (e) {
            toast.error('فشل في تحميل البيانات');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchData(); }, []);

    // Filter by period
    const now = new Date();
    const filteredOrders = orders.filter(o => {
        if (period === 'all') return true;
        const days = period === '7d' ? 7 : 30;
        return (now.getTime() - new Date(o.created_at).getTime()) < days * 86400000;
    });

    const filteredExpenses = expenses.filter(e => {
        if (period === 'all') return true;
        const days = period === '7d' ? 7 : 30;
        return (now.getTime() - new Date(e.date || e.created_at).getTime()) < days * 86400000;
    });

    // Aggregates
    const rawRevenue = filteredOrders.reduce((s, o) => s + (Number(o.total) || 0), 0);
    const shippingCost = filteredOrders.reduce((s, o) => s + (Number(o.shipping) || 0), 0);
    const revenue = rawRevenue - shippingCost; // Net Sales excluding shipping
    const materialCost = filteredOrders.reduce((s, o) => s + (Number(o.material_cost) || 0), 0);
    const overheadExpenses = filteredExpenses.reduce((s, e) => s + (Number(e.amount) || 0), 0);

    const netProfit = revenue - materialCost - overheadExpenses;
    const marginPct = revenue > 0 ? ((netProfit / revenue) * 100).toFixed(1) : '—';
    const lossOrders = filteredOrders.filter(o => {
        const rev = (Number(o.total) || 0) - (Number(o.shipping) || 0);
        const cost = (Number(o.material_cost) || 0);
        return rev > 0 && cost > rev;
    });

    const fmt = (n: number) => n.toLocaleString('ar-DZ') + ' دج';

    return (
        <div>
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl font-bold">تقارير الربح والخسارة</h1>
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <select
                            value={period}
                            onChange={e => setPeriod(e.target.value as any)}
                            className="input w-auto pr-8 appearance-none"
                        >
                            <option value="7d">آخر 7 أيام</option>
                            <option value="30d">آخر 30 يوم</option>
                            <option value="all">كل الوقت</option>
                        </select>
                        <ChevronDown className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                    </div>
                    <button onClick={fetchData} disabled={loading} className="btn btn-secondary flex items-center gap-2">
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                        تحديث
                    </button>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <div className="card p-5">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                            <DollarSign className="w-5 h-5 text-blue-600" />
                        </div>
                        <span className="text-sm text-gray-500">إجمالي الإيرادات</span>
                    </div>
                    <p className="text-2xl font-bold text-gray-900">{fmt(revenue)}</p>
                    <p className="text-xs text-gray-400 mt-1">{filteredOrders.length} طلب</p>
                </div>

                <div className="card p-5">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center">
                            <Package className="w-5 h-5 text-orange-600" />
                        </div>
                        <span className="text-sm text-gray-500">التكاليف والمصاريف</span>
                    </div>
                    <p className="text-2xl font-bold text-gray-900">{fmt(materialCost + overheadExpenses)}</p>
                    <p className="text-xs text-gray-400 mt-1">مواد: {fmt(materialCost)} | مصاريف: {fmt(overheadExpenses)}</p>
                </div>

                <div className="card p-5">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
                            <Package className="w-5 h-5 text-purple-600" />
                        </div>
                        <span className="text-sm text-gray-500">إيرادات الشحن (مندوب)</span>
                    </div>
                    <p className="text-2xl font-bold text-gray-900">{fmt(shippingCost)}</p>
                    <p className="text-xs text-gray-400 mt-1">لا تحسب ضمن الإيرادات الصافية</p>
                </div>

                <div className="card p-5">
                    <div className="flex items-center gap-3 mb-2">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${netProfit >= 0 ? 'bg-green-100' : 'bg-red-100'}`}>
                            {netProfit >= 0
                                ? <TrendingUp className="w-5 h-5 text-green-600" />
                                : <TrendingDown className="w-5 h-5 text-red-600" />
                            }
                        </div>
                        <span className="text-sm text-gray-500">صافي الربح (النهائي)</span>
                    </div>
                    <p className={`text-2xl font-bold ${netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>{fmt(netProfit)}</p>
                    <p className="text-xs text-gray-400 mt-1">هامش الربح: {marginPct}%</p>
                </div>
            </div>

            {/* Orders Table */}
            <div className="card">
                <div className="p-4 border-b">
                    <h2 className="font-bold text-gray-800">تفاصيل الطلبات (الأرباح الإجمالية لكل طلب)</h2>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="text-right p-3 text-sm font-medium text-gray-500">رقم الطلب</th>
                                <th className="text-right p-3 text-sm font-medium text-gray-500">العميل / الولاية</th>
                                <th className="text-right p-3 text-sm font-medium text-gray-500">الحالة</th>
                                <th className="text-right p-3 text-sm font-medium text-gray-500">الإيرادات</th>
                                <th className="text-right p-3 text-sm font-medium text-blue-600">تكلفة المواد</th>
                                <th className="text-right p-3 text-sm font-medium text-gray-500">الشحن</th>
                                <th className="text-right p-3 text-sm font-medium text-green-600">الربح الإجمالي (قبل المصاريف)</th>
                                <th className="text-right p-3 text-sm font-medium text-gray-500">الهامش %</th>
                                <th className="text-right p-3 text-sm font-medium text-gray-500">التاريخ</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan={9} className="p-8 text-center text-gray-400">جاري التحميل...</td></tr>
                            ) : filteredOrders.length === 0 ? (
                                <tr><td colSpan={9} className="p-8 text-center text-gray-400">لا توجد طلبات في هذه الفترة</td></tr>
                            ) : filteredOrders.map(order => {
                                const rawRev = Number(order.total) || 0;
                                const sc = Number(order.shipping) || 0;
                                const rev = rawRev - sc;
                                const mc = Number(order.material_cost) || 0;

                                const profit = rev - mc;
                                const pct = rev > 0 ? ((profit / rev) * 100).toFixed(0) : '—';
                                const isLoss = profit < 0 && rev > 0;
                                return (
                                    <tr key={order.id} className={`border-b last:border-0 hover:bg-gray-50 ${isLoss ? 'bg-red-50/40' : ''}`}>
                                        <td className="p-3 font-medium text-sm">{order.order_number}</td>
                                        <td className="p-3">
                                            <p className="text-sm font-medium">
                                                {(order as any).shipping_address?.name
                                                    || order.guest_info?.name
                                                    || (order as any).customers?.name
                                                    || '—'}
                                            </p>
                                            <p className="text-xs text-gray-400">
                                                {(order as any).shipping_address?.wilaya
                                                    || order.guest_info?.wilaya
                                                    || '—'}
                                            </p>
                                        </td>
                                        <td className="p-3">
                                            <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                                                {STATUS_LABEL[order.status] || order.status}
                                            </span>
                                        </td>
                                        <td className="p-3 font-bold text-sm">{fmt(rev)}</td>
                                        <td className="p-3 text-blue-600 text-sm">{mc > 0 ? fmt(mc) : <span className="text-gray-300">—</span>}</td>
                                        <td className="p-3 text-sm">{sc > 0 ? fmt(sc) : <span className="text-gray-300">مجاني</span>}</td>
                                        <td className={`p-3 font-bold text-sm ${profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                            {mc > 0 ? fmt(profit) : <span className="text-gray-300">— (تكلفة غير محددة)</span>}
                                        </td>
                                        <td className={`p-3 text-sm font-medium ${profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                            {mc > 0 ? `${pct}%` : '—'}
                                        </td>
                                        <td className="p-3 text-gray-500 text-xs">
                                            {new Date(order.created_at).toLocaleDateString('ar-DZ')}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                {lossOrders.length > 0 && (
                    <div className="p-4 bg-red-50 border-t border-red-100">
                        <p className="text-sm text-red-700 font-medium">
                            ⚠️ تحذير: {lossOrders.length} طلب بهامش سلبي — يُنصح بمراجعة تكلفة المواد وسعر البيع.
                        </p>
                    </div>
                )}
            </div>

            {/* Note */}
            <div className="mt-4 p-4 bg-blue-50 rounded-xl">
                <p className="text-sm text-blue-700">
                    💡 <strong>ملاحظة:</strong> تم استبعاد الشحن من الإيرادات (تكلفة الشحن يتحملها الزبون ويأخذها المندوب).<br />
                    الربح يُحسب تلقائياً من: الإيرادات الصافية (دون الشحن) − تكلفة المواد.<br />
                    وصافي الربح (النهائي) يطرح جميع المصاريف الإدارية والتشغيلية.
                </p>
            </div>
        </div>
    );
}
