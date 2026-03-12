import { useState, useMemo, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { Search, RefreshCw, LayoutGrid, List } from 'lucide-react';
import { useOrdersStore, Order, Task } from '../store/ordersStore';
import { useTasksStore } from '../store/tasksStore';
import ProductionOrderCard from '../components/production/ProductionOrderCard';
import ProductionOrderModal from '../components/production/ProductionOrderModal';
import toast from 'react-hot-toast';

// Macro Stages for the Order-Centric Board (Notion Style Colors)
const MACRO_STAGES: { id: Order['status']; title: string; color: string }[] = [
    { id: 'confirmed', title: 'مؤكد (بانتظار المهام)', color: 'border-t-gray-400 text-gray-700' },
    { id: 'in_production', title: 'قيد الإنتاج', color: 'border-t-blue-500 text-blue-700' },
    { id: 'ready', title: 'جاهز (بانتظار الشحن)', color: 'border-t-emerald-500 text-emerald-700' },
    { id: 'shipped', title: 'تم الشحن', color: 'border-t-purple-500 text-purple-700' }
];

export default function ProductionBoardPage() {
    const { orders, fetchOrders, updateOrder, updateTaskStatus, isLoading } = useOrdersStore();
    // We still need tasksStore.fetchTasks to sync active completion flows like Strict Mode
    const { fetchTasks } = useTasksStore();

    const [search, setSearch] = useState('');
    const [viewMode, setViewMode] = useState<'kanban' | 'list'>(window.innerWidth < 1024 ? 'list' : 'kanban');
    const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

    // Poll for live data
    useEffect(() => {
        fetchOrders();
        fetchTasks();

        // Auto-adjust view mode based on screen size changes
        const handleResize = () => {
            if (window.innerWidth < 1024 && viewMode === 'kanban') setViewMode('list');
            if (window.innerWidth >= 1024 && viewMode === 'list') setViewMode('kanban');
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Filter out pending (unconfirmed), completed, or cancelled orders
    const activeOrders = useMemo(() => {
        let filtered = orders.filter(
            (o) => o.status === 'confirmed' || o.status === 'in_production' || o.status === 'ready' || o.status === 'shipped'
        );

        if (search) {
            filtered = filtered.filter(
                (o) =>
                    o.orderNumber.toLowerCase().includes(search.toLowerCase()) ||
                    (typeof o.customer === 'string' ? o.customer : o.customer?.name || '').toLowerCase().includes(search.toLowerCase())
            );
        }
        return filtered;
    }, [orders, search]);

    const ordersByStage = useMemo(() => {
        const grouped: Record<string, Order[]> = { confirmed: [], in_production: [], ready: [], shipped: [] };
        activeOrders.forEach((order) => {
            // Fallback: If an order has tasks in progress but status is somehow still 'confirmed', push it to 'in_production' visually
            const hasActiveTasks = order.tasks?.some(t => t.status === 'in_progress' || (t.status === 'completed' && order.productionProgress < 100));
            let stage = order.status;
            if (stage === 'confirmed' && hasActiveTasks) stage = 'in_production';

            if (grouped[stage]) {
                grouped[stage].push(order);
            }
        });
        return grouped;
    }, [activeOrders]);

    const onDragEnd = async (result: DropResult) => {
        if (!result.destination) return;
        const sourceId = result.source.droppableId;
        const destinationId = result.destination.droppableId;
        if (sourceId === destinationId) return;

        const orderId = result.draggableId;

        // Safety check: Don't allow manual dragging of actively producing orders unless overriding
        const order = activeOrders.find(o => o.id === orderId);
        if (order && order.productionProgress > 0 && order.productionProgress < 100 && destinationId === 'ready') {
            toast.error('لا يمكن نقل الطلب إلى "جاهز" وهناك مهام إنتاج غير مكتملة.');
            return;
        }

        try {
            await updateOrder(orderId, { status: destinationId as any });
            toast.success('تم تحديث حالة الطلب بنجاح');
        } catch (e) {
            toast.error('فشل تحديث المرحلة');
        }
    };

    const handleTaskAction = async (taskId: string, newStatus: Task['status']) => {
        if (!selectedOrder) return;

        // Call strict update via ordersStore (which syncs to tasks API)
        await updateTaskStatus(selectedOrder.id, taskId, newStatus);

        // Refresh modal local state by finding updated order
        const refreshed = useOrdersStore.getState().orders.find(o => o.id === selectedOrder.id);
        if (refreshed) setSelectedOrder(refreshed);

        if (newStatus === 'completed') {
            toast.success('تم إتمام المهمة والمزامنة بنجاح');
        }
    };

    const handleTaskAssign = async (taskId: string, userId: string) => {
        if (!selectedOrder) return;

        await useOrdersStore.getState().assignTask(selectedOrder.id, taskId, userId);

        // Refresh modal local state by finding updated order
        const refreshed = useOrdersStore.getState().orders.find(o => o.id === selectedOrder.id);
        if (refreshed) setSelectedOrder(refreshed);

        toast.success('تم إسناد المهمة بنجاح');
    };

    return (
        <div className="flex flex-col h-full" style={{ backgroundColor: 'var(--kanban-board-bg)' }}>
            {/* Header & Controls */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div>
                    <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
                        لوحة خطوط الإنتاج (Work Orders)
                    </h1>
                    <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>إدارة أوامر التشغيل الصناعية وتتبع سير المهام داخل كل طلب</p>
                </div>

                <div className="flex items-center gap-2">
                    <div className="rounded-lg shadow-sm p-1 flex" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                        <button
                            onClick={() => setViewMode('kanban')}
                            className={`p-1.5 rounded-md ${viewMode === 'kanban' ? 'text-primary' : ''}`}
                            style={viewMode === 'kanban' ? { backgroundColor: 'var(--primary-soft-bg)' } : { color: 'var(--text-muted)' }}
                            title="عرض مقسم"
                        >
                            <LayoutGrid className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => setViewMode('list')}
                            className={`p-1.5 rounded-md ${viewMode === 'list' ? 'text-primary' : ''}`}
                            style={viewMode === 'list' ? { backgroundColor: 'var(--primary-soft-bg)' } : { color: 'var(--text-muted)' }}
                            title="عرض القائمة"
                        >
                            <List className="w-4 h-4" />
                        </button>
                    </div>
                    <button
                        onClick={() => fetchOrders()}
                        disabled={isLoading}
                        className="btn btn-secondary flex items-center gap-2"
                    >
                        <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                        <span className="hidden sm:inline">تحديث</span>
                    </button>
                </div>
            </div>

            {/* Filters */}
            <div className="rounded-xl shadow-sm p-4 mb-6 flex flex-wrap gap-4" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                <div className="relative min-w-[280px] flex-1 max-w-md">
                    <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5" style={{ color: 'var(--text-muted)' }} />
                    <input
                        type="text"
                        placeholder="بحث برقم الطلب أو اسم العميل..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="input pr-12 w-full"
                    />
                </div>
            </div>

            {/* Main Board View */}
            {viewMode === 'kanban' ? (
                <DragDropContext onDragEnd={onDragEnd}>
                    <div className="flex gap-6 overflow-x-auto pb-6 flex-1 items-start snap-x px-2">
                        {MACRO_STAGES.map((stage) => (
                            <div key={stage.id} className="flex-shrink-0 w-[340px] lg:w-[380px] flex flex-col max-h-full snap-center">
                                {/* Header Notion Style */}
                                <div className={`pb-3 border-t-4 ${stage.color} flex items-center justify-between mb-4 mt-1`}>
                                    <h3 className="font-bold text-base tracking-tight">{stage.title}</h3>
                                    <span className="text-sm font-semibold px-2 py-0.5 rounded-md" style={{ color: 'var(--text-muted)', backgroundColor: 'var(--bg-muted)' }}>
                                        {ordersByStage[stage.id]?.length || 0}
                                    </span>
                                </div>
                                <Droppable droppableId={stage.id}>
                                    {(provided, snapshot) => (
                                        <div
                                            ref={provided.innerRef}
                                            {...provided.droppableProps}
                                            className={`flex-1 min-h-[400px] rounded-xl transition-colors overflow-y-auto px-1 ${snapshot.isDraggingOver ? 'bg-primary/5 ring-2 ring-primary/20 ring-inset' : 'bg-transparent'
                                                }`}
                                        >
                                            <div className="space-y-4 pb-4 mt-1">
                                                {ordersByStage[stage.id]?.map((order, index) => (
                                                    <Draggable key={order.id} draggableId={order.id} index={index}>
                                                        {(provided, snapshot) => (
                                                            <div ref={provided.innerRef} {...provided.draggableProps} {...provided.dragHandleProps} className="outline-none">
                                                                <ProductionOrderCard order={order} onClick={setSelectedOrder} isDragging={snapshot.isDragging} />
                                                            </div>
                                                        )}
                                                    </Draggable>
                                                ))}
                                                {provided.placeholder}
                                            </div>
                                            {ordersByStage[stage.id]?.length === 0 && !snapshot.isDraggingOver && (
                                                <div className="h-32 flex flex-col items-center justify-center rounded-xl m-1 opacity-60" style={{ color: 'var(--text-disabled)', border: '2px dashed var(--kanban-drag-border)' }}>
                                                    <span className="text-sm font-medium">اسحب طلبات إلى هنا</span>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </Droppable>
                            </div>
                        ))}
                    </div>
                </DragDropContext>
            ) : (
                /* Mobile-Friendly Accordion/List View (Notion Style) */
                <div className="space-y-8 pb-8 px-2">
                    {MACRO_STAGES.map((stage) => {
                        const stageOrders = ordersByStage[stage.id] || [];
                        if (stageOrders.length === 0) return null;

                        // Mobile List Color Mapping Strategy
                        let listHeaderColor = '';
                        switch (stage.id) {
                            case 'confirmed': listHeaderColor = 'badge-muted'; break;
                            case 'in_production': listHeaderColor = 'badge-info'; break;
                            case 'ready': listHeaderColor = 'badge-success'; break;
                            case 'shipped': listHeaderColor = 'badge-primary'; break;
                        }

                        return (
                            <div key={stage.id} className="bg-transparent">
                                <div className={`px-4 py-2.5 rounded-lg mb-4 flex justify-between items-center sticky top-0 z-10 font-bold ${listHeaderColor}`}>
                                    <h3>{stage.title}</h3>
                                    <span className="bg-white/80 px-2 py-0.5 rounded-md text-sm">{stageOrders.length}</span>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {stageOrders.map(order => (
                                        <ProductionOrderCard key={order.id} order={order} onClick={setSelectedOrder} />
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Render the Slide-over/Modal when an Order is clicked */}
            {selectedOrder && (
                <ProductionOrderModal
                    order={selectedOrder}
                    onClose={() => setSelectedOrder(null)}
                    onTaskAction={handleTaskAction}
                    onTaskAssign={handleTaskAssign}
                />
            )}
        </div>
    );
}
