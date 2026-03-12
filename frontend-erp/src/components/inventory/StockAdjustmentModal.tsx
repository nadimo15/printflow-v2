import { useState } from 'react';
import { X, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../../services/api';

interface StockAdjustmentModalProps {
    isOpen: boolean;
    onClose: () => void;
    item: {
        id: string;
        name: string;
        stock_quantity: number;
        unit_of_measure: string;
    };
    onSuccess: () => void;
}

export default function StockAdjustmentModal({ isOpen, onClose, item, onSuccess }: StockAdjustmentModalProps) {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [newQty, setNewQty] = useState<number | ''>(item.stock_quantity);
    const [reason, setReason] = useState('');

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (newQty === '' || newQty < 0) {
            toast.error('الرجاء إدخال كمية صحيحة');
            return;
        }

        if (!reason.trim()) {
            toast.error('الرجاء إدخال سبب التسوية');
            return;
        }

        try {
            setIsSubmitting(true);
            const response = await api.inventory.adjustStock(item.id, Number(newQty), reason);

            if (response.success) {
                toast.success('تم تسوية المخزون بنجاح');
                onSuccess();
                onClose();
            } else {
                toast.error(response.error || 'فشلت عملية التسوية');
            }
        } catch (error) {
            console.error(error);
            toast.error('حدث عطل أثناء تحديث المخزون');
        } finally {
            setIsSubmitting(false);
        }
    };

    const delta = newQty === '' ? 0 : Number(newQty) - item.stock_quantity;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl relative">
                <button
                    onClick={onClose}
                    className="absolute top-4 left-4 p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
                >
                    <X className="w-5 h-5" />
                </button>

                <h2 className="text-xl font-bold mb-6 text-gray-900 border-b pb-4">
                    تسوية المخزون يدوياً
                </h2>

                <div className="mb-6 p-4 bg-gray-50 rounded-xl border border-gray-100">
                    <p className="text-sm text-gray-500 mb-1">المادة</p>
                    <p className="font-bold text-gray-900">{item.name}</p>
                    <div className="mt-3 flex justify-between items-center bg-white p-3 rounded-lg border border-gray-200">
                        <span className="text-gray-600 text-sm">الكمية الحالية:</span>
                        <span className="font-bold" dir="ltr">{item.stock_quantity} {item.unit_of_measure}</span>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">الكمية الجديدة (فعلية)</label>
                        <div className="relative">
                            <input
                                type="number"
                                min="0"
                                step="any"
                                required
                                className="input w-full pr-4 pl-16 py-3 text-lg font-bold text-gray-900"
                                dir="ltr"
                                value={newQty}
                                onChange={(e) => setNewQty(e.target.value ? Number(e.target.value) : '')}
                            />
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-medium select-none">
                                {item.unit_of_measure}
                            </span>
                        </div>
                        {newQty !== '' && delta !== 0 && (
                            <p className={`mt-2 text-sm font-medium ${delta > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                الفارق: {delta > 0 ? '+' : ''}{delta} {item.unit_of_measure}
                            </p>
                        )}
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">سبب التسوية / ملاحظات</label>
                        <textarea
                            required
                            rows={3}
                            placeholder="مثال: جرد يدوي، مواد تالفة بالمخزن..."
                            className="input w-full resize-none p-3"
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                        />
                    </div>

                    <div className="pt-4 flex gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors"
                        >
                            إلغاء
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting || newQty === '' || delta === 0 || !reason.trim()}
                            className="flex-1 px-4 py-2.5 bg-primary text-white rounded-xl font-medium hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'تأكيد التسوية'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
