import { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { Search, Package, CheckCircle, Box, Clock, AlertCircle, Eye, ArrowDownToLine } from 'lucide-react';
import { motion } from 'framer-motion';
import { api } from '../services/api';
import toast from 'react-hot-toast';
import { useSiteConfig } from '../hooks/useSiteConfig';
import { handleViewFile, handleDownloadFile } from '../utils/fileViewer';

const ICON_MAP: Record<string, any> = { Clock, CheckCircle, Package, Box, AlertCircle };

export default function OrderTrackingPage() {
  const { config } = useSiteConfig();
  const tConfig = config.tracking;

  const defaultSteps = [
    { id: 'ts1', key: 'pending', label: 'معلّق', icon: 'Clock', instruction: 'سيتم مراجعة طلبك والتواصل معك لتأكيده.' },
    { id: 'ts2', key: 'confirmed', label: 'مؤكد', icon: 'CheckCircle', instruction: 'تم تأكيد طلبك وسيدخل في مرحلة الإنتاج قريباً.' },
    { id: 'ts3', key: 'in_production', label: 'قيد التنفيذ', icon: 'Package', instruction: 'طلبك الآن قيد التصنيع.' },
    { id: 'ts4', key: 'ready', label: 'جاهز', icon: 'Box', instruction: 'طلبك جاهز للتسليم أو الشحن.' },
    { id: 'ts5', key: 'delivered', label: 'التسليم', icon: 'CheckCircle', instruction: 'تم تسليم طلبك بنجاح.' },
  ];

  const steps = tConfig?.steps?.length > 0 ? tConfig.steps : defaultSteps;

  const getStatusIndex = (status: string) => {
    const idx = steps.findIndex((s: any) => s.key === status);
    return idx === -1 ? 0 : idx;
  };

  const getStepInstruction = (status: string) => {
    const step = steps.find((s: any) => s.key === status);
    return step?.instruction || '';
  };

  const { orderNumber: urlOrderNumber } = useParams();
  const [searchParams] = useSearchParams();
  const [orderNumber, setOrderNumber] = useState(urlOrderNumber || '');
  const [phone, setPhone] = useState(searchParams.get('phone') || '');
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const [pendingDesignTasks, setPendingDesignTasks] = useState<any[]>([]);
  const [approvingTaskId, setApprovingTaskId] = useState<string | null>(null);

  useEffect(() => {
    if (urlOrderNumber) {
      setLoading(true);
      api.orders.track(urlOrderNumber)
        .then((response: any) => {
          if (response.success && response.data) {
            const o = response.data;
            setOrder({
              id: o.id,
              orderNumber: o.order_number || o.id,
              customer: o.guest_info?.name || '',
              phone: o.guest_info?.phone || '',
              wilaya: o.shipping_address?.wilaya || '',
              address: o.shipping_address?.address || '',
              total: parseFloat(o.total) || 0,
              status: o.status || 'pending',
              date: o.created_at ? o.created_at.split('T')[0] : '',
              items: (o.order_items || []).map((item: any) => ({
                name: item.name || 'Unknown',
                quantity: item.quantity || 1,
                price: parseFloat(item.unit_price) || 0,
              })),
              productionProgress: o.production_progress || 0,
              notes: o.notes,
            });

            api.orders.getPendingDesignTasks(o.id).then((tasksRes: any) => {
              if (tasksRes.success) setPendingDesignTasks(tasksRes.data || []);
            }).catch(() => { });
          }
        })
        .catch(() => { })
        .finally(() => setLoading(false));
    }
  }, [urlOrderNumber]);

  const handleTrack = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderNumber.trim() || !phone.trim()) {
      toast.error('يرجى إدخال رقم الطلب ورقم الهاتف');
      return;
    }

    setLoading(true);
    try {
      const response = await api.orders.track(orderNumber.trim());
      if (response.success && response.data) {
        const o = response.data;
        const orderPhone = o.guest_info?.phone || o.shipping_address?.phone || '';
        if (orderPhone && orderPhone !== phone.trim()) {
          toast.error('لم يتم العثور على الطلب. تأكد من رقم الطلب ورقم الهاتف');
          setOrder(null);
          setLoading(false);
          return;
        }
        setOrder({
          id: o.id,
          orderNumber: o.order_number || o.id,
          customer: o.guest_info?.name || '',
          phone: orderPhone,
          wilaya: o.shipping_address?.wilaya || '',
          address: o.shipping_address?.address || '',
          total: parseFloat(o.total) || 0,
          status: o.status || 'pending',
          date: o.created_at ? o.created_at.split('T')[0] : '',
          items: (o.order_items || []).map((item: any) => ({
            name: item.name || 'Unknown',
            quantity: item.quantity || 1,
            price: parseFloat(item.unit_price) || 0,
          })),
          productionProgress: o.production_progress || 0,
          notes: o.notes,
        });

        const tasksRes = await api.orders.getPendingDesignTasks(o.id);
        if (tasksRes.success) setPendingDesignTasks(tasksRes.data || []);
      } else {
        toast.error('لم يتم العثور على الطلب');
        setOrder(null);
      }
    } catch (error) {
      toast.error('حدث خطأ');
      setOrder(null);
    } finally {
      setLoading(false);
    }
  };

  const handleDesignApproval = async (taskId: string, response: 'approved' | 'rejected') => {
    let notes = '';
    if (response === 'rejected') {
      const userNotes = prompt('يرجى كتابة سبب الرفض أو التعديلات المطلوبة (مطلوب):');
      if (!userNotes || !userNotes.trim()) {
        toast.error('يجب كتابة سبب الرفض');
        return;
      }
      notes = userNotes.trim();
    }

    setApprovingTaskId(taskId);
    try {
      const res = await api.orders.respondToDesignApproval(taskId, response, notes);
      if (res.success) {
        toast.success(response === 'approved' ? 'تم اعتماد التصميم' : 'تم إرسال طلب التعديل');
        setPendingDesignTasks(prev => prev.filter(t => t.id !== taskId));
      } else {
        toast.error('حدث خطأ');
      }
    } catch (error) {
      toast.error('فشل الاتصال الخادم');
    } finally {
      setApprovingTaskId(null);
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden bg-surface-darker pt-32 pb-16">
      <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none mix-blend-overlay"></div>
      <div className="blob-purple w-[600px] h-[600px] top-[-100px] left-[-100px] opacity-20 mix-blend-screen" />
      <div className="blob-purple w-[800px] h-[800px] bottom-[-200px] right-[-200px] opacity-10 mix-blend-screen" />

      <div className="max-w-4xl mx-auto px-4 relative z-10">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-white mb-4">{tConfig?.title || 'تتبع طلبك'}</h1>
          <p className="text-gray-400 text-lg">{tConfig?.description || 'أدخل تفاصيل الطلب لمعرفة حالة الإنتاج والتوصيل'}</p>
        </div>

        {/* Search */}
        <form onSubmit={handleTrack} className="mb-16">
          <div className="flex flex-col md:flex-row gap-4 glass-card p-4 md:p-3 rounded-2xl md:rounded-full bg-surface-dark border-white/10 shadow-2xl">
            <input type="text" placeholder="رقم الطلب (مثال: PF260215-9908)" value={orderNumber} onChange={(e) => setOrderNumber(e.target.value.toUpperCase())} className="px-6 py-4 flex-1 text-lg bg-transparent border-none text-white placeholder:text-gray-600 focus:outline-none focus:ring-0" required />
            <div className="hidden md:block w-px h-8 bg-white/10 my-auto self-center"></div>
            <input type="tel" placeholder="رقم الهاتف *" value={phone} onChange={(e) => setPhone(e.target.value)} className="px-6 py-4 flex-1 text-lg bg-transparent border-none text-white placeholder:text-gray-600 focus:outline-none focus:ring-0" required />
            <button type="submit" disabled={loading} className="btn-primary px-10 py-4 rounded-xl md:rounded-full text-lg whitespace-nowrap shadow-[0_0_20px_rgba(138,77,204,0.4)] transform hover:scale-105 active:scale-95 transition-all">
              <Search className="w-5 h-5" />
              {loading ? 'جاري البحث...' : 'بحث'}
            </button>
          </div>
        </form>

        {/* Order Details */}
        {order && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">

            {/* Header */}
            <div className="glass-card rounded-3xl p-8 border-white/10 bg-surface-dark relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-pakomi-purple/10 rounded-full blur-3xl -mr-16 -mt-16"></div>

              <div className="flex flex-wrap items-center justify-between mb-10 gap-6 relative z-10">
                <div>
                  <p className="text-gray-500 text-sm font-medium mb-1">رقم الطلب</p>
                  <p className="text-3xl font-bold text-white tracking-tight">{order.orderNumber}</p>
                </div>
                <div className="text-right">
                  <p className="text-gray-500 text-sm font-medium mb-1">تاريخ الطلب</p>
                  <p className="font-bold text-gray-200 text-lg">{order.date}</p>
                </div>
                <div className="text-right">
                  <p className="text-gray-500 text-sm font-medium mb-1">الإجمالي</p>
                  <p className="text-3xl font-bold text-pakomi-glow tracking-tight">{order.total.toLocaleString()} دج</p>
                </div>
              </div>

              {/* Status Timeline */}
              <div className="relative mb-6 mt-6">
                <div className="absolute top-7 left-0 right-0 h-1.5 bg-white/5 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-pakomi-purple to-pakomi-glow transition-all duration-1000 ease-out shadow-[0_0_10px_rgba(138,77,204,0.5)]" style={{ width: `${(getStatusIndex(order.status) / (steps.length - 1)) * 100}%` }} />
                </div>
                <div className="relative flex justify-between">
                  {steps.map((step: any, index: number) => {
                    const isCompleted = index <= getStatusIndex(order.status);
                    const isCurrent = index === getStatusIndex(order.status);
                    const Icon = ICON_MAP[step.icon] || Clock;
                    return (
                      <div key={step.key} className="flex flex-col items-center">
                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center border-2 transition-all duration-500 shadow-xl z-10 ${isCurrent ? 'bg-pakomi-purple border-pakomi-glow text-white scale-110 shadow-[0_0_20px_rgba(138,77,204,0.5)]' : isCompleted ? 'bg-pakomi-deep border-pakomi-purple text-white shadow-[0_0_15px_rgba(75,31,111,0.5)]' : 'bg-surface-dark border-white/10 text-gray-600'}`}>
                          <Icon className={`w-6 h-6 ${isCurrent ? 'animate-pulse' : ''}`} />
                        </div>
                        <span className={`text-sm mt-4 font-bold transition-colors ${isCurrent ? 'text-pakomi-glow' : isCompleted ? 'text-white' : 'text-gray-500'}`}>{step.label}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Dynamic Instruction */}
              {getStepInstruction(order.status) && (
                <div className="mt-8 bg-black/30 p-5 rounded-2xl border border-white/10 text-center relative z-10">
                  <p className="text-pakomi-glow font-medium text-lg leading-relaxed"><AlertCircle className="w-5 h-5 inline-block ml-2 align-text-bottom text-gray-400" />{getStepInstruction(order.status)}</p>
                </div>
              )}

              {/* Production Progress */}
              <div className="bg-surface-darker/50 border border-white/5 rounded-2xl p-6 relative z-10 mt-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-white text-lg">تقدم الإنتاج</h3>
                  <span className="text-pakomi-glow font-bold text-xl drop-shadow-[0_0_5px_rgba(138,77,204,0.5)]">{order.productionProgress}%</span>
                </div>
                <div className="h-3 bg-black/50 rounded-full overflow-hidden mb-3 border border-white/5">
                  <div className="h-full bg-gradient-to-r from-pakomi-deep to-pakomi-glow rounded-full transition-all duration-1000 ease-out shadow-[0_0_10px_rgba(138,77,204,0.5)]" style={{ width: `${order.productionProgress}%` }} />
                </div>
                <p className="text-sm text-gray-500 font-medium tracking-wide">{order.productionProgress}% من الإنتاج تم إنجازه</p>
              </div>

              {/* Approvals */}
              {pendingDesignTasks.length > 0 && (
                <div className="mt-8 bg-black/40 rounded-2xl p-6 border border-amber-500/30 shadow-[0_0_20px_rgba(245,158,11,0.1)] relative z-10">
                  <h3 className="font-bold text-xl text-amber-500 mb-4 flex items-center gap-3">
                    <AlertCircle className="w-6 h-6 animate-pulse" />
                    تأكيد تصميم مطلوب!
                  </h3>
                  <div className="space-y-4">
                    {pendingDesignTasks.map(task => (
                      <div key={task.id} className="bg-surface-dark/80 p-5 rounded-xl border border-white/10 shadow-inner">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
                          <div>
                            <p className="font-bold text-white text-lg mb-1">{task.title}</p>
                            <div className="flex gap-4 mt-2">
                              <button onClick={(e) => handleViewFile(e, task.design_file_url)} className="text-sm text-amber-500 hover:text-amber-400 font-medium flex items-center gap-1.5 transition-colors"><Eye className="w-4 h-4" /> عرض التصميم</button>
                              <button onClick={(e) => handleDownloadFile(e, task.design_file_url, `design-${task.id}.png`)} className="text-sm text-amber-500 hover:text-amber-400 font-medium flex items-center gap-1.5 transition-colors"><ArrowDownToLine className="w-4 h-4" /> تحميل</button>
                            </div>
                          </div>
                          <div className="flex gap-3 min-w-max">
                            <button disabled={approvingTaskId === task.id} onClick={() => handleDesignApproval(task.id, 'rejected')} className="px-5 py-2.5 border-2 border-red-500/30 text-red-500 font-bold rounded-xl hover:bg-red-500/10 hover:border-red-500 transition-all text-sm disabled:opacity-50">رفض / تعديل</button>
                            <button disabled={approvingTaskId === task.id} onClick={() => handleDesignApproval(task.id, 'approved')} className="px-5 py-2.5 bg-emerald-500/10 border-2 border-emerald-500/30 text-emerald-400 font-bold rounded-xl hover:bg-emerald-500 hover:text-white hover:border-emerald-500 transition-all text-sm shadow-sm disabled:opacity-50">{approvingTaskId === task.id ? 'جاري...' : 'اعتماد وإنتاج'}</button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Order Items */}
            <div className="glass-card rounded-3xl p-8 border-white/10 bg-surface-dark">
              <h3 className="font-bold text-xl mb-6 text-white tracking-tight">المنتجات</h3>
              <div className="space-y-4 text-gray-300">
                {order.items?.map((item: any, i: number) => (
                  <div key={i} className="flex justify-between items-center py-4 border-b border-white/5 last:border-0">
                    <div>
                      <p className="font-bold text-white text-lg mb-1">{item.name}</p>
                      <p className="text-sm text-gray-500 font-medium">{item.quantity} قطعة</p>
                    </div>
                    <p className="font-bold text-white text-lg">{(item.quantity * item.price).toLocaleString()} دج</p>
                  </div>
                ))}
                <div className="flex justify-between font-bold text-xl pt-6 mt-2 border-t border-white/10 text-white"><span>الإجمالي</span><span className="text-pakomi-glow text-2xl drop-shadow-[0_0_8px_rgba(138,77,204,0.4)]">{order.total.toLocaleString()} دج</span></div>
              </div>
            </div>

            {/* Address */}
            <div className="glass-card rounded-3xl p-8 border-white/10 bg-surface-dark">
              <h3 className="font-bold text-xl mb-6 text-white tracking-tight">عنوان التوصيل</h3>
              <div className="space-y-3 text-gray-400 font-medium bg-black/20 p-6 rounded-2xl border border-white/5">
                <p className="font-bold text-white text-lg mb-2">{order.customer}</p>
                <p className="flex items-center gap-2"><span className="text-gray-600 select-none">الولاية:</span> {order.wilaya}</p>
                <p className="flex items-center gap-2"><span className="text-gray-600 select-none">العنوان:</span> {order.address}</p>
              </div>
            </div>

          </motion.div>
        )}
      </div>
    </div>
  );
}
