import { useEffect, useMemo } from 'react';
import { useTasksStore } from '../store/tasksStore';
import { useOrdersStore } from '../store/ordersStore';
import { useAuthStore } from '../store/authStore';
import { Layout, Users, AlertTriangle, Activity, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function ManagerDashboardPage() {
    const { user } = useAuthStore();
    const { tasks, fetchTasks, isLoading: isTasksLoading } = useTasksStore();
    const { orders, fetchOrders, isLoading: isOrdersLoading } = useOrdersStore();
    const navigate = useNavigate();

    useEffect(() => {
        fetchTasks();
        fetchOrders();
    }, [fetchTasks, fetchOrders]);

    // Derived Statistics
    const activeOrders = useMemo(() => orders.filter(o => o.status === 'in_production' || o.status === 'confirmed'), [orders]);
    const unassignedTasks = useMemo(() => tasks.filter(t => !t.assignedToId && t.status !== 'completed'), [tasks]);
    const inProgressTasks = useMemo(() => tasks.filter(t => t.status === 'in_progress'), [tasks]);

    // Workload by Employee (Active Tasks)
    const workloadByEmployee = useMemo(() => {
        const counts: Record<string, { name: string, active: number }> = {};
        tasks.forEach(task => {
            if (task.assignedToId && task.status === 'in_progress') {
                if (!counts[task.assignedToId]) {
                    counts[task.assignedToId] = { name: task.assignedTo || 'عامل غير معروف', active: 0 };
                }
                counts[task.assignedToId].active++;
            }
        });
        return Object.values(counts).sort((a, b) => b.active - a.active);
    }, [tasks]);

    if ((isTasksLoading || isOrdersLoading) && tasks.length === 0) {
        return <div className="p-12 text-center text-gray-500">جاري تحميل إحصائيات الإنتاج...</div>;
    }

    return (
        <div className="space-y-6 max-w-7xl mx-auto pb-10">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-gray-900 bg-gradient-to-l from-slate-900 to-slate-700 bg-clip-text text-transparent flex items-center gap-2">
                        <Layout className="w-7 h-7" />
                        نظرة عامة على الورشة
                    </h1>
                    <p className="text-gray-500 mt-1">
                        أهلاً، <span className="font-bold text-gray-700">{user?.name}</span>. إليك ملخص سير العمليات.
                    </p>
                </div>
                <button
                    onClick={() => navigate('/production')}
                    className="btn btn-primary px-5 py-2 flex items-center gap-2"
                >
                    الذهاب للوحة الإنتاج <ArrowLeft className="w-4 h-4" />
                </button>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
                        <Activity className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-sm font-bold text-gray-400">الطلبات النشطة</p>
                        <h2 className="text-2xl font-black text-gray-900">{activeOrders.length}</h2>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4 relative overflow-hidden">
                    <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center z-10">
                        <AlertTriangle className="w-6 h-6" />
                    </div>
                    <div className="z-10">
                        <p className="text-sm font-bold text-gray-400">مهام غير مسندة</p>
                        <h2 className="text-2xl font-black text-gray-900">{unassignedTasks.length}</h2>
                    </div>
                    {unassignedTasks.length > 0 && (
                        <div className="absolute top-0 left-0 w-1 h-full bg-amber-400" />
                    )}
                </div>

                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
                        <Users className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-sm font-bold text-gray-400">مهام قيد التنفيذ حالياً</p>
                        <h2 className="text-2xl font-black text-gray-900">{inProgressTasks.length}</h2>
                    </div>
                </div>
            </div>

            {/* Deep Dive Sections */}
            <div className="flex flex-col lg:flex-row gap-6">

                {/* Workload */}
                <div className="lg:w-1/3 flex flex-col gap-4">
                    <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                        <Users className="w-4 h-4" />
                        الضغط على العمالة
                    </h3>
                    <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-2 flex flex-col gap-1">
                        {workloadByEmployee.length === 0 ? (
                            <div className="p-8 text-center text-gray-400 text-sm">لا يوجد مهام نشطة حالياً</div>
                        ) : (
                            workloadByEmployee.map((w, index) => (
                                <div key={index} className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-xl transition-colors">
                                    <div className="font-bold text-gray-900">{w.name}</div>
                                    <div className="bg-gray-900 text-white text-xs font-bold px-2 py-1 rounded">
                                        {w.active} مهام
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Bottlenecks / Unassigned */}
                <div className="flex-1 flex flex-col gap-4">
                    <h3 className="text-sm font-bold text-amber-500 uppercase tracking-widest flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4" />
                        مهام معلقة بحاجة لتعيين ({unassignedTasks.length})
                    </h3>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {unassignedTasks.slice(0, 6).map(task => (
                            <div key={task.id} className="bg-white p-5 rounded-2xl border border-amber-100 shadow-sm">
                                <div className="flex justify-between items-start mb-2">
                                    <h4 className="font-bold text-gray-900">{task.title}</h4>
                                    <span className="text-xs font-bold bg-gray-100 text-gray-600 px-2 py-1 rounded">
                                        {task.orders?.order_number || task.orderNumber}
                                    </span>
                                </div>
                                <div className="text-xs text-amber-600 font-bold mt-3 bg-amber-50 p-2 rounded-lg text-center">
                                    يتطلب توجيه من مدير الإنتاج
                                </div>
                            </div>
                        ))}
                        {unassignedTasks.length === 0 && (
                            <div className="col-span-1 md:col-span-2 p-8 text-center text-gray-400 bg-white border border-gray-100 rounded-2xl shadow-sm">
                                الورشة تعمل بكفاءة. لا توجد مهام عالقة بدون تعيين.
                            </div>
                        )}
                    </div>
                </div>

            </div>
        </div>
    );
}
