import { useState } from 'react';
import { X, CheckCircle2, AlertTriangle, AlertCircle, Package } from 'lucide-react';
import { Task } from '../../store/tasksStore';

interface WorkerTaskCompletionModalProps {
    task: Task;
    onClose: () => void;
    onComplete: (taskId: string, orderId: string, consumption: any) => void;
}

export default function WorkerTaskCompletionModal({ task, onClose, onComplete }: WorkerTaskCompletionModalProps) {
    const [blanksUsed, setBlanksUsed] = useState(task.order_items?.quantity || 0); // Default to expected quantity
    const [blanksWasted, setBlanksWasted] = useState(0);
    const [inkUsedGrams, setInkUsedGrams] = useState(0);
    const [reworkReason, setReworkReason] = useState('Unspecified');
    const [notes, setNotes] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            await onComplete(task.id, task.orderId, {
                blanksUsed,
                blanksWasted,
                inkUsedGrams,
                reworkReason: blanksWasted > 0 ? reworkReason : '',
                notes
            });
            onClose();
        } catch (err) {
            // Error is handled by the parent
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
                <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                    <div>
                        <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                            إتمام المهمة وإغلاقها
                        </h2>
                        <p className="text-sm text-gray-500 mt-1">تأكيد الكميات المستهلكة لإدارة المخزون</p>
                    </div>
                    <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-6 overflow-y-auto">
                    <div className="mb-6 bg-blue-50 border border-blue-100 rounded-xl p-4">
                        <h3 className="font-bold text-blue-900 mb-2">{task.title}</h3>
                        <p className="text-sm text-blue-800">الكمية المطلوبة في الطلب: <span className="font-bold">{task.order_items?.quantity || 0}</span></p>
                    </div>

                    <form id="completionForm" onSubmit={handleSubmit} className="space-y-5">
                        <div className="space-y-4">
                            <h4 className="font-bold text-gray-800 flex items-center gap-2 border-b pb-2">
                                <Package className="w-4 h-4 text-gray-500" />
                                استهلاك المواد
                            </h4>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">الكمية المنتجة (الناجحة)</label>
                                    <input
                                        type="number"
                                        min="0"
                                        required
                                        className="input w-full bg-emerald-50 border-emerald-200 focus:ring-emerald-500"
                                        value={blanksUsed}
                                        onChange={(e) => setBlanksUsed(Number(e.target.value))}
                                    />
                                    <span className="text-xs text-gray-500 mt-1 block">يجب أن تطابق الكمية المطلوبة عادةً</span>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1 flex justify-between">
                                        التالف / الهالك
                                        {blanksWasted > 0 && <AlertTriangle className="w-4 h-4 text-orange-500" />}
                                    </label>
                                    <input
                                        type="number"
                                        min="0"
                                        required
                                        className="input w-full bg-orange-50 border-orange-200 focus:ring-orange-500"
                                        value={blanksWasted}
                                        onChange={(e) => setBlanksWasted(Number(e.target.value))}
                                    />
                                </div>
                            </div>

                            {blanksWasted > 0 && (
                                <div className="animate-in fade-in slide-in-from-top-2 p-3 bg-orange-50 rounded-lg border border-orange-100">
                                    <label className="block text-sm font-bold text-orange-800 mb-2 flex items-center gap-1">
                                        <AlertCircle className="w-4 h-4" />
                                        سبب الإتلاف (لتسجيل الخسارة)
                                    </label>
                                    <select
                                        required
                                        className="input w-full bg-white border-orange-200"
                                        value={reworkReason}
                                        onChange={(e) => setReworkReason(e.target.value)}
                                    >
                                        <option value="Unspecified">غير محدد</option>
                                        <option value="Machine Error">خطأ في الآلة / إعدادات</option>
                                        <option value="Human Error">خطأ بشري / طباعة خاطئة</option>
                                        <option value="Material Defect">عيب مصنعي في المادة الأساسية</option>
                                    </select>
                                </div>
                            )}

                            {/* Optional Ink tracking - currently simplified but available for expansion */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    استهلاك الحبر التقريبي (بالغرام) - <span className="text-gray-400 font-normal">اختياري</span>
                                </label>
                                <input
                                    type="number"
                                    min="0"
                                    className="input w-full"
                                    value={inkUsedGrams}
                                    onChange={(e) => setInkUsedGrams(Number(e.target.value))}
                                    placeholder="0"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                ملاحظات الإنتاج (تظهر للإدارة)
                            </label>
                            <textarea
                                className="input w-full resize-none h-20"
                                placeholder="أي ملاحظات حول صعوبة التنفيذ أو ملاحظات لتفادي التلف مستقبلاً..."
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                            />
                        </div>
                    </form>
                </div>

                <div className="p-5 border-t border-gray-100 bg-gray-50 flex gap-3 justify-end shrink-0">
                    <button
                        type="button"
                        onClick={onClose}
                        className="btn bg-white border border-gray-300 text-gray-700 hover:bg-gray-50"
                        disabled={isSubmitting}
                    >
                        إلغاء
                    </button>
                    <button
                        type="submit"
                        form="completionForm"
                        disabled={isSubmitting}
                        className="btn bg-emerald-600 text-white hover:bg-emerald-700 font-bold flex items-center gap-2"
                    >
                        {isSubmitting ? (
                            <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                            <CheckCircle2 className="w-5 h-5" />
                        )}
                        تأكيد الإنجاز وخصم المخزون
                    </button>
                </div>
            </div>
        </div>
    );
}
