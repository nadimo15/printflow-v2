import { AlertTriangle, CheckCircle2, Clock } from 'lucide-react';
import type { Order } from '../../store/ordersStore';
import clsx from 'clsx';

interface ProductionOrderCardProps {
    order: Order;
    onClick: (order: Order) => void;
    isDragging?: boolean;
}

export default function ProductionOrderCard({ order, onClick, isDragging }: ProductionOrderCardProps) {
    const completedTasks = order.tasks.filter((t) => t.status === 'completed').length;
    const totalTasks = order.tasks.length;
    const progressPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    // Warning logic: missing inventory or empty tasks when it shouldn't be
    const hasWarning = order.status === 'pending' && totalTasks === 0;

    // Get active task (first non-completed task)
    const activeTask = order.tasks.find((t) => t.status !== 'completed');

    // Customer name logic
    const customerName = typeof order.customer === 'string'
        ? order.customer
        : order.customer?.name || order.customer?.guest_info?.name || 'عميل غير معروف';

    // Calculate total items quantity
    const totalQuantity = order.items.reduce((sum, item) => sum + item.quantity, 0);
    const itemsCount = order.items.length;

    // Determine status color/dot
    const isCompleted = progressPercent === 100 && totalTasks > 0;
    const statusColor = isCompleted ? 'bg-emerald-500' : (totalTasks > 0 ? 'bg-primary' : 'bg-gray-400');

    return (
        <div
            onClick={() => onClick(order)}
            className={clsx(
                "group relative bg-white rounded-lg p-4 text-left transition-all duration-200 cursor-pointer",
                isDragging
                    ? "shadow-2xl ring-2 ring-primary/50 rotate-1 scale-[1.02] z-10"
                    : "shadow-sm border border-gray-100 hover:shadow-md hover:border-gray-200"
            )}
            dir="rtl"
        >
            {/* Minimal Header */}
            <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                    {/* Status Dot */}
                    <div className={clsx("w-2 h-2 rounded-full", statusColor)} />
                    <span className="text-sm font-semibold text-gray-900 tracking-tight">
                        {order.orderNumber}
                    </span>
                </div>
                {hasWarning && (
                    <div className="text-rose-500 tooltip" title="تحذير: قد يكون هناك نقص في المخزون">
                        <AlertTriangle className="w-4 h-4" />
                    </div>
                )}
            </div>

            {/* Body: Clean Summary */}
            <div className="mb-4">
                <h3 className="text-gray-800 font-medium truncate mb-1" title={customerName}>
                    {customerName}
                </h3>
                <div className="text-xs text-gray-500 flex items-center gap-1.5 font-medium">
                    <span className="truncate max-w-[120px]">
                        {itemsCount > 1 ? `${itemsCount} منتجات` : order.items[0]?.name || 'منتج غير معروف'}
                    </span>
                    <span className="text-gray-300">•</span>
                    <span>{totalQuantity.toLocaleString()} قطعة</span>
                </div>
            </div>

            {/* Footer: Timeline & Progress */}
            <div className="mt-auto">
                {/* Active Task Status */}
                <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1.5 text-[11px] font-medium text-gray-500">
                        {activeTask ? (
                            <>
                                <Clock className="w-3.5 h-3.5 text-blue-500" />
                                <span className="text-gray-700 truncate max-w-[120px]">{activeTask.title}</span>
                            </>
                        ) : isCompleted ? (
                            <>
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                                <span className="text-emerald-700">مكتمل وجاهز</span>
                            </>
                        ) : (
                            <span className="text-gray-400">بانتظار إنشاء المهام</span>
                        )}
                    </div>
                </div>

                {/* Elegant Linear-style Progress Bar */}
                <div className="relative h-1 w-full bg-gray-100 rounded-full overflow-hidden">
                    <div
                        className={clsx(
                            "absolute top-0 right-0 h-full rounded-full transition-all duration-700 ease-out",
                            isCompleted ? "bg-emerald-500" : "bg-primary"
                        )}
                        style={{ width: `${progressPercent}%` }}
                    />
                </div>
            </div>
        </div>
    );
}
