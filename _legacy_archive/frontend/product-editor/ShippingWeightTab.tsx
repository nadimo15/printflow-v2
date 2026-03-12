import type { ProductFormData, WeightUnit } from '../../types/product';
import { toGrams, formatWeight } from '../../utils/productDomain';

interface Props {
    data: ProductFormData;
    onChange: (patch: Partial<ProductFormData>) => void;
}

export default function ShippingWeightTab({ data, onChange }: Props) {
    // Compute example effective weight using all attribute defaults with weight deltas
    const defaultWeightDeltas = data.attribute_groups.flatMap((g) =>
        g.values
            .filter((v) => {
                // For single-select: first value is implicitly default if none marked
                const hasDefault = g.values.some((vv) => vv.weight_delta !== 0);
                return hasDefault && v.weight_delta !== 0;
            })
            .map((v) => toGrams(v.weight_delta, v.weight_unit))
    );

    const baseWeightG = toGrams(data.weight_per_unit, data.weight_unit);
    const effectiveWeightG = Math.max(0, baseWeightG + defaultWeightDeltas.reduce((s, d) => s + d, 0));
    const packagingG = toGrams(data.packaging_weight, data.packaging_weight_unit);

    return (
        <div className="space-y-6">
            {/* Weight Toggle */}
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border">
                <div>
                    <p className="font-semibold">هذا المنتج له وزن</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                        فعّل هذا الخيار لحساب وزن الطلب تلقائياً عند إنشاء الطلبات
                    </p>
                </div>
                <div
                    onClick={() => onChange({ has_weight: !data.has_weight })}
                    className={`relative w-14 h-7 rounded-full transition-colors cursor-pointer ${data.has_weight ? 'bg-blue-500' : 'bg-gray-300'
                        }`}
                >
                    <div
                        className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow transition-transform ${data.has_weight ? 'translate-x-8' : 'translate-x-1'
                            }`}
                    />
                </div>
            </div>

            {data.has_weight && (
                <>
                    {/* Base Weight */}
                    <div className="grid md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-semibold mb-1.5">
                                وزن الوحدة الأساسي
                            </label>
                            <div className="flex gap-2">
                                <input
                                    type="number"
                                    value={data.weight_per_unit}
                                    onChange={(e) => onChange({ weight_per_unit: parseFloat(e.target.value) || 0 })}
                                    className="input flex-1"
                                    min="0"
                                    step="0.001"
                                    placeholder="0"
                                />
                                <select
                                    value={data.weight_unit}
                                    onChange={(e) => onChange({ weight_unit: e.target.value as WeightUnit })}
                                    className="input w-20"
                                >
                                    <option value="g">غ (g)</option>
                                    <option value="kg">كغ (kg)</option>
                                </select>
                            </div>
                            <p className="text-xs text-gray-500 mt-1">
                                الوزن الأساسي للوحدة الواحدة قبل إضافة أي خيارات
                            </p>
                        </div>

                        {/* Packaging Weight */}
                        <div>
                            <label className="block text-sm font-semibold mb-1.5">
                                وزن التغليف للطلب (اختياري)
                            </label>
                            <div className="flex gap-2">
                                <input
                                    type="number"
                                    value={data.packaging_weight}
                                    onChange={(e) => onChange({ packaging_weight: parseFloat(e.target.value) || 0 })}
                                    className="input flex-1"
                                    min="0"
                                    step="0.001"
                                    placeholder="0"
                                />
                                <select
                                    value={data.packaging_weight_unit}
                                    onChange={(e) => onChange({ packaging_weight_unit: e.target.value as WeightUnit })}
                                    className="input w-20"
                                >
                                    <option value="g">غ (g)</option>
                                    <option value="kg">كغ (kg)</option>
                                </select>
                            </div>
                            <p className="text-xs text-gray-500 mt-1">
                                وزن مواد التغليف يُضاف مرة واحدة لكل طلب
                            </p>
                        </div>
                    </div>

                    {/* Weight Calculation Preview */}
                    <div className="p-4 bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl border border-blue-100">
                        <h3 className="font-bold text-sm text-blue-800 mb-3">⚖️ معاينة حساب الوزن</h3>

                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between items-center py-1.5 border-b border-blue-100">
                                <span className="text-gray-600">الوزن الأساسي للوحدة</span>
                                <span className="font-semibold">{formatWeight(baseWeightG)}</span>
                            </div>

                            {data.attribute_groups.some((g) => g.values.some((v) => v.weight_delta !== 0)) && (
                                <div className="flex justify-between items-center py-1.5 border-b border-blue-100">
                                    <span className="text-gray-600">تأثير الخيارات على الوزن</span>
                                    <span className="font-semibold text-blue-600">
                                        {defaultWeightDeltas.length > 0
                                            ? `${defaultWeightDeltas.reduce((s, d) => s + d, 0) >= 0 ? '+' : ''}${formatWeight(Math.abs(defaultWeightDeltas.reduce((s, d) => s + d, 0)))}`
                                            : 'لا يوجد'}
                                    </span>
                                </div>
                            )}

                            <div className="flex justify-between items-center py-1.5 border-b border-blue-100">
                                <span className="text-gray-600">الوزن الفعلي للوحدة</span>
                                <span className="font-bold text-blue-800">{formatWeight(effectiveWeightG)}</span>
                            </div>

                            {/* Example order calculation */}
                            <div className="mt-3 p-3 bg-white rounded-lg border">
                                <p className="text-xs font-semibold text-gray-600 mb-2">مثال: طلب بكمية 500 وحدة</p>
                                <div className="space-y-1 text-xs">
                                    <div className="flex justify-between">
                                        <span className="text-gray-500">وزن السطر (500 × {formatWeight(effectiveWeightG)})</span>
                                        <span className="font-medium">{formatWeight(effectiveWeightG * 500)}</span>
                                    </div>
                                    {packagingG > 0 && (
                                        <div className="flex justify-between">
                                            <span className="text-gray-500">وزن التغليف</span>
                                            <span className="font-medium">+ {formatWeight(packagingG)}</span>
                                        </div>
                                    )}
                                    <div className="flex justify-between pt-1 border-t font-bold">
                                        <span>إجمالي وزن الطلب</span>
                                        <span className="text-blue-700">{formatWeight(effectiveWeightG * 500 + packagingG)}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Formula explanation */}
                    <div className="p-3 bg-gray-50 rounded-xl text-xs text-gray-600 border">
                        <p className="font-semibold mb-1">📐 صيغة الحساب:</p>
                        <code className="block bg-white p-2 rounded border font-mono text-xs">
                            وزن_الوحدة_الفعلي = وزن_الأساسي + Σ(تأثيرات_وزن_الخيارات_المحددة)
                            <br />
                            وزن_السطر = وزن_الوحدة_الفعلي × الكمية
                            <br />
                            وزن_الطلب = Σ(وزن_السطر) + وزن_التغليف
                        </code>
                    </div>
                </>
            )}

            {!data.has_weight && (
                <div className="p-8 text-center text-gray-400 border-2 border-dashed rounded-xl">
                    <p className="text-sm">الوزن غير مفعّل لهذا المنتج</p>
                    <p className="text-xs mt-1">فعّل الخيار أعلاه لإضافة معلومات الوزن</p>
                </div>
            )}
        </div>
    );
}
