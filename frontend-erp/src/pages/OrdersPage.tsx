import { useState, useEffect } from 'react';
import { Search, Eye, RefreshCw, Plus } from 'lucide-react';
import OrderDetailModal from './OrderDetailModal';
import OrderCreationModal from './OrderCreationModal';
import toast from 'react-hot-toast';
import { useOrdersStore } from '../store/ordersStore';
import { api } from '../services/api';

const getStatusBadge = (status: string) => {
  const badges: Record<string, string> = {
    pending: 'badge badge-warning',
    confirmed: 'badge badge-info',
    in_production: 'badge badge-primary',
    ready: 'badge badge-success',
    delivered: 'badge badge-muted',
  };
  const labels: Record<string, string> = {
    pending: 'معلق',
    confirmed: 'مؤكد',
    in_production: 'قيد التنفيذ',
    ready: 'جاهز',
    delivered: 'تم التسليم',
  };
  return { class: badges[status] || 'badge badge-muted', label: labels[status] || status };
};

export default function OrdersPage() {
  const { orders, updateOrder, fetchOrders, isLoading } = useOrdersStore();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Fetch orders on mount
  useEffect(() => {
    fetchOrders();

    // Auto refresh every 10 seconds
    const interval = setInterval(fetchOrders, 10000);
    return () => clearInterval(interval);
  }, [fetchOrders]);

  const handleViewOrder = (order: any) => {
    setSelectedOrder(order);
    setIsModalOpen(true);
  };

  const handleConfirmOrder = (orderId: string) => {
    // Task generation is now handled inside OrderDetailModal -> TaskCustomizationModal
    // We just need this callback to close any auxiliary state if needed, but currently it's handled by the modal.
    // We can also trigger a refresh if we want to be extra safe, although store does it.
    console.log('Order confirmed:', orderId);
  };

  const handleStatusChange = async (orderId: string, newStatus: string) => {
    const progressMap: Record<string, number> = {
      pending: 0,
      confirmed: 0,
      in_production: 50,
      ready: 100,
      delivered: 100,
    };

    // Update local state
    updateOrder(orderId, {
      status: newStatus as any,
      productionProgress: progressMap[newStatus] || 0,
    });

    // Sync to backend API so tracking page sees updates
    try {
      await api.orders.updateStatus(orderId, newStatus);
    } catch (error) {
      console.error('Failed to sync order status to backend:', error);
    }

    toast.success(`تم تحديث حالة الطلب إلى: ${getStatusBadge(newStatus).label}`);
  };

  const handleRefresh = async () => {
    await fetchOrders();
    toast.success('تم تحديث الطلبات');
  };

  const filteredOrders = orders.filter(order => {
    const customerName = typeof order.customer === 'string'
      ? order.customer
      : order.customer?.name || '';
    const matchesSearch = customerName.includes(search) || (order.orderNumber || order.id).includes(search);
    const matchesStatus = !statusFilter || order.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Sort orders by date (newest first)
  const sortedOrders = [...filteredOrders].sort((a, b) =>
    new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>الطلبات</h1>
        <div className="flex gap-3">
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="btn btn-primary flex items-center gap-2 text-sm"
          >
            <Plus className="w-4 h-4" />
            طلب جديد
          </button>
          <button
            onClick={handleRefresh}
            disabled={isLoading}
            className="btn btn-secondary flex items-center gap-2 text-sm"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            {isLoading ? 'جاري التحديث...' : 'تحديث'}
          </button>
        </div>
      </div>

      <div className="card">
        <div className="p-4 border-b flex flex-wrap gap-4">
          <div className="relative max-w-md flex-1">
            <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5" style={{ color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="بحث عن طلب..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input pr-12"
            />
          </div>
          <select
            className="input w-auto"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">جميع الحالات</option>
            <option value="pending">معلق</option>
            <option value="confirmed">مؤكد</option>
            <option value="in_production">قيد التنفيذ</option>
            <option value="ready">جاهز</option>
            <option value="shipped">تم الشحن</option>
            <option value="delivered">تم التسليم</option>
            <option value="cancelled">ملغى</option>
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead style={{ backgroundColor: 'var(--table-header-bg)' }}>
              <tr>
                <th className="text-right p-4 text-sm font-medium" style={{ color: 'var(--table-header-text)' }}>رقم الطلب</th>
                <th className="text-right p-4 text-sm font-medium" style={{ color: 'var(--table-header-text)' }}>المصدر</th>
                <th className="text-right p-4 text-sm font-medium" style={{ color: 'var(--table-header-text)' }}>العميل</th>
                <th className="text-right p-4 text-sm font-medium" style={{ color: 'var(--table-header-text)' }}>المنتجات</th>
                <th className="text-right p-4 text-sm font-medium" style={{ color: 'var(--table-header-text)' }}>المجموع</th>
                <th className="text-right p-4 text-sm font-medium" style={{ color: 'var(--info)', backgroundColor: 'var(--info-bg)' }}>تكلفة المواد</th>
                <th className="text-right p-4 text-sm font-medium" style={{ color: 'var(--success)', backgroundColor: 'var(--success-bg)' }}>الهامش (Margin)</th>
                <th className="text-right p-4 text-sm font-medium" style={{ color: 'var(--table-header-text)' }}>التقدم</th>
                <th className="text-right p-4 text-sm font-medium" style={{ color: 'var(--table-header-text)' }}>المهام</th>
                <th className="text-right p-4 text-sm font-medium" style={{ color: 'var(--table-header-text)' }}>الحالة</th>
                <th className="text-right p-4 text-sm font-medium" style={{ color: 'var(--table-header-text)' }}>التاريخ</th>
                <th className="text-right p-4 text-sm font-medium" style={{ color: 'var(--table-header-text)' }}>إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {sortedOrders.map((order) => {
                const status = getStatusBadge(order.status);
                const completedTasks = order.tasks?.filter((t) => t.status === 'completed').length || 0;
                const totalTasks = order.tasks?.length || 0;

                return (
                  <tr key={order.id} className="last:border-0" style={{ borderBottom: '1px solid var(--table-border)', backgroundColor: 'var(--table-row-bg)' }} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--table-row-hover)'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--table-row-bg)'}>
                    <td className="p-4 font-medium" style={{ color: 'var(--table-cell-primary)' }}>{order.orderNumber || order.id}</td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${order.source === 'storefront'
                        ? 'badge badge-info'
                        : 'badge badge-muted'
                        }`}>
                        {order.source === 'storefront' ? 'متجر' : 'نظام'}
                      </span>
                    </td>
                    <td className="p-4">{
                      typeof order.customer === 'string'
                        ? order.customer
                        : order.customer?.name || '—'
                    }</td>
                    <td className="p-4" style={{ color: 'var(--table-cell-primary)' }}>{order.items.length} منتج</td>
                    <td className="p-4 font-bold" style={{ color: 'var(--table-cell-primary)' }}>{order.total?.toLocaleString() || 0} دج</td>
                    <td className="p-4 font-medium" style={{ color: 'var(--info)' }}>{order.material_cost?.toLocaleString() || 0} دج</td>
                    <td className="p-4 font-bold" style={{ color: 'var(--success)' }}>{order.gross_margin?.toLocaleString() || 0} دج</td>
                    <td className="p-4">
                      <div className="w-24">
                        <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--bg-muted)' }}>
                          <div
                            className="h-full rounded-full"
                            style={{ width: `${order.productionProgress || 0}%`, backgroundColor: 'var(--primary)' }}
                          />
                        </div>
                        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{order.productionProgress || 0}%</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                        {totalTasks > 0 ? `${completedTasks}/${totalTasks}` : '—'}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className={status.class}>
                        {status.label}
                      </span>
                    </td>
                    <td className="p-4" style={{ color: 'var(--text-muted)' }}>{order.date}</td>
                    <td className="p-4">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleViewOrder(order)}
                          className="p-2 rounded-lg transition-colors"
                          style={{ color: 'var(--info)' }}
                          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--info-bg)'}
                          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                          title="عرض التفاصيل"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {sortedOrders.length === 0 && (
          <div className="p-8 text-center" style={{ color: 'var(--text-muted)' }}>
            <p>لا توجد طلبات</p>
          </div>
        )}
      </div>

      {/* Order Detail Modal */}
      {isModalOpen && selectedOrder && (
        <OrderDetailModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setSelectedOrder(null);
          }}
          order={selectedOrder}
          onStatusChange={handleStatusChange}
          onConfirm={handleConfirmOrder}
        />
      )}

      {isCreateModalOpen && (
        <OrderCreationModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          onSuccess={() => {
            fetchOrders();
          }}
        />
      )}
    </div>
  );
}
