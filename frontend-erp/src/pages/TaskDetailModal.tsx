import { X, Clock, User, CheckCircle, Play, Pause, AlertCircle, Calendar, Package } from 'lucide-react';
import { Task, TaskStatus, useTasksStore } from '../store/tasksStore';
import { useEmployeesStore } from '../store/employeesStore';
import { useEffect } from 'react';
import { api } from '../services/api';
import toast from 'react-hot-toast';
import TaskDesignInterface from '../components/TaskDesignInterface';

interface TaskDetailModalProps {
  task: Task | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function TaskDetailModal({ task, isOpen, onClose }: TaskDetailModalProps) {
  const { moveTask, fetchTasks } = useTasksStore();
  const { employees, fetchEmployees } = useEmployeesStore();

  useEffect(() => {
    if (isOpen) fetchEmployees();
  }, [isOpen, fetchEmployees]);

  if (!isOpen || !task) return null;

  const handleStatusChange = (newStatus: TaskStatus) => {
    moveTask(task.id, newStatus);
    toast.success('تم تحديث حالة المهمة');
  };

  const handleAssign = async (employeeId: string) => {
    try {
      await api.tasks.assign(task.id, employeeId);
      await fetchTasks();
      toast.success('تم تعيين الموظف');
    } catch {
      toast.error('حدث خطأ في تعيين الموظف');
    }
  };

  const getStatusConfig = (status: TaskStatus) => {
    switch (status) {
      case 'pending':
        return { icon: Clock, class: 'bg-gray-100 text-gray-800', label: 'قيد الانتظار' };
      case 'in_progress':
        return { icon: Play, class: 'bg-blue-100 text-blue-800', label: 'قيد التنفيذ' };
      case 'paused':
        return { icon: Pause, class: 'bg-yellow-100 text-yellow-800', label: 'متوقفة' };
      case 'completed':
        return { icon: CheckCircle, class: 'bg-green-100 text-green-800', label: 'مكتملة' };
      default:
        return { icon: AlertCircle, class: 'bg-gray-100 text-gray-800', label: status };
    }
  };

  const statusConfig = getStatusConfig(task.status);
  const StatusIcon = statusConfig.icon;

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'design': return 'تصميم';
      case 'pre_press': return 'إعدادات الطباعة';
      case 'printing': return 'طباعة/إنتاج';
      case 'quality_check': return 'فحص جودة';
      case 'packing': return 'تغليف';
      default: return type;
    }
  };

  const getPriorityLabel = (priority: string) => {
    switch (priority) {
      case 'high': return 'عالية';
      case 'normal': return 'متوسطة';
      case 'low': return 'منخفضة';
      default: return priority;
    }
  };

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg bg-white rounded-xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b bg-gray-50">
          <div className="flex items-center gap-4">
            <div className={`p-2 rounded-lg ${statusConfig.class}`}>
              <StatusIcon className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold">{task.title}</h2>
              <p className="text-gray-500">{task.orderNumber} - {task.customer}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Status Actions */}
          <div className="flex flex-wrap gap-2">
            {task.status !== 'pending' && (
              <button
                onClick={() => handleStatusChange('pending')}
                className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200"
              >
                قيد الانتظار
              </button>
            )}
            {task.status !== 'in_progress' && (
              <button
                onClick={() => handleStatusChange('in_progress')}
                className="px-3 py-1.5 bg-blue-100 text-blue-700 rounded-lg text-sm hover:bg-blue-200"
              >
                بدء التنفيذ
              </button>
            )}
            {task.status !== 'paused' && (
              <button
                onClick={() => handleStatusChange('paused')}
                className="px-3 py-1.5 bg-yellow-100 text-yellow-700 rounded-lg text-sm hover:bg-yellow-200"
              >
                إيقاف مؤقت
              </button>
            )}
            {task.status !== 'completed' && (
              <button
                onClick={() => handleStatusChange('completed')}
                className="px-3 py-1.5 bg-green-100 text-green-700 rounded-lg text-sm hover:bg-green-200"
              >
                إكمال المهمة
              </button>
            )}
          </div>

          {/* Design Workflow Interface */}
          {task.type === 'design' && (
            <TaskDesignInterface task={task} onUpdate={() => { fetchTasks(); onClose(); }} />
          )}

          {/* Task Info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
                <Package className="w-4 h-4" />
                نوع المهمة
              </div>
              <p className="font-medium">{getTypeLabel(task.type)}</p>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
                <AlertCircle className="w-4 h-4" />
                الأولوية
              </div>
              <p className="font-medium">{getPriorityLabel(task.priority)}</p>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
                <Clock className="w-4 h-4" />
                الوقت المقدر
              </div>
              <p className="font-medium">{task.estimatedHours || '—'} ساعة</p>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
                <User className="w-4 h-4" />
                الموظف المكلف
              </div>
              <select
                className="w-full bg-white border rounded-lg p-1.5 text-sm font-medium"
                value={task.assignedToId || ''}
                onChange={(e) => handleAssign(e.target.value)}
              >
                <option value="">غير مسند</option>
                {employees.filter(emp => emp.is_active).map(emp => (
                  <option key={emp.id} value={emp.id}>{emp.name} ({emp.role === 'worker' ? 'عامل' : emp.role === 'manager' ? 'مشرف' : 'مدير'})</option>
                ))}
              </select>
            </div>
          </div>

          {/* Dates */}
          <div className="space-y-2">
            {task.startedAt && (
              <div className="flex items-center gap-2 text-sm">
                <Calendar className="w-4 h-4 text-gray-400" />
                <span className="text-gray-500">تاريخ البدء:</span>
                <span>{task.startedAt}</span>
              </div>
            )}
            {task.completedAt && (
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span className="text-gray-500">تاريخ الإكمال:</span>
                <span>{task.completedAt}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
