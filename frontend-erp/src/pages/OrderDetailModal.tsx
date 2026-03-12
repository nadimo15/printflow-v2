import { useState } from 'react';
import { X, Printer, CheckCircle, Truck, Package, Clock, User, AlertCircle, Play, Pause, Trash2, Plus, Edit2, Save, XCircle, Loader2, CreditCard, DollarSign, ArrowDownToLine, History, FileText } from 'lucide-react';
import { useOrdersStore, OrderItem, Task } from '../store/ordersStore';
import { useAuthStore } from '../store/authStore';
import { useEmployeesStore } from '../store/employeesStore';
import { api } from '../services/api';
import { useEffect } from 'react';
import toast from 'react-hot-toast';
import TaskCustomizationModal from './TaskCustomizationModal';
import { handleViewFile, handleDownloadFile } from '../utils/fileViewer';

interface OrderDetailModalProps {
  order: any;
  isOpen: boolean;
  onClose: () => void;
  onConfirm?: (orderId: string) => void;
  onStatusChange?: (orderId: string, status: string) => void;
}

// Workers removed (using store)

export default function OrderDetailModal({ order, isOpen, onClose, onConfirm, onStatusChange }: OrderDetailModalProps) {
  const { orders, updateOrder, deleteOrder, updateTaskStatus, generateTasksForOrder, fetchOrders } = useOrdersStore();
  const { employees, fetchEmployees } = useEmployeesStore();
  const { user } = useAuthStore();
  const role = user?.role === 'project_admin' ? 'admin' : (user?.role || 'worker');
  const canManageOrder = role === 'admin' || role === 'manager';
  const canViewFinancials = role === 'admin' || role === 'manager';

  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [editingItems, setEditingItems] = useState<OrderItem[]>([]);
  const [newProduct, setNewProduct] = useState({ name: '', quantity: 1, price: 0 });
  const [showTaskCustomization, setShowTaskCustomization] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showTrackingInput, setShowTrackingInput] = useState(false);
  const [trackingNumber, setTrackingNumber] = useState('');

  // Activity Log State
  const [activeTab, setActiveTab] = useState<'details' | 'activity'>('details');
  const [reworkLogs, setReworkLogs] = useState<any[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);


  useEffect(() => {
    if (isOpen) {
      fetchEmployees();
    }
  }, [isOpen, fetchEmployees]);

  useEffect(() => {
    if (isOpen && order) {
      setTrackingNumber(order.tracking_number || '');
      setActiveTab('details');

      // Fetch rework logs for activity timeline
      const fetchLogs = async () => {
        setIsLoadingLogs(true);
        try {
          const res = await api.reworkLogs.getByOrder(order.id);
          if (res.success) setReworkLogs(res.data);
        } catch (err) {
          console.error('Failed to fetch rework logs', err);
        } finally {
          setIsLoadingLogs(false);
        }
      };

      fetchLogs();
    }
  }, [isOpen, order]);

  if (!isOpen || !order) return null;

  // Get latest order data from store
  const currentOrder = orders.find(o => o.id === order.id) || order;
  const tasks = currentOrder.tasks || [];
  const completedTasks = tasks.filter((t: any) => t.status === 'completed').length;
  const progress = tasks.length > 0 ? Math.round((completedTasks / tasks.length) * 100) : currentOrder.productionProgress || 0;

  const handleConfirmClick = () => {
    setShowTaskCustomization(true);
  };

  const handleShipOrder = async () => {
    if (!trackingNumber.trim() && !window.confirm('تأكيد الشحن بدون رقم تتبع؟')) return;
    try {
      await api.orders.updateFields(currentOrder.id, {
        status: 'shipped',
        tracking_number: trackingNumber.trim() || null,
        shipped_at: new Date().toISOString(),
      });
      updateOrder(currentOrder.id, { status: 'shipped' as any, tracking_number: trackingNumber.trim() });
      setShowTrackingInput(false);
      toast.success('تم تحديث حالة الطلب إلى: تم الشحن');
      fetchOrders();
    } catch (e) {
      toast.error('فشل في تحديث حالة الشحن');
    }
  };

  const handleMarkPaid = async () => {
    try {
      await api.orders.updateFields(currentOrder.id, { payment_status: 'paid' });
      updateOrder(currentOrder.id, { payment_status: 'paid' } as any);
      toast.success('تم تسجيل الطلب كمدفوع ✅');
      fetchOrders();
    } catch (e) {
      toast.error('فشل في تحديث حالة الدفع');
    }
  };


  const handleFinalConfirm = async (customTasks: Task[]) => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      await generateTasksForOrder(currentOrder.id, customTasks);
      onConfirm?.(currentOrder.id);
      toast.success('تم تأكيد الطلب وإنشاء المهام الإنتاجية');
      setShowTaskCustomization(false);
    } catch (error) {
      console.error('Failed to confirm order:', error);
      toast.error('حدث خطأ أثناء تأكيد الطلب');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelivered = () => {
    onStatusChange?.(currentOrder.id, 'delivered');
    toast.success('تم تحديث حالة الطلب إلى تم التسليم');
  };

  const handleReady = () => {
    onStatusChange?.(currentOrder.id, 'ready');
    toast.success('تم تحديث حالة الطلب إلى جاهز');
  };

  const handleDelete = () => {
    deleteOrder(currentOrder.id);
    toast.success('تم حذف الطلب');
    onClose();
  };

  const handleStartEdit = () => {
    setEditingItems([...currentOrder.items]);
    setIsEditing(true);
  };

  const handleSaveEdit = () => {
    const newTotal = editingItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    updateOrder(currentOrder.id, { items: editingItems, total: newTotal });
    setIsEditing(false);
    toast.success('تم تحديث الطلب');
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditingItems([]);
  };

  const handleUpdateItem = (index: number, field: keyof OrderItem, value: any) => {
    const updated = [...editingItems];
    updated[index] = { ...updated[index], [field]: value };
    setEditingItems(updated);
  };

  const handleRemoveItem = (index: number) => {
    const updated = editingItems.filter((_, i) => i !== index);
    setEditingItems(updated);
  };

  const handleAddProduct = () => {
    if (!newProduct.name || newProduct.quantity < 1 || newProduct.price < 0) {
      toast.error('يرجى ملء جميع حقول المنتج');
      return;
    }

    const updatedItems = [...currentOrder.items, { ...newProduct }];
    const newTotal = updatedItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    updateOrder(currentOrder.id, { items: updatedItems, total: newTotal });
    setNewProduct({ name: '', quantity: 1, price: 0 });
    setShowAddProduct(false);
    toast.success('تم إضافة المنتج');
  };

  const handleTaskStatusChange = async (taskId: string, newStatus: 'pending' | 'in_progress' | 'completed') => {
    updateTaskStatus(currentOrder.id, taskId, newStatus);

    // ── BOM-AWARE DEDUCTION: When task is completed, deduct inventory via completeWithInventory ──
    if (newStatus === 'completed') {
      try {
        await api.tasks.completeWithInventory({
          taskId,
          orderId: currentOrder.id,
          workerId: '', // no specific worker from modal context, BOM will handle by order item
          consumption: { blanksWasted: 0, reworkReason: 'N/A' }
        });
        toast.success('✅ تم إتمام المهمة وخصم المواد من المخزون');
      } catch (err: any) {
        console.error('[OrderDetailModal] completeWithInventory failed:', err);
        toast.success('تم تحديث حالة المهمة'); // still show success for status change
      }
    } else {
      toast.success('تم تحديث حالة المهمة');
    }
  };

  const handleAssignTask = async (taskId: string, workerId: string) => {
    if (!workerId) return;
    try {
      await api.tasks.assign(taskId, workerId);
      const worker = employees.find(e => e.id === workerId);
      toast.success(`تم إسناد المهمة إلى ${worker?.name}`);
      // Refresh orders to update UI with new assignment
      fetchOrders();
    } catch (error) {
      console.error('Failed to assign task:', error);
      toast.error('حدث خطأ في تعيين الموظف');
    }
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'pending':
        return { icon: Clock, class: 'bg-yellow-100 text-yellow-800', label: 'معلق' };
      case 'confirmed':
        return { icon: CheckCircle, class: 'bg-blue-100 text-blue-800', label: 'مؤكد' };
      case 'in_production':
        return { icon: Printer, class: 'bg-purple-100 text-purple-800', label: 'قيد التنفيذ' };
      case 'ready':
        return { icon: Package, class: 'bg-green-100 text-green-800', label: 'جاهز' };
      case 'delivered':
        return { icon: Truck, class: 'bg-gray-100 text-gray-800', label: 'تم التسليم' };
      default:
        return { icon: AlertCircle, class: 'bg-gray-100 text-gray-800', label: status };
    }
  };

  const statusConfig = getStatusConfig(currentOrder.status);
  const StatusIcon = statusConfig.icon;

  const getTaskTypeIcon = (type: string) => {
    switch (type) {
      case 'design': return '🎨';
      case 'printing': return '🖨️';
      case 'quality_check': return '✅';
      case 'packing': return '📦';
      default: return '📋';
    }
  };

  const getTaskTypeLabel = (type: string) => {
    switch (type) {
      case 'design': return 'تصميم';
      case 'printing': return 'طباعة/إنتاج';
      case 'quality_check': return 'فحص جودة';
      case 'packing': return 'تغليف';
      default: return type;
    }
  };

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="absolute inset-4 md:inset-10 bg-white rounded-xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b bg-gray-50">
          <div className="flex items-center gap-4">
            <div className={`p-2 rounded-lg ${statusConfig.class}`}>
              <StatusIcon className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold">{currentOrder.orderNumber || currentOrder.id}</h2>
              <p className="text-gray-500">{currentOrder.date}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {currentOrder.status === 'pending' && canManageOrder && (
              <>
                <button
                  onClick={handleStartEdit}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                >
                  <Edit2 className="w-4 h-4" />
                  تعديل
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
                >
                  <Trash2 className="w-4 h-4" />
                  حذف
                </button>
                <button
                  onClick={handleConfirmClick}
                  disabled={isSubmitting}
                  className={`flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                  {isSubmitting ? 'جاري التأكيد...' : 'تأكيد الطلب'}
                </button>

                {/* Task Customization Modal */}
                <TaskCustomizationModal
                  order={currentOrder}
                  isOpen={showTaskCustomization}
                  onClose={() => setShowTaskCustomization(false)}
                  onConfirm={handleFinalConfirm}
                  isSubmitting={isSubmitting}
                />
              </>
            )}
            {currentOrder.status === 'ready' && canManageOrder && (
              <>
                {/* Ship order button — opens tracking input */}
                {!showTrackingInput ? (
                  <button
                    onClick={() => setShowTrackingInput(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600"
                  >
                    <Truck className="w-4 h-4" />
                    شحن الطلب
                  </button>
                ) : (
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="رقم التتبع (اختياري)"
                      value={trackingNumber}
                      onChange={e => setTrackingNumber(e.target.value)}
                      className="input text-sm px-3 py-2 w-36"
                    />
                    <button onClick={handleShipOrder} className="px-3 py-2 bg-indigo-500 text-white rounded-lg text-sm hover:bg-indigo-600">
                      تأكيد الشحن
                    </button>
                    <button onClick={() => setShowTrackingInput(false)} className="px-3 py-2 bg-gray-200 rounded-lg text-sm">
                      إلغاء
                    </button>
                  </div>
                )}

                {/* Mark delivered after shipping */}
                <button
                  onClick={handleDelivered}
                  className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
                >
                  <CheckCircle className="w-4 h-4" />
                  تسليم مباشر
                </button>
              </>
            )}
            {currentOrder.status === 'shipped' && canManageOrder && (
              <button
                onClick={handleDelivered}
                className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
              >
                <CheckCircle className="w-4 h-4" />
                تأكيد التسليم
              </button>
            )}
            {/* Payment status badge + COD button */}
            {(currentOrder.status === 'delivered' || currentOrder.status === 'shipped') && canManageOrder && (
              <div className="flex items-center gap-2">
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${(currentOrder as any).payment_status === 'paid' ? 'bg-green-100 text-green-800' :
                  (currentOrder as any).payment_status === 'partial' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                  {(currentOrder as any).payment_status === 'paid' ? '✅ مدفوع' :
                    (currentOrder as any).payment_status === 'partial' ? '⚠️ جزئي' : '🔴 غير مدفوع'}
                </span>
                {(currentOrder as any).payment_status !== 'paid' && (
                  <button
                    onClick={handleMarkPaid}
                    className="flex items-center gap-1 px-3 py-1.5 bg-green-500 text-white rounded-lg text-sm hover:bg-green-600"
                  >
                    <CreditCard className="w-3 h-3" />
                    تحصيل COD
                  </button>
                )}
              </div>
            )}
            {progress === 100 && currentOrder.status === 'in_production' && canManageOrder && (
              <button
                onClick={handleReady}
                className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
              >
                <Package className="w-4 h-4" />
                جاهز للتسليم
              </button>
            )}
            <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-lg">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tabs Navigation */}
        <div className="flex border-b border-gray-200 px-6 bg-gray-50/50">
          <button
            onClick={() => setActiveTab('details')}
            className={`px-6 py-3 font-bold text-sm border-b-2 flex items-center gap-2 transition-colors ${activeTab === 'details' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
          >
            <FileText className="w-4 h-4" /> تفاصيل الطلب
          </button>
          <button
            onClick={() => setActiveTab('activity')}
            className={`px-6 py-3 font-bold text-sm border-b-2 flex items-center gap-2 transition-colors ${activeTab === 'activity' ? 'border-primary text-primary' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
          >
            <History className="w-4 h-4" /> سجل النشاطات
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6" dir="rtl">
          {activeTab === 'details' ? (
            <div className="grid md:grid-cols-2 gap-6">
              {/* Order Details */}
              <div className="space-y-6">
                {/* Customer Info */}
                <div className="card p-4">
                  <h3 className="font-bold mb-4 flex items-center gap-2">
                    <User className="w-5 h-5 text-primary" />
                    معلومات العميل
                  </h3>
                  <div className="space-y-2 text-sm">
                    <p><span className="text-gray-500">الاسم:</span> {currentOrder.customer}</p>
                    <p><span className="text-gray-500">الهاتف:</span> {currentOrder.phone || '—'}</p>
                    <p><span className="text-gray-500">الولاية:</span> {currentOrder.wilaya || '—'}</p>
                    <p><span className="text-gray-500">العنوان:</span> {currentOrder.address || '—'}</p>
                    {(currentOrder as any).tracking_number && (
                      <p className="text-indigo-600 font-medium">🚚 رقم التتبع: {(currentOrder as any).tracking_number}</p>
                    )}
                    {(currentOrder as any).shipped_at && (
                      <p className="text-gray-500 text-xs">تاريخ الشحن: {new Date((currentOrder as any).shipped_at).toLocaleDateString('ar-DZ')}</p>
                    )}
                  </div>
                </div>

                {/* Order Items */}
                <div className="card p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold flex items-center gap-2">
                      <Package className="w-5 h-5 text-primary" />
                      المنتجات
                    </h3>
                    {currentOrder.status === 'pending' && canManageOrder && (
                      <button
                        onClick={() => setShowAddProduct(true)}
                        className="flex items-center gap-1 px-3 py-1 text-sm bg-primary text-white rounded-lg hover:bg-primary-dark"
                      >
                        <Plus className="w-4 h-4" />
                        إضافة منتج
                      </button>
                    )}
                  </div>

                  {/* Add Product Form */}
                  {showAddProduct && canManageOrder && (
                    <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                      <h4 className="font-medium mb-3">إضافة منتج جديد</h4>
                      <div className="space-y-3">
                        <input
                          type="text"
                          placeholder="اسم المنتج"
                          value={newProduct.name}
                          onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                          className="input w-full"
                        />
                        <div className="flex gap-3">
                          <input
                            type="number"
                            placeholder="الكمية"
                            min="1"
                            value={newProduct.quantity}
                            onChange={(e) => setNewProduct({ ...newProduct, quantity: parseInt(e.target.value) || 1 })}
                            className="input flex-1"
                          />
                          <input
                            type="number"
                            placeholder="السعر"
                            min="0"
                            value={newProduct.price}
                            onChange={(e) => setNewProduct({ ...newProduct, price: parseInt(e.target.value) || 0 })}
                            className="input flex-1"
                          />
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={handleAddProduct}
                            className="flex-1 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark"
                          >
                            إضافة
                          </button>
                          <button
                            onClick={() => setShowAddProduct(false)}
                            className="flex-1 py-2 bg-gray-200 rounded-lg hover:bg-gray-300"
                          >
                            إلغاء
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Items List */}
                  <div className="space-y-3">
                    {isEditing ? (
                      // Edit Mode
                      editingItems.map((item: any, idx: number) => (
                        <div key={idx} className="p-3 bg-gray-50 rounded-lg">
                          <div className="space-y-2">
                            <input
                              type="text"
                              value={item.name}
                              onChange={(e) => handleUpdateItem(idx, 'name', e.target.value)}
                              className="input w-full text-sm"
                            />
                            <div className="flex gap-2">
                              <input
                                type="number"
                                min="1"
                                value={item.quantity}
                                onChange={(e) => handleUpdateItem(idx, 'quantity', parseInt(e.target.value) || 1)}
                                className="input flex-1 text-sm"
                              />
                              <input
                                type="number"
                                min="0"
                                value={item.price}
                                onChange={(e) => handleUpdateItem(idx, 'price', parseInt(e.target.value) || 0)}
                                className="input flex-1 text-sm"
                              />
                              <button
                                onClick={() => handleRemoveItem(idx)}
                                className="p-2 text-red-500 hover:bg-red-50 rounded"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      // View Mode
                      currentOrder.items?.map((item: any, idx: number) => (
                        <div key={idx} className="py-3 border-b last:border-0">
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <p className="font-medium">{item.name}</p>
                              <p className="text-sm text-gray-500">الكمية: {item.quantity}</p>
                            </div>
                            {canViewFinancials && (
                              <p className="font-medium">{(item.price * item.quantity).toLocaleString()} دج</p>
                            )}
                          </div>

                          {/* Customization Details */}
                          {item.customization && (
                            <div className="mt-3 p-3 bg-blue-50 rounded-lg text-sm border border-blue-100">
                              <p className="font-medium text-blue-800 mb-2">تفاصيل التخصيص:</p>

                              <div className="flex flex-wrap gap-2 mb-2">
                                {Object.entries(item.customization).map(([key, value]) => {
                                  if (!value || typeof value === 'object') return null;
                                  if (['designUrl', 'designFileName', 'notes'].includes(key)) return null;

                                  let displayKey = key;
                                  if (key === 'selected_size' || key === 'Size' || key === 'size') displayKey = 'المقاس';

                                  return (
                                    <span key={key} className="px-2 py-1 bg-white border border-blue-200 text-blue-800 rounded-md">
                                      <span className="text-blue-500 mr-1">{displayKey}:</span> {String(value)}
                                    </span>
                                  );
                                })}
                              </div>

                              {/* Arrays (like old 'colors') */}
                              {item.customization.colors && Array.isArray(item.customization.colors) && item.customization.colors.length > 0 && (
                                <p className="text-gray-700 mb-2">
                                  <span className="text-gray-500">الألوان:</span> {item.customization.colors.join(', ')}
                                </p>
                              )}

                              {/* Notes */}
                              {item.customization.notes && (
                                <p className="text-gray-700 mb-2">
                                  <span className="text-gray-500">ملاحظات:</span> {item.customization.notes}
                                </p>
                              )}

                              {/* Design File */}
                              {item.customization.designUrl && (
                                <div className="mt-3 p-3 bg-white rounded border border-gray-200">
                                  <p className="text-xs font-medium text-green-600 mb-2 flex items-center gap-1">
                                    📎 الملف المرفق:
                                  </p>

                                  {item.customization.designUrl.startsWith('data:image') ? (
                                    <div className="space-y-2">
                                      <button onClick={(e) => handleViewFile(e, item.customization.designUrl)} className="block group relative w-full text-right focus:outline-none">
                                        <img
                                          src={item.customization.designUrl}
                                          alt="Design"
                                          className="w-full max-w-sm h-auto object-contain rounded border hover:opacity-90 transition-opacity"
                                        />
                                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/10">
                                          <span className="bg-white/90 px-2 py-1 rounded text-xs">عرض الصورة بالكامل</span>
                                        </div>
                                      </button>
                                      <button onClick={(e) => handleDownloadFile(e, item.customization.designUrl, item.customization.designFileName || 'design-file.png')} className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 font-medium">
                                        <ArrowDownToLine className="w-4 h-4" /> تحميل المرفق
                                      </button>
                                    </div>
                                  ) : (
                                    <button
                                      onClick={(e) => handleDownloadFile(e, item.customization.designUrl, item.customization.designFileName || 'design-file')}
                                      className="flex w-full text-right items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors border border-gray-200 group"
                                    >
                                      <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600 group-hover:scale-110 transition-transform shrink-0">
                                        ⬇️
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <p className="font-medium text-gray-900 truncate" title={item.customization.designFileName}>
                                          {item.customization.designFileName || 'ملف التصميم'}
                                        </p>
                                        <p className="text-xs text-gray-500">انقر للتحميل</p>
                                      </div>
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>

                  {/* Edit Actions */}
                  {isEditing && canManageOrder && (
                    <div className="mt-4 flex gap-2">
                      <button
                        onClick={handleSaveEdit}
                        className="flex-1 flex items-center justify-center gap-2 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
                      >
                        <Save className="w-4 h-4" />
                        حفظ
                      </button>
                      <button
                        onClick={handleCancelEdit}
                        className="flex-1 flex items-center justify-center gap-2 py-2 bg-gray-200 rounded-lg hover:bg-gray-300"
                      >
                        <XCircle className="w-4 h-4" />
                        إلغاء
                      </button>
                    </div>
                  )}

                  {canViewFinancials && (
                    <div className="mt-4 pt-4 border-t space-y-3">
                      <h4 className="font-bold text-gray-800 text-sm mb-2 flex items-center gap-2">
                        <DollarSign className="w-4 h-4 text-green-600" />
                        التحليل المالي والربحية
                      </h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                          <div className="flex items-center justify-between text-gray-600 text-sm mb-1">
                            <span>المجموع الفرعي (الإيرادات):</span>
                            <span className="font-medium">
                              {(currentOrder.subtotal || (currentOrder.total - (currentOrder.shipping || 0))).toLocaleString()} دج
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-gray-600 text-sm mb-1">
                            <span>التوصيل (للمندوب):</span>
                            <span className="font-medium">
                              {(currentOrder.shipping || 0).toLocaleString()} دج
                            </span>
                          </div>
                          <div className="flex items-center justify-between font-bold text-base pt-2 border-t mt-1">
                            <span>إجمالي الفاتورة:</span>
                            <span className="text-primary">
                              {(isEditing
                                ? editingItems.reduce((sum, item) => sum + (item.price * item.quantity), 0)
                                : currentOrder.total
                              ).toLocaleString()} دج
                            </span>
                          </div>
                        </div>

                        <div className="bg-green-50/50 p-3 rounded-lg border border-green-100">
                          <div className="flex items-center justify-between text-gray-600 text-sm mb-1">
                            <span>الإيرادات (بدون شحن):</span>
                            <span className="font-medium text-gray-800">
                              {(currentOrder.subtotal || (currentOrder.total - (currentOrder.shipping || 0))).toLocaleString()} دج
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-gray-600 text-sm mb-1">
                            <span>تكلفة المواد:</span>
                            <span className="font-medium text-red-600">
                              -{Number(currentOrder.material_cost || 0).toLocaleString()} دج
                            </span>
                          </div>
                          <div className="flex items-center justify-between font-bold pt-2 border-t mt-1 border-green-200">
                            <span>هامش الربح الإجمالي:</span>
                            <span className={Number(currentOrder.gross_margin) >= 0 ? 'text-green-700' : 'text-red-600'}>
                              {Number(currentOrder.gross_margin || 0).toLocaleString()} دج
                              <span className="text-xs ml-1 font-normal opacity-80">
                                ({currentOrder.subtotal || (currentOrder.total - (currentOrder.shipping || 0)) > 0 ? ((Number(currentOrder.gross_margin || 0) / (currentOrder.subtotal || (currentOrder.total - (currentOrder.shipping || 0)))) * 100).toFixed(1) : 0}%)
                              </span>
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Tasks & Progress */}
              <div className="space-y-6">
                {/* Progress */}
                <div className="card p-4">
                  <h3 className="font-bold mb-4">تقدم الإنتاج</h3>
                  <div className="mb-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-gray-500">التقدم الكلي</span>
                      <span className="text-sm font-medium">{progress}%</span>
                    </div>
                    <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full transition-all duration-500"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>
                  <p className="text-sm text-gray-500">
                    {completedTasks} من {tasks.length} مهام مكتملة
                  </p>
                </div>

                {/* Tasks List */}
                {tasks.length > 0 ? (
                  <div className="card p-4">
                    <h3 className="font-bold mb-4">المهام الإنتاجية</h3>
                    <div className="space-y-2">
                      {tasks.map((task: any) => (
                        <div
                          key={task.id}
                          className={`p-3 rounded-lg border ${task.status === 'completed' ? 'bg-green-50 border-green-200' : 'bg-gray-50'}`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <span className="text-xl">{getTaskTypeIcon(task.type)}</span>
                              <div>
                                <p className="font-medium text-sm">{task.title}</p>
                                <p className="text-xs text-gray-500">{getTaskTypeLabel(task.type)}</p>
                                {task.type === 'design' && task.design_file_url && (
                                  <div className="flex gap-3 mt-2">
                                    <button onClick={(e) => { e.stopPropagation(); handleViewFile(e, task.design_file_url); }} className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1 font-medium bg-blue-50 px-2 py-1 rounded">
                                      عرض التصميم المعتمد
                                    </button>
                                    <button onClick={(e) => { e.stopPropagation(); handleDownloadFile(e, task.design_file_url, `design-final-${task.id}.png`); }} className="text-xs text-purple-600 hover:text-purple-800 flex items-center gap-1 font-medium bg-purple-50 px-2 py-1 rounded">
                                      تحميل المعتمد
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {task.status === 'pending' && (
                                <button
                                  onClick={() => handleTaskStatusChange(task.id, 'in_progress')}
                                  className="p-1.5 text-blue-600 hover:bg-blue-100 rounded"
                                  title="بدء التنفيذ"
                                >
                                  <Play className="w-4 h-4" />
                                </button>
                              )}
                              {task.status === 'in_progress' && (
                                <>
                                  <button
                                    onClick={() => handleTaskStatusChange(task.id, 'pending')}
                                    className="p-1.5 text-yellow-600 hover:bg-yellow-100 rounded"
                                    title="إيقاف مؤقت"
                                  >
                                    <Pause className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => handleTaskStatusChange(task.id, 'completed')}
                                    className="p-1.5 text-green-600 hover:bg-green-100 rounded"
                                    title="إكمال المهمة"
                                  >
                                    <CheckCircle className="w-4 h-4" />
                                  </button>
                                </>
                              )}
                              {task.status === 'completed' && (
                                <span className="text-xs text-green-600 font-medium">مكتملة</span>
                              )}
                            </div>
                          </div>

                          {/* Worker Assignment */}
                          {canManageOrder && (
                            <div className="mt-2 flex items-center gap-2">
                              <span className="text-xs text-gray-500">مسندة لـ:</span>
                              <select
                                value={employees.find(e => e.name === task.assignedTo)?.id || ''}
                                onChange={(e) => handleAssignTask(task.id, e.target.value)}
                                className="text-xs border rounded px-2 py-1 max-w-[120px]"
                              >
                                <option value="">اختر العامل</option>
                                {employees.filter(emp => emp.is_active).map(worker => (
                                  <option key={worker.id} value={worker.id}>
                                    {worker.name}
                                  </option>
                                ))}
                              </select>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="card p-4 text-center text-gray-500">
                    <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p>لا توجد مهام بعد</p>
                    {currentOrder.status === 'pending' && (
                      <p className="text-sm mt-1">قم بتأكيد الطلب لإنشاء المهام</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* Activity Log Tab */
            <div className="max-w-3xl mx-auto py-4">
              <h3 className="font-bold text-lg mb-6 flex items-center gap-2">
                <History className="w-5 h-5 text-primary" />
                تتبع مسار الطلب زمنياً
              </h3>

              {isLoadingLogs ? (
                <div className="flex justify-center py-10"><Loader2 className="w-8 h-8 animate-spin text-gray-400" /></div>
              ) : (
                <div className="relative border-r-2 border-gray-100 pr-6 space-y-8">

                  {/* Event 1: Order Created */}
                  <div className="relative">
                    <div className="absolute -right-[33px] top-1.5 w-4 h-4 rounded-full bg-blue-500 ring-4 ring-white" />
                    <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-bold text-gray-900">تم إنشاء الطلب</h4>
                        <span className="text-xs text-gray-500 bg-gray-50 px-2 py-1 rounded">
                          {new Date(currentOrder.date).toLocaleString('ar-DZ')}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600">تم تسجيل الطلب رقم {currentOrder.orderNumber} للعميل {currentOrder.customer}</p>
                    </div>
                  </div>

                  {/* Task & Rework Events Sorted Chronologically */}
                  {(() => {
                    const events: any[] = [];

                    // Add Tasks
                    currentOrder.tasks?.forEach((task: any) => {
                      if (task.created_at || currentOrder.date) {
                        events.push({
                          type: 'task_created',
                          title: `إنشاء مهمة: ${task.title}`,
                          date: new Date(task.created_at || currentOrder.date),
                          task,
                          icon: Clock,
                          color: 'bg-gray-400'
                        });
                      }

                      // For Design Tasks specifically: Show file uploads and approvals
                      if (task.type === 'design') {
                        if (task.design_file_url) {
                          events.push({
                            type: 'design_uploaded',
                            title: `تم رفع التصميم (المصمم: ${task.assignedTo || 'غير محدد'})`,
                            date: new Date(task.completed_at || currentOrder.date), // Approximate if no specific upload timestamp
                            task,
                            icon: FileText,
                            color: 'bg-purple-500'
                          });
                        }
                        if (task.approval_status === 'approved') {
                          events.push({
                            type: 'design_approved',
                            title: `العميل وافق على التصميم`,
                            date: new Date(task.completed_at || new Date()), // Approximate
                            task,
                            icon: CheckCircle,
                            color: 'bg-green-500'
                          });
                        } else if (task.approval_status === 'rejected') {
                          events.push({
                            type: 'design_rejected',
                            title: `العميل رفض التصميم`,
                            desc: `السبب: ${task.rejection_reason || 'غير محدد'}`,
                            date: new Date(task.completed_at || new Date()),
                            task,
                            icon: XCircle,
                            color: 'bg-red-500'
                          });
                        }
                      }

                      if (task.status === 'completed') {
                        events.push({
                          type: 'task_completed',
                          title: `إنجاز مهمة: ${task.title}`,
                          desc: `المنفذ: ${task.assignedTo || 'غير محدد'}`,
                          date: new Date(task.completed_at || new Date()),
                          task,
                          icon: CheckCircle,
                          color: 'bg-emerald-500'
                        });
                      }
                    });

                    // Add Rework Logs
                    reworkLogs.forEach(log => {
                      events.push({
                        type: 'rework',
                        title: `تقييم جودة / رفض داخلي`,
                        desc: `السبب: ${log.reason} | الكمية التالفة: ${log.quantity_ruined}`,
                        note: log.notes,
                        worker: log.profiles?.name || 'مجهول',
                        date: new Date(log.created_at),
                        icon: AlertCircle,
                        color: 'bg-red-500'
                      });
                    });

                    // Sort all events
                    events.sort((a, b) => a.date.getTime() - b.date.getTime());

                    return events.map((event, idx) => {
                      const Icon = event.icon;
                      return (
                        <div key={`${event.type}-${idx}`} className="relative">
                          <div className={`absolute -right-[33px] top-1.5 w-4 h-4 rounded-full ${event.color} ring-4 ring-white flex items-center justify-center shrink-0`} />
                          <div className={`bg-white p-4 rounded-xl border ${event.type === 'rework' || event.type === 'design_rejected' ? 'border-red-100 bg-red-50/30' : 'border-gray-100'} shadow-sm`}>
                            <div className="flex justify-between items-start mb-2">
                              <h4 className={`font-bold flex items-center gap-2 ${event.type === 'rework' || event.type === 'design_rejected' ? 'text-red-700' : 'text-gray-900'}`}>
                                <Icon className={`w-4 h-4 ${event.type === 'rework' || event.type === 'design_rejected' ? 'text-red-500' : 'text-gray-500'}`} />
                                {event.title}
                              </h4>
                              <span className="text-xs text-gray-500 bg-gray-50 px-2 py-1 rounded">
                                {event.date.toLocaleString('ar-DZ')}
                              </span>
                            </div>

                            {event.desc && <p className="text-sm text-gray-600 mb-1 font-medium">{event.desc}</p>}
                            {event.note && <p className="text-xs text-gray-500 italic mt-1 bg-white p-2 border rounded">"{event.note}"</p>}

                            {event.type === 'design_uploaded' && event.task.design_file_url && (
                              <div className="flex gap-2 mt-3 pt-3 border-t border-gray-100">
                                <button onClick={(e) => handleViewFile(e, event.task.design_file_url)} className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1 font-bold bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-100">
                                  <FileText className="w-3.5 h-3.5" /> عرض التصميم
                                </button>
                                <button onClick={(e) => handleDownloadFile(e, event.task.design_file_url, `design-${event.task.id}.png`)} className="text-xs text-purple-600 hover:text-purple-800 flex items-center gap-1 font-bold bg-purple-50 px-3 py-1.5 rounded-lg border border-purple-100">
                                  <ArrowDownToLine className="w-3.5 h-3.5" /> تحميل التصميم
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    });
                  })()}

                  {/* Event: Order Completed (if all tasks done or order status is ready) */}
                  {(progress === 100 || currentOrder.status === 'ready' || currentOrder.status === 'shipped' || currentOrder.status === 'delivered') && (
                    <div className="relative">
                      <div className="absolute -right-[34px] top-1.5 w-5 h-5 rounded-full bg-gradient-to-r from-green-400 to-green-500 ring-4 ring-white flex items-center justify-center">
                        <CheckCircle className="w-3 h-3 text-white" />
                      </div>
                      <div className="bg-green-50 p-4 rounded-xl border border-green-200 shadow-sm">
                        <div className="flex justify-between items-start">
                          <h4 className="font-bold text-green-900">اكتمل الإنتاج</h4>
                          <span className="text-xs text-green-700 bg-green-100 px-2 py-1 rounded">الطلب جاهز للتسليم</span>
                        </div>
                        <p className="text-sm text-green-700 mt-1">جميع المهام الإنتاجية للطلب {currentOrder.orderNumber} تم إنجازها بنجاح.</p>
                      </div>
                    </div>
                  )}

                </div>
              )}
            </div>
          )}
        </div>

        {/* Delete Confirmation Modal */}
        {showDeleteConfirm && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-10">
            <div className="bg-white rounded-xl p-6 max-w-md mx-4">
              <h3 className="text-lg font-bold mb-4">تأكيد الحذف</h3>
              <p className="text-gray-600 mb-6">هل أنت متأكد من حذف هذا الطلب؟ لا يمكن التراجع عن هذا الإجراء.</p>
              <div className="flex gap-3">
                <button
                  onClick={handleDelete}
                  className="flex-1 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
                >
                  حذف
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 py-2 bg-gray-200 rounded-lg hover:bg-gray-300"
                >
                  إلغاء
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
