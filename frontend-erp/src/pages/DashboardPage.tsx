import { useEffect, useMemo, useState } from 'react';
import {
  Package, ShoppingBag, DollarSign, CheckCircle, Clock, AlertCircle,
  ClipboardList, Users, Loader2, BarChart3, ArrowUpRight
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useOrdersStore } from '../store/ordersStore';
import { useTasksStore } from '../store/tasksStore';
import { useAuthStore } from '../store/authStore';
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

const taskTypeLabels: Record<string, string> = {
  design: 'تصميم',
  pre_press: 'Pre-press',
  screen_making: 'شاشات',
  printing: 'طباعة',
  quality_check: 'فحص جودة',
  packing: 'تغليف',
  shipping: 'شحن',
};

function taskIdOrOrderNumber(task: any) {
  return task.orderNumber || task.id?.split('-').pop() || '';
}

export default function DashboardPage() {
  const { user } = useAuthStore();
  const { orders, fetchOrders, isLoading: ordersLoading } = useOrdersStore();
  const { tasks, fetchTasks, isLoading: tasksLoading } = useTasksStore();


  const isLoading = ordersLoading || tasksLoading;

  const [expenses, setExpenses] = useState<any[]>([]);
  const [reworkLogs, setReworkLogs] = useState<any[]>([]);
  const [employeeStats, setEmployeeStats] = useState<any[]>([]);

  // Fetch data when user is available (re-runs after login when user.id changes)
  useEffect(() => {
    if (user?.id) {
      console.log('[Dashboard] Fetching orders and tasks for user:', user.id);
      fetchOrders();
      fetchTasks();

      // Fetch Details for Admin Net Profit, Equipment Health & Team Stats
      if (user?.role !== 'worker' && user?.role !== 'designer') {
        api.expenses.list().then(res => {
          if (res.success) setExpenses(res.data || []);
        });
        api.quality.listRework().then(res => {
          if (res.success) setReworkLogs(res.data || []);
        });
        api.dashboard.stats().then(res => {
          if (res.success) setEmployeeStats(res.data || []);
        }).catch(err => console.error('Dashboard stats error:', err));
      }
    }
  }, [user?.id]); // re-fetch when user changes (fixes post-login race condition)

  // If a worker or designer somehow ends up on the root route and App.tsx hasn't redirected yet, just show empty
  if (user?.role === 'worker' || user?.role === 'designer') {
    return null;
  }

  // ============================================================
  // === ADMIN / MANAGER DASHBOARD ==============================
  // ============================================================

  const totalOrders = orders.length;
  const pendingOrders = orders.filter(o => o.status === 'pending').length;
  const confirmedOrders = orders.filter(o => o.status === 'confirmed').length;
  const inProductionOrders = orders.filter(o => o.status === 'in_production').length;
  const readyOrders = orders.filter(o => o.status === 'ready').length;
  const deliveredOrders = orders.filter(o => o.status === 'delivered').length;

  const totalTasks = tasks.length;
  const inProgressTasks = tasks.filter(t => t.status === 'in_progress').length;
  const completedTasks = tasks.filter(t => t.status === 'completed').length;

  // Financial Math (True Net Profit - excluding shipping)
  const rawTotalRevenue = orders.reduce((sum, o) => sum + (o.total || 0), 0);
  const totalShippingCosts = orders.reduce((sum, o) => sum + (o.shipping || 0), 0);
  const totalRevenue = rawTotalRevenue - totalShippingCosts;

  const totalMaterialCosts = orders.reduce((sum, o) => sum + (o.material_cost || 0), 0);
  const totalOverheadExpenses = expenses.reduce((sum: number, exp: any) => sum + Number(exp.amount || 0), 0);
  const totalReworkLosses = reworkLogs.reduce((sum: number, log: any) => sum + Number(log.estimated_cost_loss || 0), 0);

  // To be mathematically rigorous for net cash flow, we should arguably only use delivered revenue.
  // But for the sake of the dashboard metric requested, we are combining total booked revenue - costs.
  const netProfit = totalRevenue - totalMaterialCosts - totalOverheadExpenses - totalReworkLosses;

  const recentOrders = useMemo(() =>
    [...orders].sort((a, b) => {
      const da = new Date(a.date || 0).getTime();
      const db = new Date(b.date || 0).getTime();
      return db - da;
    }).slice(0, 5),
    [orders]);

  const activeTasks = useMemo(() =>
    tasks
      .filter(t => t.status === 'pending' || t.status === 'in_progress')
      .slice(0, 5),
    [tasks]);

  // Task type distribution
  const tasksByType = useMemo(() => {
    const counts: Record<string, number> = {};
    tasks.forEach(t => {
      counts[t.type] = (counts[t.type] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([type, count]) => ({ type, count, label: taskTypeLabels[type] || type }))
      .sort((a, b) => b.count - a.count);
  }, [tasks]);

  // Production completion rate
  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  if (isLoading && totalOrders === 0 && totalTasks === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64" style={{ color: 'var(--text-muted)' }}>
        <Loader2 className="w-10 h-10 animate-spin mb-4" />
        <p>جاري تحميل بيانات لوحة التحكم...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight" style={{ color: 'var(--text-primary)' }}>لوحة التحكم</h1>
          <p className="text-sm mt-2" style={{ color: 'var(--text-muted)' }}>نظرة عامة ومؤشرات الأداء الرئيسية</p>
        </div>
        {isLoading && (
          <div className="flex items-center gap-2 px-4 py-2 surface-soft border border-soft rounded-full text-primary backdrop-blur-sm">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-xs font-medium">جاري التحديث...</span>
          </div>
        )}
      </div>

      {/* ADMIN/MANAGER: My Assigned Tasks */}
      {tasks.some(t => t.assignedToId === user?.id && t.status !== 'completed') && (
        <div className="card border border-purple-500/30 bg-gradient-to-r from-purple-500/10 to-transparent relative overflow-hidden">
          <div className="absolute left-0 top-0 w-1 h-full bg-purple-500"></div>
          <div className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="bg-purple-500/20 p-3 rounded-2xl border border-purple-500/20">
                <ClipboardList className="w-6 h-6 text-purple-400" />
              </div>
              <div>
                <h2 className="font-bold text-lg" style={{ color: 'var(--text-primary)' }}>مهامي ({tasks.filter(t => t.assignedToId === user?.id && t.status !== 'completed').length})</h2>
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>مهام تحتاج لتدخلك</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 flex-grow mx-4">
              {tasks.filter(t => t.assignedToId === user?.id && t.status !== 'completed').slice(0, 3).map(task => (
                <div key={task.id} className="flex items-center gap-2 px-3 py-1.5 surface-soft border border-soft rounded-full text-sm">
                  <span style={{ color: 'var(--text-secondary)' }}>{task.title}</span>
                  <span className={`w-2 h-2 rounded-full ${task.status === 'in_progress' ? 'bg-blue-400' : 'bg-yellow-400'}`}></span>
                </div>
              ))}
            </div>
            <Link to="/tasks" className="px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white text-sm font-medium rounded-xl transition-colors whitespace-nowrap">
              لوحة المهام
            </Link>
          </div>
        </div>
      )}

      {/* Top Main Stats (Bento Row 1) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="card p-6 relative overflow-hidden group min-h-[160px] flex flex-col justify-between">
          <div className="absolute -inset-2 bg-gradient-to-br from-blue-500/10 to-transparent opacity-0 group-hover:opacity-100 blur-2xl transition-opacity duration-500"></div>
          <div className="relative z-10 flex justify-between items-start">
            <div className="p-3 bg-blue-500/10 rounded-2xl border border-blue-500/20">
              <ShoppingBag className="w-6 h-6 text-blue-400" />
            </div>
            <Link to="/orders" className="transition-colors surface-soft p-2 rounded-xl" style={{ color: 'var(--text-muted)' }}>
              <ArrowUpRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="relative z-10 mt-4">
            <p className="text-xs font-medium mb-1 tracking-wide" style={{ color: 'var(--text-muted)' }}>إجمالي الطلبات</p>
            <p className="text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>{totalOrders}</p>
          </div>
        </div>

        <div className="card p-6 relative overflow-hidden group min-h-[160px] flex flex-col justify-between">
          <div className="absolute -inset-2 bg-gradient-to-br from-green-500/10 to-transparent opacity-0 group-hover:opacity-100 blur-2xl transition-opacity duration-500"></div>
          <div className="relative z-10 flex justify-between items-start">
            <div className="p-3 bg-green-500/10 rounded-2xl border border-green-500/20">
              <DollarSign className="w-6 h-6 text-green-400" />
            </div>
          </div>
          <div className="relative z-10 mt-4">
            <p className="text-xs font-medium mb-1 tracking-wide" style={{ color: 'var(--text-muted)' }}>صافي الأرباح</p>
            <div className="flex items-end gap-2">
              <p className={`text-3xl font-bold bg-clip-text text-transparent ${netProfit >= 0 ? 'bg-gradient-to-r from-green-400 to-emerald-300' : 'bg-gradient-to-r from-red-400 to-rose-300'}`}>
                {netProfit.toLocaleString()}
              </p>
              <span className="text-sm font-medium mb-1" style={{ color: 'var(--text-muted)' }}>دج</span>
            </div>
          </div>
        </div>

        <div className="card p-6 relative overflow-hidden group min-h-[160px] flex flex-col justify-between">
          <div className="absolute -inset-2 bg-gradient-to-br from-purple-500/10 to-transparent opacity-0 group-hover:opacity-100 blur-2xl transition-opacity duration-500"></div>
          <div className="relative z-10 flex justify-between items-start">
            <div className="p-3 bg-purple-500/10 rounded-2xl border border-purple-500/20">
              <Package className="w-6 h-6 text-purple-400" />
            </div>
          </div>
          <div className="relative z-10 mt-4">
            <p className="text-xs font-medium mb-1 tracking-wide" style={{ color: 'var(--text-muted)' }}>قيد الإنتاج</p>
            <p className="text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>{inProductionOrders}</p>
          </div>
        </div>

        <div className="card p-6 relative overflow-hidden group min-h-[160px] flex flex-col justify-between">
          <div className="absolute -inset-2 bg-gradient-to-br from-blue-400/10 to-transparent opacity-0 group-hover:opacity-100 blur-2xl transition-opacity duration-500"></div>
          <div className="relative z-10 flex justify-between items-start">
            <div className="p-3 bg-blue-400/10 rounded-2xl border border-blue-400/20">
              <DollarSign className="w-6 h-6 text-blue-400" />
            </div>
          </div>
          <div className="relative z-10 mt-4">
            <p className="text-xs font-medium mb-1 tracking-wide" style={{ color: 'var(--text-muted)' }}>الإيرادات</p>
            <div className="flex items-end gap-1">
              <p className="text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>{totalRevenue > 0 ? `${(totalRevenue / 1000).toFixed(1)}k` : '0'}</p>
              <span className="text-sm font-medium mb-1" style={{ color: 'var(--text-muted)' }}>دج</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bento Row 2: Pipeline & Progress */}
      <div className="grid lg:grid-cols-3 gap-6">

        {/* Order Status Pipeline */}
        <div className="card p-6 lg:col-span-2 flex flex-col relative overflow-hidden">
          <div className="absolute right-0 top-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -z-10"></div>
          <h2 className="text-base font-bold mb-6 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
            <BarChart3 className="w-5 h-5" style={{ color: 'var(--text-muted)' }} />
            حالة الطلبات
          </h2>

          <div className="flex-1 flex flex-col justify-center">
            <div className="flex items-stretch justify-between h-32 gap-3 relative">
              {/* Connecting Line Backdrop */}
              <div className="absolute top-1/2 left-4 right-4 h-1 surface-soft -translate-y-1/2 rounded-full -z-10"></div>

              {[
                { label: 'معلق', count: pendingOrders, color: 'from-amber-500 to-orange-400', glow: 'shadow-orange-500/20' },
                { label: 'مؤكد', count: confirmedOrders, color: 'from-blue-500 to-cyan-400', glow: 'shadow-blue-500/20' },
                { label: 'إنتاج', count: inProductionOrders, color: 'from-purple-500 to-fuchsia-400', glow: 'shadow-purple-500/20' },
                { label: 'جاهز', count: readyOrders, color: 'from-emerald-500 to-teal-400', glow: 'shadow-emerald-500/20' },
                { label: 'مسلّم', count: deliveredOrders, color: 'from-gray-500 to-slate-400', glow: 'shadow-gray-500/20' },
              ].map((item) => (
                <div key={item.label} className="relative flex-1 group">
                  <div className={`h-full surface-soft border border-soft rounded-2xl p-4 flex flex-col items-center justify-center transition-all duration-300 hover:-translate-y-1 shadow-lg ${item.count > 0 ? item.glow : ''}`}>
                    <p className={`text-3xl font-black bg-clip-text text-transparent bg-gradient-to-br border-b border-transparent pb-1 mb-1 ${item.color}`} style={{ backgroundImage: `linear-gradient(to bottom right, var(--tw-gradient-stops))` }}>
                      {item.count}
                    </p>
                    <p className="text-xs font-medium mt-2" style={{ color: 'var(--text-muted)' }}>{item.label}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Production Completion Gauge */}
        <div className="card p-6 flex flex-col items-center justify-center relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-t from-primary/5 to-transparent -z-10"></div>
          <h2 className="text-base font-bold mb-2 self-start w-full" style={{ color: 'var(--text-primary)' }}>نسبة الإنجاز</h2>
          <div className="flex-1 flex flex-col justify-center items-center">
            <div className="relative w-36 h-36">
              <svg className="w-full h-full -rotate-90 drop-shadow-xl" viewBox="0 0 36 36">
                {/* Background Track */}
                <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none" stroke="currentColor" strokeWidth="2.5" style={{ color: 'var(--bg-muted)' }} />
                {/* Progress Track */}
                <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none" stroke="currentColor" className="text-primary" strokeWidth="3"
                  strokeDasharray={`${completionRate}, 100`}
                  strokeLinecap="round" />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-4xl font-black" style={{ color: 'var(--text-primary)' }}>{completionRate}%</span>
              </div>
            </div>
            <div className="mt-6 flex items-center justify-center gap-6 w-full">
              <div className="text-center">
                <p className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>{completedTasks}</p>
                <p className="text-[10px] font-medium" style={{ color: 'var(--text-muted)' }}>مكتمل</p>
              </div>
              <div className="w-px h-8 self-center" style={{ backgroundColor: 'var(--border)' }}></div>
              <div className="text-center">
                <p className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>{inProgressTasks}</p>
                <p className="text-[10px] font-medium" style={{ color: 'var(--text-muted)' }}>جاري</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bento Row 3: Lists & Tables */}
      <div className="grid lg:grid-cols-2 gap-6">

        {/* Recent Orders */}
        <div className="card flex flex-col h-[420px]">
          <div className="p-5 flex items-center justify-between" style={{ borderBottom: '1px solid var(--border)' }}>
            <h2 className="text-base font-bold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
              <div className="p-1.5 rounded-lg" style={{ backgroundColor: 'var(--primary-soft-bg)', border: '1px solid var(--primary-soft-border)' }}>
                <ShoppingBag className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
              </div>
              أحدث الطلبات
            </h2>
            <Link to="/orders" className="text-xs flex items-center gap-1 transition-colors px-3 py-1.5 rounded-lg" style={{ color: 'var(--text-muted)', backgroundColor: 'var(--primary-soft-bg)' }}>
              عرض الكل <ArrowUpRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="flex-1 overflow-auto custom-scrollbar">
            {recentOrders.length > 0 ? (
              <table className="w-full text-left bg-transparent" dir="rtl">
                <thead className="sticky top-0 z-10 backdrop-blur-xl" style={{ backgroundColor: 'var(--table-header-bg)', borderBottom: '1px solid var(--border)' }}>
                  <tr>
                    <th className="p-4 text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>رقم الطلب</th>
                    <th className="p-4 text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>العميل</th>
                    <th className="p-4 text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>التقدم</th>
                    <th className="p-4 text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>الحالة</th>
                  </tr>
                </thead>
                <tbody style={{ borderColor: 'var(--border)' }} className="divide-y">
                  {recentOrders.map((order) => {
                    const status = getStatusBadge(order.status);
                    const totalT = order.tasks?.length || 0;
                    const completedT = order.tasks?.filter(t => t.status === 'completed').length || 0;
                    const progress = order.productionProgress || (totalT > 0 ? Math.round((completedT / totalT) * 100) : 0);
                    return (
                      <tr key={order.id} className="group transition-colors" onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--table-row-hover)'} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}>
                        <td className="p-4 text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>{order.id?.slice(0, 8)}...</td>
                        <td className="p-4 text-sm truncate max-w-[120px]" style={{ color: 'var(--text-muted)' }}>{
                          typeof order.customer === 'string'
                            ? order.customer
                            : order.customer?.name || '—'
                        }</td>
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-1.5 rounded-full overflow-hidden min-w-[60px]" style={{ backgroundColor: 'var(--bg-muted)' }}>
                              <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${progress}%` }} />
                            </div>
                            <span className="text-[10px] font-medium w-6" style={{ color: 'var(--text-muted)' }}>{progress}%</span>
                          </div>
                        </td>
                        <td className="p-4">
                          <span className={status.class}>
                            {status.label}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              <div className="h-full flex flex-col justify-center items-center text-sm" style={{ color: 'var(--text-disabled)' }}>
                <ShoppingBag className="w-12 h-12 mb-3 opacity-20" />
                <p>لا توجد طلبات بعد</p>
              </div>
            )}
          </div>
        </div>

        {/* Active Production Tasks */}
        <div className="card flex flex-col h-[420px]">
          <div className="p-5 flex items-center justify-between" style={{ borderBottom: '1px solid var(--border)' }}>
            <h2 className="text-base font-bold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
              <div className="p-1.5 rounded-lg" style={{ backgroundColor: 'var(--primary-soft-bg)', border: '1px solid var(--primary-soft-border)' }}>
                <ClipboardList className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
              </div>
              المهام النشطة
            </h2>
            <Link to="/tasks" className="text-xs flex items-center gap-1 transition-colors px-3 py-1.5 rounded-lg" style={{ color: 'var(--text-muted)', backgroundColor: 'var(--primary-soft-bg)' }}>
              لوحة المهام <ArrowUpRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="flex-1 overflow-auto custom-scrollbar p-5 space-y-3">
            {activeTasks.length > 0 ? (
              activeTasks.map((task) => (
                <div key={task.id} className="p-4 surface-soft border border-soft rounded-2xl transition-colors group">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <h3 className="font-semibold text-sm mb-1.5 truncate transition-colors" style={{ color: 'var(--text-secondary)' }}>{task.title}</h3>
                      <div className="flex items-center flex-wrap gap-x-3 gap-y-1 text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
                        <span className="px-2 py-0.5 surface-soft rounded-md border border-soft">{taskTypeLabels[task.type]}</span>
                        <span className="text-primary/80">ORD-{taskIdOrOrderNumber(task)}</span>
                        {task.assignedTo && (
                          <span className="flex items-center gap-1.5">
                            <Users className="w-3.5 h-3.5 opacity-70" />
                            {task.assignedTo}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {task.priority === 'high' && (
                        <div className="w-2 h-2 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)] animate-pulse"></div>
                      )}
                      {task.status === 'in_progress' ? (
                        <span className="flex items-center gap-1.5 text-blue-400 text-[11px] font-bold bg-blue-500/10 border border-blue-500/20 px-2.5 py-1 rounded-full">
                          <Clock className="w-3 h-3" /> جاري
                        </span>
                      ) : (
                        <span className="flex items-center gap-1.5 text-amber-400 text-[11px] font-bold bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-full">
                          <AlertCircle className="w-3 h-3" /> معلق
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="h-full flex flex-col justify-center items-center text-sm" style={{ color: 'var(--text-disabled)' }}>
                <CheckCircle className="w-12 h-12 mb-3 opacity-20" />
                <p>لا توجد مهام نشطة حالياً</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bento Row 4: Distros & Team */}
      <div className="grid lg:grid-cols-3 gap-6">

        {/* Task Type Distribution */}
        {tasksByType.length > 0 && (
          <div className="card p-6">
            <h2 className="text-sm font-bold mb-5 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
              <ClipboardList className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
              توزيع المهام
            </h2>
            <div className="flex flex-wrap gap-2.5">
              {tasksByType.map(item => (
                <div key={item.type} className="flex items-center gap-3 surface-soft border border-soft rounded-xl px-3 py-2 text-sm flex-grow">
                  <span className="font-medium mr-auto" style={{ color: 'var(--text-secondary)' }}>{item.label}</span>
                  <span className="bg-primary/20 text-primary-light text-xs font-black px-2.5 py-1 rounded-lg">{item.count}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Team Performance Stats */}
        {employeeStats.length > 0 && (
          <div className="card p-6 lg:col-span-2">
            <h2 className="text-sm font-bold mb-5 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
              <Users className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
              أداء الفريق (المهام)
            </h2>
            <div className="grid md:grid-cols-2 gap-4">
              {employeeStats.map(emp => (
                <div key={emp.id} className="surface-soft border border-soft rounded-2xl p-4 flex items-center justify-between group transition-colors">
                  <div className="flex flex-col">
                    <p className="font-bold text-sm" style={{ color: 'var(--text-secondary)' }}>{emp.name}</p>
                    <span className="text-[10px] font-medium mt-1 uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>{emp.role === 'worker' ? 'عامل' : 'مسؤول'}</span>
                  </div>
                  <div className="flex gap-4 text-center">
                    <div className="flex flex-col items-center">
                      <p className="text-lg font-black text-emerald-400">{emp.completedTasks}</p>
                      <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>مكتملة</p>
                    </div>
                    <div className="w-px h-8 self-center" style={{ backgroundColor: 'var(--border)' }}></div>
                    <div className="flex flex-col items-center">
                      <p className="text-lg font-black text-blue-400">{emp.inProgressTasks}</p>
                      <p className="text-[10px] mt-0.5" style={{ color: 'var(--text-muted)' }}>جارية</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="h-8"></div> {/* Bottom Padding spacer */}
    </div>
  );
}
