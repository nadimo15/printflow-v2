import { useState, useMemo, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { Search, Filter, Clock, User, AlertCircle, RefreshCw } from 'lucide-react';
import { useTasksStore } from '../store/tasksStore';
import { useAuthStore } from '../store/authStore';
import { api } from '../services/api';
import toast from 'react-hot-toast';
import TaskDetailModal from './TaskDetailModal';

type TaskStatus = 'pending' | 'in_progress' | 'paused' | 'completed';

interface TaskView {
  id: string;
  title: string;
  type: string;
  status: TaskStatus;
  orderId: string;
  orderNumber: string;
  customer: string;
  assignedTo?: string;
  assignedToId?: string;
}

const columns: { id: TaskStatus; title: string; color: string }[] = [
  { id: 'pending', title: 'قيد الانتظار', color: 'bg-gray-100' },
  { id: 'in_progress', title: 'قيد التنفيذ', color: 'bg-blue-50' },
  { id: 'paused', title: 'متوقفة', color: 'bg-yellow-50' },
  { id: 'completed', title: 'مكتملة', color: 'bg-green-50' },
];

const getPriorityColor = (type: string) => {
  switch (type) {
    case 'design': return 'text-purple-500';
    case 'printing': return 'text-blue-500';
    case 'quality_check': return 'text-green-500';
    case 'packing': return 'text-orange-500';
    default: return 'text-gray-500';
  }
};

const getTaskTypeIcon = (type: string) => {
  switch (type) {
    case 'design': return '🎨';
    case 'printing': return '🖨️';
    case 'quality_check': return '✅';
    case 'packing': return '📦';
    default: return '📋';
  }
};

export default function TasksPage() {
  // ✅ FIX: Use tasksStore as single source of truth — NOT ordersStore
  const { tasks, fetchTasks, moveTask, updateTask, isLoading } = useTasksStore();
  const { user } = useAuthStore();
  const [search, setSearch] = useState('');

  // Fetch tasks from DB on mount
  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  // State for the Completion Modal
  const [completionModalConfig, setCompletionModalConfig] = useState<{
    isOpen: boolean;
    taskId: string | null;
    orderId: string | null;
    taskTitle: string;
    isSubmitting: boolean;
  }>({
    isOpen: false,
    taskId: null,
    orderId: null,
    taskTitle: '',
    isSubmitting: false
  });

  const [consumptionFields, setConsumptionFields] = useState<{
    blanksUsed: number;
    blanksWasted: number;
    inkUsedGrams: number;
    reworkReason?: string;
  }>({
    blanksUsed: 0,
    blanksWasted: 0,
    inkUsedGrams: 0,
    reworkReason: '',
  });

  // State for Design Upload Modal
  const [designModalConfig, setDesignModalConfig] = useState<{
    isOpen: boolean;
    taskId: string | null;
    taskTitle: string;
    isSubmitting: boolean;
  }>({
    isOpen: false,
    taskId: null,
    taskTitle: '',
    isSubmitting: false
  });

  const [designFields, setDesignFields] = useState<{
    design_file_url: string;
  }>({
    design_file_url: '',
  });

  const [selectedTaskForDetails, setSelectedTaskForDetails] = useState<any | null>(null);

  // ✅ FIX: Build task views directly from tasksStore.tasks (from DB)
  const allTasks: TaskView[] = useMemo(() => {
    let taskList = tasks.map((t) => ({
      id: t.id,
      title: t.title,
      type: t.type,
      status: t.status as TaskStatus,
      orderId: t.orderId,
      orderNumber: t.orderNumber || t.orderId?.slice(0, 8) || '',
      customer: t.orders?.customers?.name
        || t.orders?.guest_info?.name
        || t.orders?.shipping_address?.name
        || (typeof t.customer === 'string' ? t.customer : ''),
      assignedTo: t.assignedTo,
      assignedToId: t.assignedToId,
    }));

    // Workers only see their own assigned tasks
    if (user?.role === 'worker') {
      taskList = taskList.filter(t => t.assignedToId === user.id);
    }

    return taskList;
  }, [tasks, user]);

  // Filter tasks by search
  const filteredTasks = useMemo(() => {
    if (!search) return allTasks;
    return allTasks.filter(
      (t) =>
        t.title.toLowerCase().includes(search.toLowerCase()) ||
        t.customer.toLowerCase().includes(search.toLowerCase()) ||
        t.orderNumber.toLowerCase().includes(search.toLowerCase())
    );
  }, [allTasks, search]);

  // Group tasks by status column
  const tasksByColumn = useMemo(() => {
    const grouped: Record<TaskStatus, TaskView[]> = {
      pending: [],
      in_progress: [],
      paused: [],
      completed: [],
    };
    filteredTasks.forEach((task) => {
      if (grouped[task.status]) {
        grouped[task.status].push(task);
      }
    });
    return grouped;
  }, [filteredTasks]);

  const onDragEnd = (result: DropResult) => {
    if (!result.destination) return;

    const sourceId = result.source.droppableId as TaskStatus;
    const destinationId = result.destination.droppableId as TaskStatus;

    if (sourceId === destinationId) return;

    const taskId = result.draggableId;
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;

    if (destinationId === 'completed') {
      const taskTypeStr = task.type as string; // Bypass strict typescript union matching because DB values like 'production' can exist.
      const isProductionTask = taskTypeStr === 'production' || taskTypeStr === 'printing' || task.title.includes('إنتاج') || task.title.includes('طباعة');

      if (taskTypeStr === 'design') {
        // Intercept: open Design Upload Modal
        setDesignModalConfig({
          isOpen: true,
          taskId,
          taskTitle: task.title,
          isSubmitting: false
        });
        setDesignFields({ design_file_url: '' });
      } else if (isProductionTask) {
        // Intercept: open Strict Mode Modal
        setCompletionModalConfig({
          isOpen: true,
          taskId,
          orderId: task.orderId,
          taskTitle: task.title,
          isSubmitting: false
        });
        setConsumptionFields({ blanksUsed: 0, blanksWasted: 0, inkUsedGrams: 0, reworkReason: '' });
      } else {
        // Direct complete for non-production tasks (Design, QC, Packing)
        moveTask(taskId, destinationId);
        toast.success(`تم إتمام المهمة: ${task.title}`);
      }
    } else {
      // ✅ FIX: use tasksStore.moveTask (calls api.tasks.updateStatus + reverts on failure)
      moveTask(taskId, destinationId);
      toast.success(`تم نقل المهمة إلى ${columns.find(c => c.id === destinationId)?.title}`);
    }
  };

  const handleStrictCompletion = async () => {
    if (!completionModalConfig.taskId || !completionModalConfig.orderId) return;

    // Strict Mode Validation
    if (consumptionFields.blanksUsed === 0 && consumptionFields.inkUsedGrams === 0) {
      toast.error('يجب إدخال الاستهلاك الفعلي (المنتجات أو الحبر) لإكمال المهمة');
      return;
    }

    if (consumptionFields.blanksWasted > 0 && !consumptionFields.reworkReason) {
      toast.error('يجب تحديد سبب التلف إذا كانت هناك قطع تالفة');
      return;
    }

    setCompletionModalConfig(prev => ({ ...prev, isSubmitting: true }));

    try {
      // 1. Call the BOM-aware inventory completion
      const response = await api.tasks.completeWithInventory({
        taskId: completionModalConfig.taskId,
        orderId: completionModalConfig.orderId,
        workerId: user?.id || '',
        consumption: consumptionFields
      });

      if (response.success) {
        // 2. ✅ FIX: Update task in tasksStore (not ordersStore)
        updateTask(completionModalConfig.taskId, { status: 'completed' });
        toast.success('تم إنهاء المهمة وخصم المواد من المخزون');
        setCompletionModalConfig({ isOpen: false, taskId: null, orderId: null, taskTitle: '', isSubmitting: false });
      } else {
        toast.error('فشل في إكمال المهمة');
      }
    } catch (error: any) {
      console.error('Task completion failed:', error);
      toast.error('تعذر الاتصال بالخادم. حاول مجدداً.');
    } finally {
      setCompletionModalConfig(prev => ({ ...prev, isSubmitting: false }));
    }
  };

  const handleDesignUpload = async () => {
    if (!designModalConfig.taskId) return;
    if (!designFields.design_file_url.trim()) {
      toast.error('يرجى إدخال رابط التصميم');
      return;
    }

    setDesignModalConfig(prev => ({ ...prev, isSubmitting: true }));

    try {
      const response = await api.tasks.update(designModalConfig.taskId, {
        design_file_url: designFields.design_file_url,
        status: 'completed',
        approval_status: 'pending' // Moves to customer approval pipeline
      });

      if (response.success) {
        updateTask(designModalConfig.taskId, { status: 'completed' });
        fetchTasks();
        toast.success('تم رفع التصميم وإرساله لموافقة العميل');
        setDesignModalConfig({ isOpen: false, taskId: null, taskTitle: '', isSubmitting: false });
      } else {
        toast.error('فشل في رفع التصميم');
      }
    } catch (error: any) {
      console.error('Design upload failed:', error);
      toast.error('تعذر الاتصال بالخادم. حاول مجدداً.');
    } finally {
      setDesignModalConfig(prev => ({ ...prev, isSubmitting: false }));
    }
  };

  return (
    <div>
      {/* Design Upload Modal */}
      {designModalConfig.isOpen && (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <h2 className="text-xl font-bold mb-2">رفع واعتماد التصميم</h2>
            <p className="text-gray-500 mb-6 text-sm">
              مهمة: "{designModalConfig.taskTitle}". <br />
              <b>يرجى إرفاق رابط التصميم النهائي (Google Drive, Canva, etc) لمراجعته من العميل.</b>
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">رابط التصميم (URL)</label>
                <input
                  type="url"
                  className="input w-full"
                  placeholder="https://..."
                  value={designFields.design_file_url}
                  onChange={e => setDesignFields(p => ({ ...p, design_file_url: e.target.value }))}
                />
              </div>
            </div>

            <div className="flex gap-4 mt-8">
              <button
                className="btn flex-1 border border-gray-300 hover:bg-gray-50 text-gray-700"
                onClick={() => setDesignModalConfig(p => ({ ...p, isOpen: false }))}
                disabled={designModalConfig.isSubmitting}
              >
                إلغاء
              </button>
              <button
                className="btn-primary flex-1"
                onClick={handleDesignUpload}
                disabled={designModalConfig.isSubmitting}
              >
                {designModalConfig.isSubmitting ? 'جاري المعالجة...' : 'رفع التصميم'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Strict Mode Overlay Modal */}
      {completionModalConfig.isOpen && (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <h2 className="text-xl font-bold mb-2">تأكيد إكمال المهمة</h2>
            <p className="text-gray-500 mb-6 text-sm">
              أنت على وشك إنهاء مهمة "{completionModalConfig.taskTitle}". <br />
              <b>نظام صارم:</b> يجب تسجيل المواد المستهلكة بدقة.
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">القطع المنتجة (صالحة)</label>
                <input
                  type="number"
                  min="0"
                  className="input w-full"
                  value={consumptionFields.blanksUsed}
                  onChange={e => setConsumptionFields(p => ({ ...p, blanksUsed: parseInt(e.target.value) || 0 }))}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-red-600 mb-1">القطع التالفة (Waste)</label>
                <input
                  type="number"
                  min="0"
                  className="input w-full border-red-200 focus:border-red-500 focus:ring-red-200 bg-red-50"
                  value={consumptionFields.blanksWasted}
                  onChange={e => setConsumptionFields(p => ({ ...p, blanksWasted: parseInt(e.target.value) || 0 }))}
                />
              </div>

              {consumptionFields.blanksWasted > 0 && (
                <div>
                  <label className="block text-sm font-medium text-red-700 mb-1">سبب التلف (مطلوب)</label>
                  <select
                    className="input w-full border-red-200 focus:border-red-500 bg-white"
                    value={consumptionFields.reworkReason}
                    onChange={e => setConsumptionFields(p => ({ ...p, reworkReason: e.target.value }))}
                  >
                    <option value="">-- اختر السبب --</option>
                    <option value="خطأ في التسجيل (Registration)">خطأ في التسجيل (Registration Error)</option>
                    <option value="تلطخ الحبر">تلطخ الحبر (Ink Smudge)</option>
                    <option value="تلف أثناء التجفيف (Curing)">تلف أثناء التجفيف المفرط</option>
                    <option value="ثقوب صغيرة (Pinholes)">ثقوب بالشاشة (Pinholes)</option>
                    <option value="تلف التصدير (Setup Spoilage)">تلف إعداد التجربة (Setup Spoilage)</option>
                    <option value="أخرى">أخرى</option>
                  </select>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-purple-700 mb-1">الحبر المستهلك (غرام - تقدير)</label>
                <input
                  type="number"
                  min="0"
                  className="input w-full border-purple-200 focus:border-purple-500 focus:ring-purple-200 bg-purple-50"
                  value={consumptionFields.inkUsedGrams}
                  onChange={e => setConsumptionFields(p => ({ ...p, inkUsedGrams: parseInt(e.target.value) || 0 }))}
                />
                <p className="text-xs text-gray-400 mt-1">مثال: 150 لـ 150 غرام</p>
              </div>
            </div>

            <div className="flex gap-4 mt-8">
              <button
                className="btn flex-1 border border-gray-300 hover:bg-gray-50 text-gray-700"
                onClick={() => setCompletionModalConfig(p => ({ ...p, isOpen: false }))}
                disabled={completionModalConfig.isSubmitting}
              >
                إلغاء
              </button>
              <button
                className="btn-primary flex-1"
                onClick={handleStrictCompletion}
                disabled={completionModalConfig.isSubmitting}
              >
                {completionModalConfig.isSubmitting ? 'جاري المعالجة...' : 'تأكيد وخصم المخزون'}
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedTaskForDetails && (
        <TaskDetailModal
          task={selectedTaskForDetails}
          isOpen={true}
          onClose={() => setSelectedTaskForDetails(null)}
        />
      )}

      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">لوحة المهام الإنتاجية</h1>
        <button
          onClick={() => fetchTasks()}
          disabled={isLoading}
          className="btn btn-secondary flex items-center gap-2 text-sm"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          {isLoading ? 'جاري التحميل...' : 'تحديث'}
        </button>
      </div>

      {/* Filters */}
      <div className="card p-4 mb-6">
        <div className="flex flex-wrap gap-4">
          <div className="relative max-w-md flex-1">
            <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="بحث في المهام..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input pr-12"
            />
          </div>
          <button className="btn btn-secondary flex items-center gap-2">
            <Filter className="w-4 h-4" />
            تصفية
          </button>
          <span className="text-sm text-gray-500 flex items-center">
            إجمالي المهام: <strong className="mr-1">{allTasks.length}</strong>
          </span>
        </div>
      </div>

      {/* Kanban Board */}
      <DragDropContext onDragEnd={onDragEnd}>
        <div className="grid grid-cols-4 gap-4">
          {columns.map((column) => (
            <div key={column.id} className="flex flex-col">
              <div className={`p-3 rounded-t-xl ${column.color}`}>
                <div className="flex items-center justify-between">
                  <h3 className="font-bold">{column.title}</h3>
                  <span className="bg-white px-2 py-1 rounded-full text-sm font-medium">
                    {tasksByColumn[column.id].length}
                  </span>
                </div>
              </div>
              <Droppable droppableId={column.id}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`flex-1 min-h-[400px] bg-gray-50/50 p-3 rounded-b-xl border-2 border-t-0 ${snapshot.isDraggingOver ? 'border-primary bg-primary/5' : 'border-transparent'
                      }`}
                  >
                    {isLoading && tasksByColumn[column.id].length === 0 && (
                      <p className="text-sm text-gray-400 text-center py-8">جاري التحميل...</p>
                    )}
                    {tasksByColumn[column.id].map((task, index) => (
                      <Draggable key={task.id} draggableId={task.id} index={index}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            onClick={() => setSelectedTaskForDetails(tasks.find(tk => tk.id === task.id))}
                            className={`card p-3 mb-3 cursor-pointer transition-all ${snapshot.isDragging ? 'shadow-lg rotate-2' : 'hover:shadow-md'
                              }`}
                          >
                            <div className="flex items-start justify-between mb-2">
                              <span className="text-lg">{getTaskTypeIcon(task.type)}</span>
                              <div className="flex items-center gap-1">
                                <AlertCircle className={`w-4 h-4 ${getPriorityColor(task.type)}`} />
                              </div>
                            </div>
                            <h4 className="font-medium mb-2 text-sm">{task.title}</h4>
                            <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
                              <span>{task.orderNumber}</span>
                              <span>{task.customer ? task.customer.slice(0, 15) : '—'}</span>
                            </div>
                            <div className="flex items-center justify-between pt-2 border-t">
                              <div className="flex items-center gap-1 text-xs text-gray-400">
                                <Clock className="w-3 h-3" />
                                2س
                              </div>
                              {task.assignedTo ? (
                                <div className="flex items-center gap-1">
                                  <div className="w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center text-xs">
                                    {task.assignedTo[0]}
                                  </div>
                                </div>
                              ) : (
                                <User className="w-4 h-4 text-gray-300" />
                              )}
                            </div>
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </div>
          ))}
        </div>
      </DragDropContext>
    </div>
  );
}
