import { CheckCircle2, Layers, ChevronLeft, Lock, Info, Hourglass, Box } from 'lucide-react';
import type { Order, Task } from '../../store/ordersStore';
import { useAuthStore } from '../../store/authStore';
import { useEmployeesStore } from '../../store/employeesStore';
import { useEffect } from 'react';
import clsx from 'clsx';
import { handleViewFile, handleDownloadFile } from '../../utils/fileViewer';
import { Eye, ArrowDownToLine } from 'lucide-react';

interface ProductionOrderModalProps {
    order: Order;
    onClose: () => void;
    onTaskAction: (taskId: string, newStatus: Task['status']) => void;
    onTaskAssign?: (taskId: string, userId: string) => void;
}

export default function ProductionOrderModal({ order, onClose, onTaskAction, onTaskAssign }: ProductionOrderModalProps) {
    const { user } = useAuthStore();
    const { employees, fetchEmployees } = useEmployeesStore();

    useEffect(() => {
        const effectiveRole = user?.role === 'project_admin' ? 'admin' : user?.role;
        if (effectiveRole === 'admin' || effectiveRole === 'manager') {
            fetchEmployees();
        }
    }, [user?.role, fetchEmployees]);

    // Summary Calculations
    const totalQuantity = order.items.reduce((acc, item) => acc + item.quantity, 0);
    const completedTasksCount = order.tasks?.filter(t => t.status === 'completed').length || 0;
    const totalTasksCount = order.tasks?.length || 0;
    const progressPercent = totalTasksCount > 0 ? Math.round((completedTasksCount / totalTasksCount) * 100) : 0;

    // Ordered Customization Display (Grid format)
    const renderConfigGrid = (customization: any) => {
        if (!customization) return null;

        const specs = [];
        if (customization.size) specs.push({ label: 'المقاس', value: customization.size });
        if (customization.color) specs.push({ label: 'لون الخامة', value: customization.color });
        if (customization.printSide) specs.push({ label: 'جهة الطباعة', value: customization.printSide });
        if (customization.printColor) specs.push({ label: 'لون الطباعة', value: customization.printColor });
        if (customization.colors) specs.push({ label: 'الألوان', value: Array.isArray(customization.colors) ? customization.colors.join('، ') : customization.colors });

        return (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-4 p-4 rounded-lg bg-gray-50/50 border border-gray-100/50">
                {specs.map((spec, i) => (
                    <div key={i} className="flex flex-col">
                        <span className="text-xs text-gray-400 font-medium mb-1">{spec.label}</span>
                        <span className="text-sm font-semibold text-gray-900">{spec.value}</span>
                    </div>
                ))}
            </div>
        );
    };

    return (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex justify-end transition-opacity" dir="rtl">
            <div className="bg-white w-full max-w-3xl h-full shadow-2xl flex flex-col animate-in slide-in-from-left duration-300 sm:rounded-r-2xl border-l border-gray-100">

                {/* 1. Header (Notion Style) */}
                <div className="px-10 py-8 flex flex-col shrink-0 border-b border-gray-100 bg-white sticky top-0 z-20">
                    <div className="flex items-center justify-between mb-6">
                        <button onClick={onClose} className="p-2 -mr-2 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-colors flex items-center gap-1 group">
                            <ChevronLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                            <span className="text-sm font-medium">العودة للوحة</span>
                        </button>

                        <div className="flex items-center gap-3">
                            {order.status === 'confirmed' && <div className="px-3 py-1.5 rounded-md bg-gray-100 text-gray-700 text-xs font-bold uppercase tracking-widest">تأكيد</div>}
                            {order.status === 'in_production' && <div className="px-3 py-1.5 rounded-md bg-blue-50 text-blue-700 text-xs font-bold uppercase tracking-widest ring-1 ring-inset ring-blue-100">قيد الإنتاج</div>}
                            {order.status === 'ready' && <div className="px-3 py-1.5 rounded-md bg-emerald-50 text-emerald-700 text-xs font-bold uppercase tracking-widest ring-1 ring-inset ring-emerald-100">جاهز</div>}
                            {order.status === 'shipped' && <div className="px-3 py-1.5 rounded-md bg-purple-50 text-purple-700 text-xs font-bold uppercase tracking-widest ring-1 ring-inset ring-purple-100">تم الشحن</div>}
                        </div>
                    </div>

                    <h2 className="text-4xl font-extrabold text-gray-900 tracking-tight">
                        {order.orderNumber}
                    </h2>
                    <p className="text-gray-500 mt-2 text-base">
                        العميل: <span className="font-semibold text-gray-700">{typeof order.customer === 'string' ? order.customer : order.customer?.name}</span>
                    </p>
                </div>

                {/* Scrollable Context Area */}
                <div className="px-10 py-8 space-y-12 overflow-y-auto flex-1">

                    {/* 2. Order Summary Panel */}
                    <section className="bg-gray-50 rounded-2xl p-6 border border-gray-100 flex flex-wrap gap-8 items-center justify-between">
                        <div className="flex gap-8">
                            <div>
                                <div className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1 flex items-center gap-1">
                                    <Box className="w-3 h-3" /> إجمالي الكمية
                                </div>
                                <div className="text-2xl font-black text-gray-900">{totalQuantity.toLocaleString()}</div>
                            </div>
                            <div>
                                <div className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1 flex items-center gap-1">
                                    <Layers className="w-3 h-3" /> التكوينات
                                </div>
                                <div className="text-2xl font-black text-gray-900">{order.items.length}</div>
                            </div>
                        </div>

                        {totalTasksCount > 0 && (
                            <div className="shrink-0 text-left">
                                <div className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">إنجاز الإنتاج</div>
                                <div className="flex items-center gap-4">
                                    <div className="w-32 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-gray-900 rounded-full transition-all duration-700 ease-out"
                                            style={{ width: `${progressPercent}%` }}
                                        />
                                    </div>
                                    <span className="text-sm font-bold text-gray-900">{progressPercent}%</span>
                                </div>
                            </div>
                        )}
                    </section>

                    {/* 3. Order Items / Configurations */}
                    <section>
                        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">التفاصيل الفنية للمنتجات</h3>
                        <div className="space-y-4">
                            {order.items.map((item, index) => (
                                <div key={item.id || index} className="p-5 bg-white rounded-2xl border border-gray-100 shadow-sm">
                                    <div className="flex items-center justify-between">
                                        <h4 className="font-extrabold text-gray-900 text-lg">{item.name}</h4>
                                        <div className="bg-gray-900 text-white px-3 py-1 rounded-md text-sm font-bold shadow-sm">
                                            الكمية: {item.quantity.toLocaleString()}
                                        </div>
                                    </div>

                                    {renderConfigGrid(item.customization)}

                                    <div className="mt-5 pt-4 border-t border-gray-50 flex items-center justify-between">
                                        <span className="text-xs text-gray-400">تحتوي هذه التهيئة على ملف تصميم مرفق</span>
                                        <div className="flex gap-2">
                                            <button onClick={(e) => { e.preventDefault(); handleViewFile(e, item.customization?.designUrl || ''); }}
                                                className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-800 transition-colors bg-blue-50 px-3 py-2 rounded-md hover:bg-blue-100">
                                                <Eye className="w-4 h-4" />
                                                عرض التصميم
                                            </button>
                                            <button onClick={(e) => { e.preventDefault(); handleDownloadFile(e, item.customization?.designUrl || '', `design-${order.orderNumber}.png`); }}
                                                className="inline-flex items-center gap-1.5 text-xs font-bold text-purple-600 hover:text-purple-800 transition-colors bg-purple-50 px-3 py-2 rounded-md hover:bg-purple-100">
                                                <ArrowDownToLine className="w-4 h-4" />
                                                تحميل التصميم
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>

                    {/* 4. Hierarchical Production Timeline */}
                    <section>
                        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-6 border-b border-gray-100 pb-2">
                            مسار الإنتاج (Workflow)
                        </h3>

                        {order.tasks && order.tasks.length > 0 ? (() => {
                            // Group tasks by order_item_id
                            const tasksByItem = order.tasks.reduce((acc, task) => {
                                const itemId = task.order_item_id || 'general';
                                if (!acc[itemId]) acc[itemId] = [];
                                acc[itemId].push(task);
                                return acc;
                            }, {} as Record<string, Task[]>);

                            return (
                                <div className="space-y-8">
                                    {Object.entries(tasksByItem).map(([itemId, itemTasks]) => {
                                        const orderItem = order.items.find(i => i.id === itemId);
                                        return (
                                            <div key={itemId} className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
                                                <h4 className="font-bold text-gray-900 mb-6 flex items-center gap-2">
                                                    <Layers className="w-5 h-5 text-primary" />
                                                    مسار إنتاج: <span className="text-primary bg-primary/10 px-2 py-0.5 rounded-md">{orderItem ? `${orderItem.name} (${orderItem.quantity} قطعة)` : 'مهام عامة'}</span>
                                                </h4>

                                                <div className="relative pl-6">
                                                    {/* Backbone vertical line */}
                                                    <div className="absolute top-4 bottom-4 right-5 w-px bg-gray-100" />

                                                    <div className="space-y-4 relative">
                                                        {itemTasks.map((task, index) => {
                                                            const isCompleted = task.status === 'completed';
                                                            const isInProgress = task.status === 'in_progress';
                                                            const isPending = task.status === 'pending';

                                                            // A task is structurally "Locked" if it is pending AND the previous task isn't completed.
                                                            const previousTask = index > 0 ? itemTasks[index - 1] : null;
                                                            const isLocked = isPending && previousTask && previousTask.status !== 'completed';

                                                            // The "Current" step is the first one that is either pending (unlocked) or in_progress.
                                                            const isCurrentActionableStep = !isCompleted && !isLocked;

                                                            const effectiveRole = user?.role === 'project_admin' ? 'admin' : user?.role;
                                                            const canAct = effectiveRole === 'admin' || effectiveRole === 'production_manager' || effectiveRole === 'manager' || task.assignedToId === user?.id || !task.assignedToId;

                                                            return (
                                                                <div key={task.id} className="relative flex items-start gap-5">
                                                                    <div className="relative z-10 w-10 flex justify-center shrink-0 mt-3">
                                                                        {isCompleted ? (
                                                                            <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center ring-4 ring-white">
                                                                                <CheckCircle2 className="w-4 h-4 text-gray-400" />
                                                                            </div>
                                                                        ) : isCurrentActionableStep ? (
                                                                            <div className="w-6 h-6 rounded-full bg-blue-50 border-2 border-blue-500 flex items-center justify-center ring-4 ring-white shadow-sm">
                                                                                {isInProgress && <div className="w-2.5 h-2.5 bg-blue-500 rounded-full animate-pulse" />}
                                                                            </div>
                                                                        ) : (
                                                                            <div className="w-3 h-3 rounded-full mt-1.5 bg-white border-2 border-dashed border-gray-300 ring-4 ring-white" />
                                                                        )}
                                                                    </div>

                                                                    <div className={clsx(
                                                                        "flex-1 rounded-2xl transition-all duration-300",
                                                                        isCompleted ? "py-2 opacity-50 hover:opacity-100" :
                                                                            isCurrentActionableStep ? "bg-white border border-gray-200 shadow-[0_4px_24px_-8px_rgba(0,0,0,0.08)] p-5 ring-1 ring-inset ring-gray-100/50" :
                                                                                "py-2 opacity-60"
                                                                    )}>
                                                                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                                                                            <div className="flex flex-col gap-1.5">
                                                                                <h4 className={clsx(
                                                                                    "font-bold",
                                                                                    isCompleted ? "text-gray-500 text-base line-through decoration-gray-300" :
                                                                                        isCurrentActionableStep ? "text-gray-900 text-lg" :
                                                                                            "text-gray-600 text-base"
                                                                                )}>
                                                                                    {task.title}
                                                                                </h4>

                                                                                {isCurrentActionableStep && (
                                                                                    <div className="flex items-center gap-3 text-xs mt-1">
                                                                                        {task.assignedTo ? (
                                                                                            <span className="flex items-center gap-1.5 px-2 py-1 rounded bg-gray-100 text-gray-700 font-medium">
                                                                                                <span className="w-4 h-4 rounded-full bg-gray-300 flex items-center justify-center text-[9px] text-white">
                                                                                                    {task.assignedTo.charAt(0)}
                                                                                                </span>
                                                                                                {task.assignedTo}
                                                                                            </span>
                                                                                        ) : (
                                                                                            <span className="text-gray-400 font-medium">غير مسندة لأحد</span>
                                                                                        )}

                                                                                        {(effectiveRole === 'admin' || effectiveRole === 'manager') && onTaskAssign && !isCompleted && (
                                                                                            <select
                                                                                                className="text-xs border-gray-200 rounded p-1 max-w-[120px]"
                                                                                                value={task.assignedToId || ''}
                                                                                                onChange={(e) => onTaskAssign(task.id, e.target.value)}
                                                                                            >
                                                                                                <option value="">-- تعيين لعامل --</option>
                                                                                                {employees.filter(e => e.role === 'worker' || e.role === 'designer').map(emp => (
                                                                                                    <option key={emp.id} value={emp.id}>{emp.name}</option>
                                                                                                ))}
                                                                                            </select>
                                                                                        )}

                                                                                        {isInProgress && (
                                                                                            <span className="flex items-center gap-1 text-blue-600 font-bold bg-blue-50 px-2 py-1 rounded">
                                                                                                <Hourglass className="w-3 h-3" /> قيد العمل حالياً
                                                                                            </span>
                                                                                        )}
                                                                                    </div>
                                                                                )}

                                                                                {isLocked && previousTask && (
                                                                                    <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-400 mt-0.5">
                                                                                        <Lock className="w-3 h-3" />
                                                                                        مقفلة - بانتظار اكتمال: <span>{previousTask.title}</span>
                                                                                    </div>
                                                                                )}
                                                                            </div>

                                                                            {isCurrentActionableStep && canAct && (
                                                                                <div className="shrink-0 flex gap-2 w-full sm:w-auto mt-2 sm:mt-0">
                                                                                    {isPending && (
                                                                                        <button
                                                                                            onClick={() => onTaskAction(task.id, 'in_progress')}
                                                                                            className="w-full sm:w-auto px-5 py-2.5 text-sm font-bold rounded-xl bg-gray-900 text-white hover:bg-gray-800 transition-colors shadow-sm"
                                                                                        >
                                                                                            بدء المرحلة
                                                                                        </button>
                                                                                    )}
                                                                                    {isInProgress && (
                                                                                        <button
                                                                                            onClick={() => onTaskAction(task.id, 'completed')}
                                                                                            className="w-full sm:w-auto px-5 py-2.5 text-sm font-bold rounded-xl bg-emerald-500 text-white hover:bg-emerald-600 transition-colors shadow-sm flex items-center justify-center gap-2"
                                                                                        >
                                                                                            <CheckCircle2 className="w-4.5 h-4.5" />
                                                                                            إتمام المرحلة
                                                                                        </button>
                                                                                    )}
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            );
                        })() : (
                            <div className="bg-gray-50 rounded-2xl p-8 border border-dashed border-gray-200 flex flex-col items-center justify-center text-center">
                                <Info className="w-8 h-8 text-gray-300 mb-3" />
                                <h4 className="font-bold text-gray-900 mb-1">لا يوجد مسار إنتاج</h4>
                                <p className="text-sm text-gray-500 max-w-sm">سيتم توليد مراحل الإنتاج فور التأكيد على طلب التشغيل (Confirmed).</p>
                            </div>
                        )}
                    </section>
                </div>
            </div>
        </div>
    );
}
