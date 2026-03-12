import { Plus, Trash2, Copy, ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';
import type { ProductFormData, AttributeGroup, AttributeValue, WeightUnit } from '../../types/product';

interface Props {
    data: ProductFormData;
    onChange: (patch: Partial<ProductFormData>) => void;
}

const emptyValue = (): AttributeValue => ({
    name_ar: '',
    name_en: '',
    price_delta: 0,
    weight_delta: 0,
    weight_unit: 'g',
});

const emptyGroup = (): AttributeGroup => ({
    name_ar: '',
    name_en: '',
    select_type: 'single',
    sort_order: 0,
    values: [emptyValue()],
});

export default function AttributesTab({ data, onChange }: Props) {
    const [collapsed, setCollapsed] = useState<Record<number, boolean>>({});
    const groups = data.attribute_groups;

    const update = (updated: AttributeGroup[]) => onChange({ attribute_groups: updated });

    const addGroup = () => update([...groups, { ...emptyGroup(), sort_order: groups.length }]);
    const duplicateGroup = (i: number) =>
        update([...groups.slice(0, i + 1), { ...groups[i], id: undefined }, ...groups.slice(i + 1)]);
    const removeGroup = (i: number) => update(groups.filter((_, idx) => idx !== i));
    const patchGroup = (i: number, patch: Partial<AttributeGroup>) =>
        update(groups.map((g, idx) => (idx === i ? { ...g, ...patch } : g)));

    const addValue = (gi: number) =>
        patchGroup(gi, { values: [...groups[gi].values, emptyValue()] });
    const removeValue = (gi: number, vi: number) =>
        patchGroup(gi, { values: groups[gi].values.filter((_, idx) => idx !== vi) });
    const patchValue = (gi: number, vi: number, patch: Partial<AttributeValue>) =>
        patchGroup(gi, {
            values: groups[gi].values.map((v, idx) => (idx === vi ? { ...v, ...patch } : v)),
        });

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="font-bold">مجموعات الخصائص والمتغيرات</h3>
                    <p className="text-xs text-gray-500 mt-0.5">
                        مثال: نوع الورق، الأركان، المقاس، اللون — مع تأثير على السعر والوزن
                    </p>
                </div>
                <button
                    type="button"
                    onClick={addGroup}
                    className="flex items-center gap-1.5 px-3 py-2 bg-primary text-white text-sm rounded-lg hover:opacity-90"
                >
                    <Plus className="w-4 h-4" />
                    إضافة مجموعة
                </button>
            </div>

            {groups.length === 0 && (
                <div className="p-10 text-center text-gray-400 border-2 border-dashed rounded-xl">
                    <p className="text-sm">لا توجد مجموعات خصائص بعد</p>
                    <p className="text-xs mt-1">مثال: نوع الورق (مصقول / مطفي / كرافت)</p>
                </div>
            )}

            {groups.map((group, gi) => (
                <div key={gi} className="border rounded-xl overflow-hidden">
                    {/* Group Header */}
                    <div className="flex items-center gap-3 p-4 bg-gray-50 border-b">
                        <button
                            type="button"
                            onClick={() => setCollapsed((c) => ({ ...c, [gi]: !c[gi] }))}
                            className="p-1 hover:bg-gray-200 rounded"
                        >
                            {collapsed[gi] ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                        </button>
                        <div className="flex-1 grid grid-cols-2 gap-3">
                            <input
                                type="text"
                                dir="rtl"
                                value={group.name_ar}
                                onChange={(e) => patchGroup(gi, { name_ar: e.target.value })}
                                className="input text-sm"
                                placeholder="اسم المجموعة (عربي)"
                            />
                            <input
                                type="text"
                                dir="ltr"
                                value={group.name_en}
                                onChange={(e) => patchGroup(gi, { name_en: e.target.value })}
                                className="input text-sm"
                                placeholder="Group name (English)"
                            />
                        </div>
                        <select
                            value={group.select_type}
                            onChange={(e) => patchGroup(gi, { select_type: e.target.value as 'single' | 'multi' })}
                            className="input text-sm w-36"
                        >
                            <option value="single">اختيار واحد</option>
                            <option value="multi">اختيار متعدد</option>
                        </select>
                        <div className="flex gap-1">
                            <button
                                type="button"
                                onClick={() => duplicateGroup(gi)}
                                className="p-1.5 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded"
                                title="نسخ"
                            >
                                <Copy className="w-4 h-4" />
                            </button>
                            <button
                                type="button"
                                onClick={() => removeGroup(gi)}
                                className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded"
                                title="حذف"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    {/* Values */}
                    {!collapsed[gi] && (
                        <div className="p-4 space-y-2">
                            {/* Column headers */}
                            <div className="grid grid-cols-[1fr_1fr_auto_auto_auto] gap-2 text-xs text-gray-500 font-medium px-1">
                                <span>الاسم (عربي)</span>
                                <span>Name (EN)</span>
                                <span className="text-center w-28">Δ سعر (دج)</span>
                                <span className="text-center w-36">Δ وزن</span>
                                <span></span>
                            </div>
                            {group.values.map((val, vi) => (
                                <div key={vi} className="grid grid-cols-[1fr_1fr_auto_auto_auto] gap-2 items-center">
                                    <input
                                        type="text"
                                        dir="rtl"
                                        value={val.name_ar}
                                        onChange={(e) => patchValue(gi, vi, { name_ar: e.target.value })}
                                        className="input text-sm"
                                        placeholder="الاسم بالعربية"
                                    />
                                    <input
                                        type="text"
                                        dir="ltr"
                                        value={val.name_en}
                                        onChange={(e) => patchValue(gi, vi, { name_en: e.target.value })}
                                        className="input text-sm"
                                        placeholder="Name in English"
                                    />
                                    {/* Price Delta */}
                                    <div className="flex items-center gap-1 bg-gray-100 px-2 py-1.5 rounded-lg w-28">
                                        <input
                                            type="number"
                                            value={val.price_delta}
                                            onChange={(e) => patchValue(gi, vi, { price_delta: parseFloat(e.target.value) || 0 })}
                                            className="w-14 bg-transparent text-center text-sm"
                                            step="0.01"
                                        />
                                        <span className="text-gray-500 text-xs">دج</span>
                                    </div>
                                    {/* Weight Delta */}
                                    <div className="flex items-center gap-1 bg-blue-50 px-2 py-1.5 rounded-lg w-36">
                                        <input
                                            type="number"
                                            value={val.weight_delta}
                                            onChange={(e) => patchValue(gi, vi, { weight_delta: parseFloat(e.target.value) || 0 })}
                                            className="w-12 bg-transparent text-center text-sm"
                                            step="0.001"
                                        />
                                        <select
                                            value={val.weight_unit}
                                            onChange={(e) => patchValue(gi, vi, { weight_unit: e.target.value as WeightUnit })}
                                            className="bg-transparent text-xs text-gray-600"
                                        >
                                            <option value="g">غ</option>
                                            <option value="kg">كغ</option>
                                        </select>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => removeValue(gi, vi)}
                                        className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            ))}
                            <button
                                type="button"
                                onClick={() => addValue(gi)}
                                className="flex items-center gap-1 text-sm text-primary hover:underline mt-2"
                            >
                                <Plus className="w-3.5 h-3.5" />
                                إضافة قيمة
                            </button>
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
}
