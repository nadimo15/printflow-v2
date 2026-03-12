import { Plus, Trash2, Copy, ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';
import type { ProductFormData, ProductionOption, ProductionOptionValue } from '../../types/product';

interface Props {
    data: ProductFormData;
    onChange: (patch: Partial<ProductFormData>) => void;
}

const emptyValue = (): ProductionOptionValue => ({
    name_ar: '',
    name_en: '',
    price_delta: 0,
    is_default: false,
});

const emptyOption = (): ProductionOption => ({
    name_ar: '',
    name_en: '',
    select_type: 'single',
    sort_order: 0,
    values: [emptyValue()],
});

export default function ProductionOptionsTab({ data, onChange }: Props) {
    const [collapsed, setCollapsed] = useState<Record<number, boolean>>({});
    const options = data.production_options;

    const update = (updated: ProductionOption[]) => onChange({ production_options: updated });

    const addOption = () => update([...options, { ...emptyOption(), sort_order: options.length }]);

    const duplicateOption = (i: number) =>
        update([...options.slice(0, i + 1), { ...options[i], id: undefined }, ...options.slice(i + 1)]);

    const removeOption = (i: number) => update(options.filter((_, idx) => idx !== i));

    const patchOption = (i: number, patch: Partial<ProductionOption>) =>
        update(options.map((o, idx) => (idx === i ? { ...o, ...patch } : o)));

    const addValue = (oi: number) =>
        patchOption(oi, { values: [...options[oi].values, emptyValue()] });

    const removeValue = (oi: number, vi: number) =>
        patchOption(oi, { values: options[oi].values.filter((_, idx) => idx !== vi) });

    const patchValue = (oi: number, vi: number, patch: Partial<ProductionOptionValue>) =>
        patchOption(oi, {
            values: options[oi].values.map((v, idx) => (idx === vi ? { ...v, ...patch } : v)),
        });

    const toggleDefault = (oi: number, vi: number) => {
        const option = options[oi];
        const newValues = option.values.map((v, idx) => ({
            ...v,
            is_default: option.select_type === 'single' ? idx === vi : idx === vi ? !v.is_default : v.is_default,
        }));
        patchOption(oi, { values: newValues });
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="font-bold">خيارات الإنتاج والطباعة</h3>
                    <p className="text-xs text-gray-500 mt-0.5">
                        أضف مجموعات خيارات مثل: وجه الطباعة، التشطيب، التلميع، الورنيش، خدمة التصميم...
                    </p>
                </div>
                <button
                    type="button"
                    onClick={addOption}
                    className="flex items-center gap-1.5 px-3 py-2 bg-primary text-white text-sm rounded-lg hover:opacity-90"
                >
                    <Plus className="w-4 h-4" />
                    إضافة مجموعة
                </button>
            </div>

            {options.length === 0 && (
                <div className="p-10 text-center text-gray-400 border-2 border-dashed rounded-xl">
                    <p className="text-sm">لا توجد خيارات إنتاج بعد</p>
                    <p className="text-xs mt-1">مثال: وجه الطباعة (وجه واحد / وجهين)</p>
                </div>
            )}

            {options.map((option, oi) => (
                <div key={oi} className="border rounded-xl overflow-hidden">
                    {/* Option Header */}
                    <div className="flex items-center gap-3 p-4 bg-gray-50 border-b">
                        <button
                            type="button"
                            onClick={() => setCollapsed((c) => ({ ...c, [oi]: !c[oi] }))}
                            className="p-1 hover:bg-gray-200 rounded"
                        >
                            {collapsed[oi] ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                        </button>
                        <div className="flex-1 grid grid-cols-2 gap-3">
                            <input
                                type="text"
                                dir="rtl"
                                value={option.name_ar}
                                onChange={(e) => patchOption(oi, { name_ar: e.target.value })}
                                className="input text-sm"
                                placeholder="اسم المجموعة (عربي)"
                            />
                            <input
                                type="text"
                                dir="ltr"
                                value={option.name_en}
                                onChange={(e) => patchOption(oi, { name_en: e.target.value })}
                                className="input text-sm"
                                placeholder="Group name (English)"
                            />
                        </div>
                        <select
                            value={option.select_type}
                            onChange={(e) => patchOption(oi, { select_type: e.target.value as 'single' | 'multi' })}
                            className="input text-sm w-36"
                        >
                            <option value="single">اختيار واحد</option>
                            <option value="multi">اختيار متعدد</option>
                        </select>
                        <div className="flex gap-1">
                            <button
                                type="button"
                                onClick={() => duplicateOption(oi)}
                                className="p-1.5 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded"
                                title="نسخ"
                            >
                                <Copy className="w-4 h-4" />
                            </button>
                            <button
                                type="button"
                                onClick={() => removeOption(oi)}
                                className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded"
                                title="حذف"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    {/* Option Values */}
                    {!collapsed[oi] && (
                        <div className="p-4 space-y-2">
                            {option.values.map((val, vi) => (
                                <div key={vi} className="flex items-center gap-2">
                                    <input
                                        type="text"
                                        dir="rtl"
                                        value={val.name_ar}
                                        onChange={(e) => patchValue(oi, vi, { name_ar: e.target.value })}
                                        className="input flex-1 text-sm"
                                        placeholder="الاسم بالعربية"
                                    />
                                    <input
                                        type="text"
                                        dir="ltr"
                                        value={val.name_en}
                                        onChange={(e) => patchValue(oi, vi, { name_en: e.target.value })}
                                        className="input flex-1 text-sm"
                                        placeholder="Name in English"
                                    />
                                    <div className="flex items-center gap-1 bg-gray-100 px-2 py-1.5 rounded-lg text-sm">
                                        <span className="text-gray-500 text-xs">Δ سعر</span>
                                        <input
                                            type="number"
                                            value={val.price_delta}
                                            onChange={(e) => patchValue(oi, vi, { price_delta: parseFloat(e.target.value) || 0 })}
                                            className="w-16 bg-transparent text-center text-sm"
                                            step="0.01"
                                        />
                                        <span className="text-gray-500 text-xs">دج</span>
                                    </div>
                                    <label
                                        className="flex items-center gap-1 text-xs text-gray-600 cursor-pointer whitespace-nowrap"
                                        title="افتراضي"
                                    >
                                        <input
                                            type="checkbox"
                                            checked={val.is_default}
                                            onChange={() => toggleDefault(oi, vi)}
                                            className="w-3.5 h-3.5"
                                        />
                                        افتراضي
                                    </label>
                                    <button
                                        type="button"
                                        onClick={() => removeValue(oi, vi)}
                                        className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            ))}
                            <button
                                type="button"
                                onClick={() => addValue(oi)}
                                className="flex items-center gap-1 text-sm text-primary hover:underline mt-2"
                            >
                                <Plus className="w-3.5 h-3.5" />
                                إضافة خيار
                            </button>
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
}
