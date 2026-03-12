import { useState } from 'react';
import { Plus, Trash2, Copy, Calculator } from 'lucide-react';
import type { ProductFormData, PriceTier } from '../../types/product';
import { computeUnitPrice, computeTotalPrice, validateTiers } from '../../utils/productDomain';

interface Props {
    data: ProductFormData;
    onChange: (patch: Partial<ProductFormData>) => void;
    errors: Record<string, string>;
}

export default function PricingTab({ data, onChange, errors }: Props) {
    const [previewQty, setPreviewQty] = useState(data.min_quantity || 100);

    const tiers = data.price_tiers;
    const tierErrors = validateTiers(tiers);

    const addTier = () => {
        const lastTier = tiers[tiers.length - 1];
        const newMinQty = lastTier ? (lastTier.max_qty ? lastTier.max_qty + 1 : lastTier.min_qty * 2) : data.min_quantity;
        onChange({
            price_tiers: [
                ...tiers,
                { min_qty: newMinQty, max_qty: null, unit_price: data.base_price },
            ],
        });
    };

    const duplicateTier = (index: number) => {
        const tier = tiers[index];
        onChange({
            price_tiers: [
                ...tiers.slice(0, index + 1),
                { ...tier, id: undefined },
                ...tiers.slice(index + 1),
            ],
        });
    };

    const updateTier = (index: number, patch: Partial<PriceTier>) => {
        const updated = tiers.map((t, i) => (i === index ? { ...t, ...patch } : t));
        onChange({ price_tiers: updated });
    };

    const removeTier = (index: number) => {
        onChange({ price_tiers: tiers.filter((_, i) => i !== index) });
    };

    const previewUnitPrice = computeUnitPrice(previewQty, tiers, data.base_price);
    const previewTotal = computeTotalPrice(previewQty, tiers, data.base_price);

    return (
        <div className="space-y-6">
            {/* Base Price */}
            <div className="grid md:grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-semibold mb-1.5">
                        السعر الأساسي للوحدة <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                        <input
                            type="number"
                            value={data.base_price}
                            onChange={(e) => onChange({ base_price: parseFloat(e.target.value) || 0 })}
                            className={`input w-full pl-14 ${errors.base_price ? 'border-red-400' : ''}`}
                            min="0"
                            step="0.01"
                        />
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-500 font-medium">
                            دج
                        </span>
                    </div>
                    {errors.base_price && <p className="text-red-500 text-xs mt-1">{errors.base_price}</p>}
                </div>
                <div className="flex items-end">
                    <div className="p-3 bg-blue-50 rounded-xl text-sm text-blue-700 w-full">
                        <p className="font-semibold mb-1">💡 كيف تعمل درجات الأسعار؟</p>
                        <p className="text-xs text-blue-600">
                            السعر الأساسي يُطبَّق عندما لا تنطبق أي شريحة. أضف شرائح لتقديم خصومات على الكميات الكبيرة.
                        </p>
                    </div>
                </div>
            </div>

            {/* Tier Validation Errors */}
            {tierErrors.length > 0 && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl">
                    {tierErrors.map((err, i) => (
                        <p key={i} className="text-red-600 text-sm">⚠ {err}</p>
                    ))}
                </div>
            )}

            {/* Pricing Tiers Table */}
            <div className="border rounded-xl overflow-hidden">
                <div className="flex items-center justify-between p-4 bg-gray-50 border-b">
                    <h3 className="font-bold text-sm">درجات الأسعار حسب الكمية</h3>
                    <button
                        type="button"
                        onClick={addTier}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-primary text-white rounded-lg hover:opacity-90 transition"
                    >
                        <Plus className="w-4 h-4" />
                        إضافة شريحة
                    </button>
                </div>

                {tiers.length === 0 ? (
                    <div className="p-8 text-center text-gray-400">
                        <Calculator className="w-10 h-10 mx-auto mb-2 opacity-40" />
                        <p className="text-sm">لا توجد شرائح أسعار بعد</p>
                        <p className="text-xs mt-1">سيُطبَّق السعر الأساسي على جميع الكميات</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50 border-b">
                                <tr>
                                    <th className="text-right p-3 font-medium text-gray-600">الحد الأدنى للكمية</th>
                                    <th className="text-right p-3 font-medium text-gray-600">الحد الأقصى (اختياري)</th>
                                    <th className="text-right p-3 font-medium text-gray-600">سعر الوحدة (دج)</th>
                                    <th className="p-3"></th>
                                </tr>
                            </thead>
                            <tbody>
                                {tiers.map((tier, index) => (
                                    <tr key={index} className="border-b last:border-0 hover:bg-gray-50">
                                        <td className="p-3">
                                            <input
                                                type="number"
                                                value={tier.min_qty}
                                                onChange={(e) => updateTier(index, { min_qty: parseInt(e.target.value) || 1 })}
                                                className="input w-28 text-sm"
                                                min="1"
                                            />
                                        </td>
                                        <td className="p-3">
                                            <div className="flex items-center gap-2">
                                                <input
                                                    type="number"
                                                    value={tier.max_qty ?? ''}
                                                    onChange={(e) =>
                                                        updateTier(index, {
                                                            max_qty: e.target.value === '' ? null : parseInt(e.target.value) || null,
                                                        })
                                                    }
                                                    className="input w-28 text-sm"
                                                    min="1"
                                                    placeholder="غير محدد"
                                                />
                                                {tier.max_qty === null && (
                                                    <span className="text-xs text-gray-400 whitespace-nowrap">∞ غير محدود</span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="p-3">
                                            <input
                                                type="number"
                                                value={tier.unit_price}
                                                onChange={(e) => updateTier(index, { unit_price: parseFloat(e.target.value) || 0 })}
                                                className="input w-28 text-sm"
                                                min="0"
                                                step="0.01"
                                            />
                                        </td>
                                        <td className="p-3">
                                            <div className="flex gap-1">
                                                <button
                                                    type="button"
                                                    onClick={() => duplicateTier(index)}
                                                    className="p-1.5 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded"
                                                    title="نسخ"
                                                >
                                                    <Copy className="w-4 h-4" />
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => removeTier(index)}
                                                    className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded"
                                                    title="حذف"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Price Preview Calculator */}
            <div className="p-4 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl border border-indigo-100">
                <h3 className="font-bold text-sm mb-3 text-indigo-800">🧮 حاسبة السعر</h3>
                <div className="flex items-center gap-4 flex-wrap">
                    <div>
                        <label className="block text-xs font-medium text-indigo-700 mb-1">الكمية</label>
                        <input
                            type="number"
                            value={previewQty}
                            onChange={(e) => setPreviewQty(Math.max(1, parseInt(e.target.value) || 1))}
                            className="input w-28 text-sm"
                            min="1"
                        />
                    </div>
                    <div className="flex-1 grid grid-cols-2 gap-3 min-w-0">
                        <div className="bg-white rounded-lg p-3 text-center border">
                            <p className="text-xs text-gray-500 mb-1">سعر الوحدة</p>
                            <p className="text-lg font-bold text-indigo-700">
                                {previewUnitPrice.toLocaleString('ar-DZ')} <span className="text-sm font-normal">دج</span>
                            </p>
                        </div>
                        <div className="bg-white rounded-lg p-3 text-center border">
                            <p className="text-xs text-gray-500 mb-1">الإجمالي</p>
                            <p className="text-lg font-bold text-green-700">
                                {previewTotal.toLocaleString('ar-DZ')} <span className="text-sm font-normal">دج</span>
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
