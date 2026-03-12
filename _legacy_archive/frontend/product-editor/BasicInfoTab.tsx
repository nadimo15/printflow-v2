import type { ProductFormData } from '../../types/product';

interface Props {
    data: ProductFormData;
    onChange: (patch: Partial<ProductFormData>) => void;
    errors: Record<string, string>;
}

const CATEGORIES = [
    { value: 'bags', ar: 'أكياس', en: 'Bags' },
    { value: 'packaging', ar: 'تغليف', en: 'Packaging' },
    { value: 'boxes', ar: 'صناديق', en: 'Boxes' },
    { value: 'apparel', ar: 'ملابس', en: 'Apparel' },
    { value: 'cups', ar: 'أكواب', en: 'Cups' },
    { value: 'stationery', ar: 'قرطاسية', en: 'Stationery' },
    { value: 'promotional', ar: 'ترويجية', en: 'Promotional' },
    { value: 'stickers', ar: 'ملصقات', en: 'Stickers' },
    { value: 'rolls', ar: 'لفات', en: 'Rolls' },
    { value: 'other', ar: 'أخرى', en: 'Other' },
];

const UNITS = [
    { value: 'قطعة', label: 'قطعة (Piece)' },
    { value: 'علبة', label: 'علبة (Box)' },
    { value: 'كيلو', label: 'كيلو (kg)' },
    { value: 'لفة', label: 'لفة (Roll)' },
    { value: 'حزمة', label: 'حزمة (Pack)' },
    { value: 'ورقة', label: 'ورقة (Sheet)' },
];

export default function BasicInfoTab({ data, onChange, errors }: Props) {
    return (
        <div className="space-y-6">
            {/* Product Names */}
            <div className="grid md:grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-semibold mb-1.5">
                        اسم المنتج (عربي) <span className="text-red-500">*</span>
                    </label>
                    <input
                        type="text"
                        dir="rtl"
                        value={data.name_ar}
                        onChange={(e) => onChange({ name_ar: e.target.value })}
                        className={`input w-full ${errors.name_ar ? 'border-red-400 bg-red-50' : ''}`}
                        placeholder="مثال: أكياس ورقية مطبوعة"
                    />
                    {errors.name_ar && <p className="text-red-500 text-xs mt-1">{errors.name_ar}</p>}
                </div>
                <div>
                    <label className="block text-sm font-semibold mb-1.5">
                        Product Name (English) <span className="text-red-500">*</span>
                    </label>
                    <input
                        type="text"
                        dir="ltr"
                        value={data.name_en}
                        onChange={(e) => onChange({ name_en: e.target.value })}
                        className={`input w-full ${errors.name_en ? 'border-red-400 bg-red-50' : ''}`}
                        placeholder="e.g. Printed Paper Bags"
                    />
                    {errors.name_en && <p className="text-red-500 text-xs mt-1">{errors.name_en}</p>}
                </div>
            </div>

            {/* Descriptions */}
            <div className="grid md:grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-semibold mb-1.5">الوصف (عربي)</label>
                    <textarea
                        dir="rtl"
                        value={data.description_ar}
                        onChange={(e) => onChange({ description_ar: e.target.value })}
                        className="input w-full resize-none"
                        rows={3}
                        placeholder="وصف المنتج بالعربية..."
                    />
                </div>
                <div>
                    <label className="block text-sm font-semibold mb-1.5">Description (English)</label>
                    <textarea
                        dir="ltr"
                        value={data.description_en}
                        onChange={(e) => onChange({ description_en: e.target.value })}
                        className="input w-full resize-none"
                        rows={3}
                        placeholder="Product description in English..."
                    />
                </div>
            </div>

            {/* Category, Unit, MOQ */}
            <div className="grid md:grid-cols-3 gap-4">
                <div>
                    <label className="block text-sm font-semibold mb-1.5">الفئة</label>
                    <select
                        value={data.category}
                        onChange={(e) => onChange({ category: e.target.value })}
                        className="input w-full"
                    >
                        {CATEGORIES.map((c) => (
                            <option key={c.value} value={c.value}>
                                {c.ar} / {c.en}
                            </option>
                        ))}
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-semibold mb-1.5">وحدة القياس</label>
                    <select
                        value={data.unit_of_measure}
                        onChange={(e) => onChange({ unit_of_measure: e.target.value })}
                        className="input w-full"
                    >
                        {UNITS.map((u) => (
                            <option key={u.value} value={u.value}>{u.label}</option>
                        ))}
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-semibold mb-1.5">
                        الحد الأدنى للطلب (MOQ)
                    </label>
                    <input
                        type="number"
                        value={data.min_quantity}
                        onChange={(e) => onChange({ min_quantity: Math.max(1, parseInt(e.target.value) || 1) })}
                        className={`input w-full ${errors.min_quantity ? 'border-red-400' : ''}`}
                        min="1"
                    />
                    {errors.min_quantity && <p className="text-red-500 text-xs mt-1">{errors.min_quantity}</p>}
                </div>
            </div>

            {/* Status Toggles */}
            <div className="flex gap-8 p-4 bg-gray-50 rounded-xl">
                <label className="flex items-center gap-3 cursor-pointer">
                    <div
                        onClick={() => onChange({ is_active: !data.is_active })}
                        className={`relative w-12 h-6 rounded-full transition-colors cursor-pointer ${data.is_active ? 'bg-green-500' : 'bg-gray-300'
                            }`}
                    >
                        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${data.is_active ? 'translate-x-7' : 'translate-x-1'
                            }`} />
                    </div>
                    <div>
                        <p className="font-semibold text-sm">نشط / Active</p>
                        <p className="text-xs text-gray-500">{data.is_active ? 'المنتج متاح' : 'المنتج معطل'}</p>
                    </div>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                    <div
                        onClick={() => onChange({ is_published: !data.is_published })}
                        className={`relative w-12 h-6 rounded-full transition-colors cursor-pointer ${data.is_published ? 'bg-blue-500' : 'bg-gray-300'
                            }`}
                    >
                        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${data.is_published ? 'translate-x-7' : 'translate-x-1'
                            }`} />
                    </div>
                    <div>
                        <p className="font-semibold text-sm">منشور / Published</p>
                        <p className="text-xs text-gray-500">{data.is_published ? 'ظاهر للعملاء' : 'مسودة'}</p>
                    </div>
                </label>
            </div>

            {/* Image */}
            <div>
                <label className="block text-sm font-semibold mb-1.5">رابط الصورة / Image URL</label>
                <input
                    type="url"
                    dir="ltr"
                    value={data.image}
                    onChange={(e) => onChange({ image: e.target.value })}
                    className="input w-full"
                    placeholder="https://example.com/image.jpg"
                />
                {data.image && (
                    <div className="mt-3 flex items-center gap-4">
                        <img
                            src={data.image}
                            alt="Preview"
                            className="w-24 h-24 object-cover rounded-xl border"
                            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                        />
                        <button
                            type="button"
                            onClick={() => onChange({ image: '' })}
                            className="text-sm text-red-500 hover:underline"
                        >
                            إزالة الصورة
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
