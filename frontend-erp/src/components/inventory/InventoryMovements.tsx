import { useState, useEffect } from 'react';
import { Loader2, ArrowUpRight, ArrowDownRight, RefreshCcw } from 'lucide-react';
import { format } from 'date-fns';
import { ar } from 'date-fns/locale';
import toast from 'react-hot-toast';
import { api } from '../../services/api';

interface Movement {
    id: string;
    item_id: string;
    transaction_type: 'in' | 'out' | 'adj';
    quantity: number;
    reference_id: string | null;
    notes: string;
    created_at: string;
    inventory_items?: { name: string };
}

export default function InventoryMovements() {
    const [movements, setMovements] = useState<Movement[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchMovements = async () => {
        try {
            setLoading(true);
            const { data, success } = await api.inventory.getMovements();
            if (success) {
                setMovements(data || []);
            }
        } catch (error) {
            toast.error('حدث خطأ أثناء تحميل الحركات');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchMovements();
    }, []);

    const getTypeDisplay = (type: string) => {
        switch (type) {
            case 'in':
                return {
                    label: 'إدخال (شراء)',
                    color: 'text-green-600 bg-green-50 border-green-200',
                    icon: <ArrowDownRight className="w-4 h-4" />
                };
            case 'out':
                return {
                    label: 'إخراج (إنتاج/تالف)',
                    color: 'text-red-600 bg-red-50 border-red-200',
                    icon: <ArrowUpRight className="w-4 h-4" />
                };
            case 'adj':
                return {
                    label: 'تسوية يدوية',
                    color: 'text-orange-600 bg-orange-50 border-orange-200',
                    icon: <RefreshCcw className="w-4 h-4" />
                };
            default:
                return {
                    label: type,
                    color: 'text-gray-600 bg-gray-50 border-gray-200',
                    icon: null
                };
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    if (movements.length === 0) {
        return (
            <div className="text-center py-12 text-gray-500">
                لا توجد حركات مسجلة في المخزون حتى الآن.
            </div>
        );
    }

    return (
        <div className="overflow-x-auto bg-white rounded-xl shadow-sm border border-gray-200">
            <table className="w-full text-right border-collapse">
                <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                        <th className="p-4 font-semibold text-gray-600">التاريخ</th>
                        <th className="p-4 font-semibold text-gray-600">المادة</th>
                        <th className="p-4 font-semibold text-gray-600">نوع الحركة</th>
                        <th className="p-4 font-semibold text-gray-600">الكمية</th>
                        <th className="p-4 font-semibold text-gray-600">المرجع</th>
                        <th className="p-4 font-semibold text-gray-600">ملاحظات</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                    {movements.map((mov) => {
                        const typeInfo = getTypeDisplay(mov.transaction_type);
                        return (
                            <tr key={mov.id} className="hover:bg-gray-50 transition-colors">
                                <td className="p-4 text-sm text-gray-600" dir="ltr">
                                    {format(new Date(mov.created_at), 'dd MMM yyyy, HH:mm', { locale: ar })}
                                </td>
                                <td className="p-4 font-bold text-gray-900">
                                    {mov.inventory_items?.name || 'مادة محذوفة'}
                                </td>
                                <td className="p-4">
                                    <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold border ${typeInfo.color}`}>
                                        {typeInfo.icon}
                                        {typeInfo.label}
                                    </div>
                                </td>
                                <td className="p-4 font-bold" dir="ltr">
                                    {mov.transaction_type === 'out' ? '-' : '+'}{mov.quantity}
                                </td>
                                <td className="p-4 text-sm text-gray-500" dir="ltr">
                                    {mov.reference_id ? `#${mov.reference_id.slice(0, 8)}` : '-'}
                                </td>
                                <td className="p-4 text-sm text-gray-600 max-w-xs truncate" title={mov.notes}>
                                    {mov.notes || '-'}
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}
