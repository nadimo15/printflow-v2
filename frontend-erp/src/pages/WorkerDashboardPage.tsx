import { useEffect, useMemo, useState } from 'react';
import { useTasksStore, Task } from '../store/tasksStore';
import { useAuthStore } from '../store/authStore';
import { useOrdersStore } from '../store/ordersStore';
import { CheckCircle2, List, PenTool, AlertCircle, Clock, Play, Pause, History, Package, ArrowDownToLine } from 'lucide-react';
import toast from 'react-hot-toast';
import WorkerTaskCompletionModal from '../components/production/WorkerTaskCompletionModal';
import { api } from '../services/api';
import { handleViewFile, handleDownloadFile } from '../utils/fileViewer';

export default function WorkerDashboardPage() {
    const { user } = useAuthStore();
    const { tasks, fetchTasks, isLoading: isTasksLoading } = useTasksStore();
    const { updateTaskStatus: updateOrderTaskStatus } = useOrdersStore(); // Still used for simple states (start, pause)

    const [activeTab, setActiveTab] = useState<'active' | 'history'>('active');
    const [finishingTask, setFinishingTask] = useState<Task | null>(null);

    useEffect(() => {
        if (user) {
            fetchTasks();
        }
    }, [user, fetchTasks]);

    // Active (Not Completed)
    const myActiveTasks = useMemo(() => {
        return tasks.filter(t => t.assignedToId === user?.id && t.status !== 'completed');
    }, [tasks, user]);

    // History (Completed)
    const myCompletedTasks = useMemo(() => {
        return tasks.filter(t => t.assignedToId === user?.id && t.status === 'completed')
            .sort((a, b) => new Date(b.completedAt || 0).getTime() - new Date(a.completedAt || 0).getTime());
    }, [tasks, user]);

    const activeTask = myActiveTasks.find(t => t.status === 'in_progress');
    const otherTasks = myActiveTasks.filter(t => t.status === 'pending' || t.status === 'paused');

    // Grouping by Order
    const groupedPendingTasks = useMemo(() => {
        const groups: Record<string, { orderNumber: string, tasks: typeof otherTasks }> = {};
        for (const t of otherTasks) {
            const ordKey = t.orderId || t.orderNumber || 'unknown';
            if (!groups[ordKey]) {
                groups[ordKey] = {
                    orderNumber: t.orders?.order_number || t.orderNumber || 'Unknown Order',
                    tasks: []
                };
            }
            groups[ordKey].tasks.push(t);
        }
        return Object.values(groups);
    }, [otherTasks]);

    const handleStartTask = async (taskId: string, orderId: string) => {
        if (activeTask && activeTask.id !== taskId) {
            toast.error('الرجاء إيقاف المهمة الحالية أولاً.');
            return;
        }
        try {
            await updateOrderTaskStatus(orderId, taskId, 'in_progress');
            fetchTasks();
            toast.success('تم البدء بتنفيذ المهمة');
        } catch (e) {
            toast.error('حدث خطأ أثناء التحديث');
        }
    };

    const handlePauseTask = async (taskId: string, orderId: string) => {
        try {
            await updateOrderTaskStatus(orderId, taskId, 'paused' as any);
            fetchTasks();
            toast.success('تم إيقاف المهمة مؤقتاً');
        } catch (e) {
            toast.error('حدث خطأ أثناء الإيقاف');
        }
    };

    const handleCompleteTaskSimple = async (taskId: string, orderId: string) => {
        try {
            // Optimistically update local UI immediately
            await updateOrderTaskStatus(orderId, taskId, 'completed');
            // Re-fetch to guarantee sync with DB
            fetchTasks();
            toast.success('تم إنجاز المهمة بنجاح!');
        } catch (e) {
            toast.error('حدث خطأ أثناء إنهاء المهمة');
        }
    };

    const handleCompleteWithConsumption = async (taskId: string, orderId: string, consumption: any) => {
        try {
            const result = await api.tasks.completeWithInventory({
                taskId,
                orderId,
                workerId: user?.id || '',
                consumption
            });
            if (result.success) {
                toast.success('تم إنجاز المهمة وخصم المواد بنجاح!');
                fetchTasks();
            }
        } catch (e: any) {
            toast.error(e.message || 'حدث خطأ أثناء خصم المخزون');
            throw e; // Modal needs to know it failed so it doesn't close
        }
    };

    if (isTasksLoading && tasks.length === 0) {
        return <div className="p-12 text-center text-gray-500">جاري تحميل مهامك...</div>;
    }

    const renderTaskConfig = (task: Task) => {
        if (!task.order_items) return null;

        // Sometimes backend returns an array of one item, sometimes it returns an object directly due to a .single() relation mapping.
        const item = Array.isArray(task.order_items) ? task.order_items[0] : task.order_items;
        if (!item) return null;

        const custom = item.customization || {};
        const bagColor = custom['لون الكيس'] || custom.color || '-';
        const size = custom.selected_size || custom.size || '-';

        let printColors = custom['عدد ألوان الطباعة'] || custom.printColors || '-';
        if (Array.isArray(printColors)) printColors = printColors.join(', ');

        let printSides = custom['وجه الطباعة'] || custom.printOptions?.sides?.value || custom.printSides || '-';
        if (Array.isArray(printSides)) printSides = printSides.join(', ');

        const relatedDesignTask = tasks.find(t => t.type === 'design' && t.orderItemId === task.orderItemId);

        return (
            <div className="mb-4 p-3 rounded-lg bg-gray-50 border border-gray-100 space-y-3">
                <div className="flex flex-col gap-2 pb-2">
                    <div className="flex justify-between items-start">
                        <span className="font-bold text-gray-800 text-sm">{item.name}</span>
                        <span className="font-black text-gray-900 bg-gray-200 px-2 py-0.5 rounded text-xs shrink-0">× {item.quantity}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs text-gray-600 mt-1">
                        <div className="flex gap-1"><span className="text-gray-400">المقاس:</span> <span className="font-bold">{size}</span></div>
                        <div className="flex gap-1"><span className="text-gray-400">لون الحقيبة:</span> <span className="font-bold">{bagColor}</span></div>
                        <div className="flex gap-1"><span className="text-gray-400">الألوان:</span> <span className="font-bold">{printColors}</span></div>
                        <div className="flex gap-1"><span className="text-gray-400">الأوجه:</span> <span className="font-bold">{printSides}</span></div>
                    </div>
                    {(custom.notes || custom['ملاحظات']) && (
                        <div className="mt-1 text-xs text-orange-700 bg-orange-50 p-1.5 rounded border border-orange-100">
                            <span className="font-bold">ملاحظة:</span> {custom.notes || custom['ملاحظات']}
                        </div>
                    )}
                </div>

                {relatedDesignTask && relatedDesignTask.designFileUrl && (
                    <div className="flex gap-2 w-full mt-2">
                        <button onClick={(e) => handleViewFile(e, relatedDesignTask.designFileUrl!)} className="flex-1 bg-purple-50 text-purple-700 border border-purple-200 py-1.5 rounded text-center text-xs font-bold hover:bg-purple-100 flex items-center justify-center gap-1 transition-colors">
                            <AlertCircle className="w-3.5 h-3.5" />
                            عرض الشعار / التصميم المعتمد
                        </button>
                        <button onClick={(e) => handleDownloadFile(e, relatedDesignTask.designFileUrl!, `design-${relatedDesignTask.id}.png`)} title="تحميل التصميم" className="w-8 shrink-0 bg-purple-50 text-purple-700 border border-purple-200 py-1.5 rounded text-center text-xs font-bold hover:bg-purple-100 flex items-center justify-center gap-1 transition-colors">
                            <ArrowDownToLine className="w-3.5 h-3.5" />
                        </button>
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="space-y-6 max-w-7xl mx-auto pb-10">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-gray-900 bg-gradient-to-l from-slate-900 to-slate-700 bg-clip-text text-transparent">
                        مساحة عمل الإنتاج
                    </h1>
                    <p className="text-gray-500 mt-1">
                        أهلاً، <span className="font-bold text-gray-700">{user?.name}</span>
                    </p>
                </div>
                <button
                    onClick={() => fetchTasks()}
                    className="btn btn-secondary px-4 py-2"
                >
                    تحديث
                </button>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 border-b border-gray-200">
                <button
                    onClick={() => setActiveTab('active')}
                    className={`px-4 py-3 font-bold text-sm border-b-2 transition-colors ${activeTab === 'active' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                >
                    المهام الحالية ({myActiveTasks.length})
                </button>
                <button
                    onClick={() => setActiveTab('history')}
                    className={`px-4 py-3 font-bold text-sm border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'history' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                >
                    <History className="w-4 h-4" />
                    السجل ({myCompletedTasks.length})
                </button>
            </div>

            {activeTab === 'active' && (
                <>
                    {myActiveTasks.length === 0 ? (
                        <div className="p-12 text-center text-gray-500 bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col items-center">
                            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                                <CheckCircle2 className="w-8 h-8 text-gray-300" />
                            </div>
                            <h3 className="text-lg font-bold text-gray-900">عمل رائع!</h3>
                            <p>لا توجد مهام حالية قيد الانتظار.</p>
                        </div>
                    ) : (
                        <div className="flex flex-col lg:flex-row gap-6">

                            {/* Active Task (High Priority Area) */}
                            {activeTask && (
                                <div className="lg:w-1/3 shrink-0 flex flex-col gap-4">
                                    <h2 className="text-sm font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                                        <div className="w-2.5 h-2.5 bg-blue-500 rounded-full animate-pulse" />
                                        قيد العمل حالياً
                                    </h2>
                                    <div className="bg-white border-2 border-blue-500 rounded-2xl shadow-[0_4px_24px_-8px_rgba(59,130,246,0.3)] overflow-hidden">
                                        <div className="px-6 py-5 bg-blue-50/50 border-b border-blue-100 flex items-center justify-between">
                                            <h3 className="font-bold text-blue-900">{activeTask.title}</h3>
                                        </div>
                                        <div className="p-6">
                                            <div className="flex items-center gap-2 text-sm text-gray-600 mb-4 bg-gray-50 p-3 rounded-lg font-medium border border-gray-100">
                                                <PenTool className="w-4 h-4 text-gray-400" />
                                                رقم الطلب: <span className="font-bold text-gray-900">{activeTask.orders?.order_number || activeTask.orderNumber}</span>
                                            </div>

                                            {renderTaskConfig(activeTask)}

                                            <div className="flex gap-3">
                                                <button
                                                    onClick={() => handlePauseTask(activeTask.id, activeTask.orderId)}
                                                    className="flex-1 py-3 text-sm font-bold rounded-xl bg-orange-100 text-orange-700 hover:bg-orange-200 transition-colors flex justify-center items-center gap-2"
                                                >
                                                    <Pause className="w-4 h-4" />
                                                    إيقاف
                                                </button>
                                                {activeTask.type === 'printing' ? (
                                                    <button
                                                        onClick={() => setFinishingTask(activeTask)}
                                                        className="flex-[2] py-3 text-sm font-bold rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 text-white hover:opacity-90 transition-opacity shadow-sm flex items-center justify-center gap-2"
                                                    >
                                                        <CheckCircle2 className="w-5 h-5" />
                                                        تأكيد الإنتاج والمواد
                                                    </button>
                                                ) : (
                                                    <button
                                                        onClick={() => handleCompleteTaskSimple(activeTask.id, activeTask.orderId)}
                                                        className="flex-[2] py-3 text-sm font-bold rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 text-white hover:opacity-90 transition-opacity shadow-sm flex items-center justify-center gap-2"
                                                    >
                                                        <CheckCircle2 className="w-5 h-5" />
                                                        إتمام المهمة
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Pending Queue Grouped by Order */}
                            <div className="flex-1 flex flex-col gap-4">
                                <h2 className="text-sm font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                                    <List className="w-4 h-4" />
                                    مهام بانتظار البدء
                                </h2>

                                <div className="space-y-6">
                                    {groupedPendingTasks.map(group => (
                                        <div key={group.orderNumber} className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                                            <div className="bg-gray-50 border-b border-gray-200 px-5 py-3 flex justify-between items-center">
                                                <h3 className="font-bold text-gray-800 flex items-center gap-2">
                                                    <Package className="w-4 h-4 text-gray-500" />
                                                    الطلب: {group.orderNumber}
                                                </h3>
                                                <span className="text-xs font-bold text-gray-500 bg-gray-200 px-2 py-1 rounded-full">
                                                    {group.tasks.length} مهام
                                                </span>
                                            </div>
                                            <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                {group.tasks.map(task => (
                                                    <div key={task.id} className={`p-4 rounded-xl border ${task.status === 'paused' ? 'bg-orange-50/30 border-orange-100' : 'bg-white border-gray-100'} shadow-sm relative`}>
                                                        <div className="flex justify-between items-start mb-3">
                                                            <h4 className="font-bold text-gray-900 text-sm">
                                                                {task.title}
                                                                {task.status === 'paused' && <span className="ml-2 text-[10px] bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full inline-flex">موقوفة موقتاً</span>}
                                                            </h4>
                                                        </div>

                                                        {renderTaskConfig(task)}

                                                        <div className="flex gap-2 mt-3 text-xs">
                                                            <button
                                                                onClick={() => handleStartTask(task.id, task.orderId)}
                                                                className={`flex-1 py-2 font-bold rounded-lg flex items-center justify-center gap-1.5 transition-colors ${activeTask
                                                                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                                                    : 'bg-gray-900 text-white hover:bg-gray-800 shadow-sm'
                                                                    }`}
                                                                disabled={!!activeTask}
                                                            >
                                                                <Play className="w-3.5 h-3.5" />
                                                                {task.status === 'paused' ? 'استئناف' : 'البدء الآن'}
                                                            </button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </>
            )}

            {activeTab === 'history' && (
                <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm min-h-[400px]">
                    {myCompletedTasks.length === 0 ? (
                        <p className="text-gray-500 text-center py-10">لا يوجد سجل للمهام المنجزة بعد.</p>
                    ) : (
                        <div className="space-y-4">
                            {myCompletedTasks.map(task => (
                                <div key={task.id} className="flex justify-between items-center p-4 rounded-xl border border-gray-100 hover:bg-gray-50 transition-colors">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center">
                                            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-gray-900">{task.title}</h4>
                                            <p className="text-xs text-gray-500 mt-1">
                                                الطلب: {task.orders?.order_number || task.orderNumber} | المنتج: {task.order_items?.name || 'غير محدد'}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="text-left">
                                        <div className="text-sm font-bold text-gray-700 flex items-center gap-1 mb-1 justify-end">
                                            <Clock className="w-4 h-4 text-gray-400" />
                                            {task.completedAt ? new Date(task.completedAt).toLocaleDateString('ar-DZ') : 'مكتمل'}
                                        </div>
                                        <div className="text-xs text-gray-400">
                                            {task.actualHours ? `استغرق ${task.actualHours} ساعة` : ''}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {finishingTask && (
                <WorkerTaskCompletionModal
                    task={finishingTask}
                    onClose={() => setFinishingTask(null)}
                    onComplete={handleCompleteWithConsumption}
                />
            )}
        </div>
    );
}
