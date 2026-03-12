import { useState } from 'react';
import { Package, Tag, Scale, Layers } from 'lucide-react';
import type { ProductFormData } from '../../types/product';
import { computeUnitPrice, toGrams, formatWeight } from '../../utils/productDomain';

interface Props {
    data: ProductFormData;
}

const CATEGORY_LABELS: Record<string, string> = {
    bags: 'أكياس', packaging: 'تغليف', boxes: 'صناديق', apparel: 'ملابس',
    cups: 'أكواب', stationery: 'قرطاسية', promotional: 'ترويجية', stickers: 'ملصقات',
    rolls: 'لفات', other: 'أخرى',
};

export default function PreviewTab({ data }: Props) {
    const [previewQty, setPreviewQty] = useState(data.min_quantity || 100);

    // Selected options for weight preview (first value of each group)
    const selectedWeightDeltas = data.attribute_groups.flatMap((g) => {
        const first = g.values[0];
        return first ? [toGrams(first.weight_delta, first.weight_unit)] : [];
    });

    const baseWeightG = toGrams(data.weight_per_unit, data.weight_unit);
    const effectiveWeightG = Math.max(0, baseWeightG + selectedWeightDeltas.reduce((s, d) => s + d, 0));
    const packagingG = toGrams(data.packaging_weight, data.packaging_weight_unit);
    const lineWeightG = effectiveWeightG * previewQty + packagingG;

    const unitPrice = computeUnitPrice(previewQty, data.price_tiers, data.base_price);

    // Price deltas from first option of each production option group
    const productionPriceDeltas = data.production_options.flatMap((o) => {
        const defaultVal = o.values.find((v) => v.is_default) || o.values[0];
        return defaultVal ? [defaultVal.price_delta] : [];
    });
    const attrPriceDeltas = data.attribute_groups.flatMap((g) => {
        const first = g.values[0];
        return first ? [first.price_delta] : [];
    });
    const totalPriceDelta = [...productionPriceDeltas, ...attrPriceDeltas].reduce((s, d) => s + d, 0);
    const effectiveUnitPrice = unitPrice + totalPriceDelta;

    return (
        <div className="space-y-6">
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-700">
                ⚠️ هذه معاينة تقريبية. يتم عرض أول خيار من كل مجموعة كاختيار افتراضي.
            </div>

            {/* Customer-facing Product Card */}
            <div className="max-w-sm mx-auto">
                <div className="bg-white rounded-2xl shadow-lg overflow-hidden border">
                    {/* Image */}
                    <div className="h-48 bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                        {data.image ? (
                            <img src={data.image} alt={data.name_ar} className="h-full w-full object-cover" />
                        ) : (
                            <Package className="w-16 h-16 text-gray-300" />
                        )}
                    </div>

                    {/* Content */}
                    <div className="p-4">
                        <div className="flex items-start justify-between gap-2 mb-2">
                            <div>
                                <h3 className="font-bold text-lg leading-tight">{data.name_ar || 'اسم المنتج'}</h3>
                                {data.name_en && <p className="text-sm text-gray-500">{data.name_en}</p>}
                            </div>
                            <div className="flex flex-col gap-1">
                                {data.is_published ? (
                                    <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full whitespace-nowrap">
                                        منشور
                                    </span>
                                ) : (
                                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full whitespace-nowrap">
                                        مسودة
                                    </span>
                                )}
                            </div>
                        </div>

                        {data.description_ar && (
                            <p className="text-sm text-gray-600 mb-3 line-clamp-2">{data.description_ar}</p>
                        )}

                        <div className="flex items-center gap-2 mb-3">
                            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full flex items-center gap-1">
                                <Tag className="w-3 h-3" />
                                {CATEGORY_LABELS[data.category] || data.category}
                            </span>
                            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
                                الحد الأدنى: {data.min_quantity} {data.unit_of_measure}
                            </span>
                        </div>

                        <div className="border-t pt-3">
                            <div className="flex items-baseline gap-1">
                                <span className="text-2xl font-bold text-primary">
                                    {data.base_price.toLocaleString('ar-DZ')}
                                </span>
                                <span className="text-sm text-gray-500">دج / {data.unit_of_measure}</span>
                            </div>
                            {data.price_tiers.length > 0 && (
                                <p className="text-xs text-green-600 mt-0.5">
                                    ✓ {data.price_tiers.length} شريحة سعرية متاحة
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Computed Price & Weight Examples */}
            <div className="grid md:grid-cols-2 gap-4">
                {/* Price Calculator */}
                <div className="p-4 bg-indigo-50 rounded-xl border border-indigo-100">
                    <div className="flex items-center gap-2 mb-3">
                        <Layers className="w-4 h-4 text-indigo-600" />
                        <h4 className="font-bold text-sm text-indigo-800">حاسبة السعر</h4>
                    </div>
                    <div className="mb-3">
                        <label className="text-xs text-indigo-700 mb-1 block">الكمية</label>
                        <input
                            type="number"
                            value={previewQty}
                            onChange={(e) => setPreviewQty(Math.max(1, parseInt(e.target.value) || 1))}
                            className="input w-full text-sm"
                            min="1"
                        />
                    </div>
                    <div className="space-y-1.5 text-sm">
                        <div className="flex justify-between">
                            <span className="text-gray-600">سعر الوحدة (الشريحة)</span>
                            <span className="font-medium">{unitPrice.toLocaleString()} دج</span>
                        </div>
                        {totalPriceDelta !== 0 && (
                            <div className="flex justify-between">
                                <span className="text-gray-600">تأثير الخيارات</span>
                                <span className={`font-medium ${totalPriceDelta > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                                    {totalPriceDelta > 0 ? '+' : ''}{totalPriceDelta.toLocaleString()} دج
                                </span>
                            </div>
                        )}
                        <div className="flex justify-between border-t pt-1.5">
                            <span className="font-semibold">سعر الوحدة الفعلي</span>
                            <span className="font-bold text-indigo-700">{effectiveUnitPrice.toLocaleString()} دج</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="font-semibold">الإجمالي ({previewQty} وحدة)</span>
                            <span className="font-bold text-green-700 text-base">
                                {(effectiveUnitPrice * previewQty).toLocaleString()} دج
                            </span>
                        </div>
                    </div>
                </div>

                {/* Weight Calculator */}
                {data.has_weight ? (
                    <div className="p-4 bg-cyan-50 rounded-xl border border-cyan-100">
                        <div className="flex items-center gap-2 mb-3">
                            <Scale className="w-4 h-4 text-cyan-600" />
                            <h4 className="font-bold text-sm text-cyan-800">حاسبة الوزن</h4>
                        </div>
                        <div className="space-y-1.5 text-sm">
                            <div className="flex justify-between">
                                <span className="text-gray-600">الوزن الأساسي</span>
                                <span className="font-medium">{formatWeight(baseWeightG)}</span>
                            </div>
                            {selectedWeightDeltas.some((d) => d !== 0) && (
                                <div className="flex justify-between">
                                    <span className="text-gray-600">تأثير الخيارات</span>
                                    <span className="font-medium text-cyan-600">
                                        {selectedWeightDeltas.reduce((s, d) => s + d, 0) >= 0 ? '+' : ''}
                                        {formatWeight(Math.abs(selectedWeightDeltas.reduce((s, d) => s + d, 0)))}
                                    </span>
                                </div>
                            )}
                            <div className="flex justify-between">
                                <span className="text-gray-600">وزن الوحدة الفعلي</span>
                                <span className="font-medium">{formatWeight(effectiveWeightG)}</span>
                            </div>
                            {packagingG > 0 && (
                                <div className="flex justify-between">
                                    <span className="text-gray-600">وزن التغليف</span>
                                    <span className="font-medium">+ {formatWeight(packagingG)}</span>
                                </div>
                            )}
                            <div className="flex justify-between border-t pt-1.5">
                                <span className="font-semibold">وزن الطلب ({previewQty} وحدة)</span>
                                <span className="font-bold text-cyan-700">{formatWeight(lineWeightG)}</span>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="p-4 bg-gray-50 rounded-xl border border-dashed text-center text-gray-400 flex items-center justify-center">
                        <div>
                            <Scale className="w-8 h-8 mx-auto mb-2 opacity-30" />
                            <p className="text-sm">الوزن غير مفعّل</p>
                        </div>
                    </div>
                )}
            </div>

            {/* Options Summary */}
            {(data.production_options.length > 0 || data.attribute_groups.length > 0) && (
                <div className="p-4 bg-gray-50 rounded-xl border">
                    <h4 className="font-bold text-sm mb-3">ملخص الخيارات</h4>
                    <div className="space-y-2">
                        {data.production_options.map((opt, i) => (
                            <div key={i} className="flex items-center gap-2 text-sm">
                                <span className="font-medium text-gray-700 min-w-0 flex-shrink-0">
                                    {opt.name_ar || `خيار ${i + 1}`}:
                                </span>
                                <div className="flex flex-wrap gap-1">
                                    {opt.values.map((v, vi) => (
                                        <span
                                            key={vi}
                                            className={`px-2 py-0.5 rounded-full text-xs ${v.is_default ? 'bg-primary text-white' : 'bg-gray-200 text-gray-600'
                                                }`}
                                        >
                                            {v.name_ar || v.name_en}
                                            {v.price_delta !== 0 && ` (${v.price_delta > 0 ? '+' : ''}${v.price_delta} دج)`}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        ))}
                        {data.attribute_groups.map((grp, i) => (
                            <div key={i} className="flex items-center gap-2 text-sm">
                                <span className="font-medium text-gray-700 min-w-0 flex-shrink-0">
                                    {grp.name_ar || `خاصية ${i + 1}`}:
                                </span>
                                <div className="flex flex-wrap gap-1">
                                    {grp.values.map((v, vi) => (
                                        <span
                                            key={vi}
                                            className={`px-2 py-0.5 rounded-full text-xs ${vi === 0 ? 'bg-blue-100 text-blue-700' : 'bg-gray-200 text-gray-600'
                                                }`}
                                        >
                                            {v.name_ar || v.name_en}
                                            {v.price_delta !== 0 && ` (${v.price_delta > 0 ? '+' : ''}${v.price_delta} دج)`}
                                            {v.weight_delta !== 0 && ` / ${v.weight_delta > 0 ? '+' : ''}${v.weight_delta}${v.weight_unit}`}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
