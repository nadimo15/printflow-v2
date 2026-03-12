import { useState, useEffect } from 'react';
import { X, Plus, Trash2, GripVertical, CheckCircle } from 'lucide-react';
import { Task, generateTasks, Order } from '../store/ordersStore';

interface TaskCustomizationModalProps {
    order: Order;
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (tasks: Task[]) => void;
    isSubmitting: boolean;
}

export default function TaskCustomizationModal({
    order,
    isOpen,
    onClose,
    onConfirm,
    isSubmitting
}: TaskCustomizationModalProps) {
    const [tasks, setTasks] = useState<Task[]>([]);
    const [newTaskTitle, setNewTaskTitle] = useState('');
    const [newTaskType, setNewTaskType] = useState('other');

    // Load default tasks when modal opens
    useEffect(() => {
        if (isOpen) {
            setTasks(generateTasks(order, order.items || []));
        }
    }, [isOpen, order]);

    if (!isOpen) return null;

    const handleAddTask = () => {
        if (!newTaskTitle.trim()) return;

        const newTask: Task = {
            id: `custom-${Date.now()}`,
            title: newTaskTitle,
            type: newTaskType,
            status: 'pending'
        };

        setTasks([...tasks, newTask]);
        setNewTaskTitle('');
        setNewTaskType('other');
    };

    const handleRemoveTask = (taskId: string) => {
        setTasks(tasks.filter(t => t.id !== taskId));
    };

    const handleUpdateTaskTitle = (taskId: string, newTitle: string) => {
        setTasks(tasks.map(t => t.id === taskId ? { ...t, title: newTitle } : t));
    };

    const getTypeLabel = (type: string) => {
        switch (type) {
            case 'design': return 'تصميم';
            case 'printing': return 'طباعة';
            case 'quality_check': return 'جودة';
            case 'packing': return 'تغليف';
            default: return 'أخرى';
        }
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">

                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b">
                    <div>
                        <h2 className="text-xl font-bold">تخصيص مهام الإنتاج</h2>
                        <p className="text-gray-500 text-sm mt-1">قم بمراجعة وتعديل المهام قبل تأكيد الطلب</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">

                    {/* Add New Task Form */}
                    <div className="bg-gray-50 p-4 rounded-lg mb-6 border border-gray-200">
                        <h3 className="font-medium mb-3 text-sm text-gray-700">إضافة مهمة جديدة</h3>
                        <div className="flex gap-3">
                            <input
                                type="text"
                                placeholder="عنوان المهمة (مثلاً: طباعة أولية)"
                                value={newTaskTitle}
                                onChange={(e) => setNewTaskTitle(e.target.value)}
                                className="flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary/20 outline-none"
                                onKeyDown={(e) => e.key === 'Enter' && handleAddTask()}
                            />
                            <select
                                value={newTaskType}
                                onChange={(e) => setNewTaskType(e.target.value)}
                                className="px-3 py-2 border rounded-lg outline-none bg-white"
                            >
                                <option value="design">تصميم</option>
                                <option value="printing">طباعة</option>
                                <option value="quality_check">فحص جودة</option>
                                <option value="packing">تغليف</option>
                                <option value="other">أخرى</option>
                            </select>
                            <button
                                onClick={handleAddTask}
                                disabled={!newTaskTitle.trim()}
                                className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                            >
                                <Plus className="w-4 h-4" />
                                إضافة
                            </button>
                        </div>
                    </div>

                    {/* Tasks List */}
                    <div className="space-y-3">
                        {tasks.map((task, index) => (
                            <div key={task.id} className="group flex items-center gap-3 p-3 bg-white border rounded-lg hover:border-primary/50 transition-colors shadow-sm">
                                <GripVertical className="w-4 h-4 text-gray-300 cursor-move" />

                                <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-xs font-medium text-gray-600">
                                    {index + 1}
                                </div>

                                <div className="flex-1">
                                    <input
                                        type="text"
                                        value={task.title}
                                        onChange={(e) => handleUpdateTaskTitle(task.id, e.target.value)}
                                        className="w-full font-medium text-gray-900 bg-transparent border-none focus:ring-0 p-0 placeholder-gray-400"
                                    />
                                    <div className="flex items-center gap-2 mt-1">
                                        <span className="text-xs px-2 py-0.5 bg-gray-100 rounded text-gray-600">
                                            {getTypeLabel(task.type)}
                                        </span>
                                    </div>
                                </div>

                                <button
                                    onClick={() => handleRemoveTask(task.id)}
                                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                                    title="حذف المهمة"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        ))}

                        {tasks.length === 0 && (
                            <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg border-dashed border-2 border-gray-200">
                                لا توجد مهام. أضف مهاماً للبدء.
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="p-6 border-t bg-gray-50 flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-6 py-2.5 text-gray-700 hover:bg-gray-200 rounded-lg font-medium"
                        disabled={isSubmitting}
                    >
                        إلغاء
                    </button>
                    <button
                        onClick={() => onConfirm(tasks)}
                        disabled={isSubmitting || tasks.length === 0}
                        className="px-6 py-2.5 bg-primary text-white rounded-lg hover:bg-primary-dark font-medium flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-primary/20"
                    >
                        {isSubmitting ? (
                            <>
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                جاري الإنشاء...
                            </>
                        ) : (
                            <>
                                <CheckCircle className="w-5 h-5" />
                                تأكيد وبدء الإنتاج ({tasks.length})
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
