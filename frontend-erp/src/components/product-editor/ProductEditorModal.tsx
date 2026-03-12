import { useState, useEffect, useCallback, useRef } from 'react';
import {
    X, Save, Loader2, Package, Plus, Trash2, ChevronDown, ChevronUp, Minus, GripVertical, Layers, ImagePlus, Star, Upload
} from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../../services/api';
import { insforge } from '../../config/insforge';
import type { ProductFormData, PriceTier, SizeVariant, SizeVariantTier, ProductionOption, ProductionOptionValue, AttributeGroup, AttributeValue, BomItem } from '../../types/product';
import { EMPTY_PRODUCT } from '../../types/product';

interface Props {
    product: any | null;
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: ProductFormData, bomItems?: any[]) => Promise<void>;
}

const CATEGORIES = [
    { value: 'bags', label: 'أكياس' },
    { value: 'cards', label: 'بطاقات' },
    { value: 'flyers', label: 'منشورات' },
    { value: 'banners', label: 'لافتات' },
    { value: 'stickers', label: 'ملصقات' },
    { value: 'cups', label: 'أكواب' },
    { value: 'other', label: 'أخرى' },
];

function detectPricingMode(priceTiers: any[]): 'flat' | 'multi-size' {
    if (!priceTiers || priceTiers.length === 0) return 'flat';
    // Multi-size tiers have a 'size' or 'tiers' property
    return priceTiers[0]?.tiers !== undefined || priceTiers[0]?.size !== undefined ? 'multi-size' : 'flat';
}

function mapToForm(p: any): ProductFormData {
    const rawTiers: any[] = p.price_tiers || [];
    const mode = detectPricingMode(rawTiers);
    const flatTiers: PriceTier[] = mode === 'flat'
        ? rawTiers.map((t: any) => ({ id: t.id, min_qty: t.min_qty ?? t.quantity ?? 0, max_qty: t.max_qty ?? null, unit_price: t.unit_price ?? t.price ?? 0 }))
        : [];
    const sizeVariants: SizeVariant[] = mode === 'multi-size'
        ? rawTiers.map((t: any) => ({
            size: t.size || '',
            label: t.label || t.size || '',
            tiers: (t.tiers || []).map((tier: any) => ({ qty: tier.qty ?? tier.min_qty ?? 0, unit_price: tier.unit_price ?? tier.price ?? 0 })),
            bom_items: [] // Will fetch separately
        }))
        : [];
    return {
        id: p.id,
        name_ar: p.name_ar || p.name || '',
        name_en: p.name_en || p.name || '',
        description_ar: p.description_ar || p.description || '',
        description_en: p.description_en || p.description || '',
        category: p.category || 'other',
        unit_of_measure: p.unit_of_measure || 'قطعة',
        min_quantity: p.min_quantity || 100,
        is_active: p.is_active ?? true,
        is_published: p.is_published ?? false,
        image: p.image || '',
        images: Array.isArray(p.images) ? p.images : [],
        pricing_mode: mode,
        base_price: p.base_price || 0,
        price_tiers: flatTiers,
        size_variants: sizeVariants,
        // Guard: production_options may be stored as an object ({variants:[]}) in old format — normalize to array
        production_options: Array.isArray(p.production_options) ? p.production_options : [],
        // Guard: attribute_groups may be null or undefined
        attribute_groups: Array.isArray(p.attribute_groups) ? p.attribute_groups : [],
        has_weight: p.has_weight || false,
        weight_per_unit: p.weight_per_unit || 0,
        weight_unit: p.weight_unit || 'g',
        packaging_weight: p.packaging_weight || 0,
        packaging_weight_unit: p.packaging_weight_unit || 'g',
    };
}

/* ─── Collapsible Section ─── */
function Section({ title, subtitle, children, defaultOpen = true }: {
    title: string; subtitle?: string; children: React.ReactNode; defaultOpen?: boolean;
}) {
    const [open, setOpen] = useState(defaultOpen);
    return (
        <div className="border border-gray-200 rounded-xl overflow-hidden">
            <button
                type="button"
                onClick={() => setOpen(!open)}
                className="w-full flex items-center justify-between px-5 py-3.5 bg-gray-50 hover:bg-gray-100 transition-colors text-right"
            >
                <div>
                    <h3 className="font-bold text-gray-900 text-sm">{title}</h3>
                    {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
                </div>
                {open ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
            </button>
            {open && <div className="p-5 space-y-4">{children}</div>}
        </div>
    );
}

/* ─── Field Helper ─── */
function Field({ label, required, children, error }: {
    label: string; required?: boolean; children: React.ReactNode; error?: string;
}) {
    return (
        <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
                {label} {required && <span className="text-red-500">*</span>}
            </label>
            {children}
            {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
        </div>
    );
}

/* ─── Main Component ─── */
export default function ProductEditorModal({ product, isOpen, onClose, onSave }: Props) {
    const [form, setForm] = useState<ProductFormData>(EMPTY_PRODUCT);
    const [saving, setSaving] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [inventoryItems, setInventoryItems] = useState<any[]>([]);
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isOpen) {
            const initialForm = product ? mapToForm(product) : { ...EMPTY_PRODUCT };
            setForm(initialForm);
            setErrors({});

            // Fetch inventory and BOM
            Promise.all([
                api.inventory.list(),
                product?.id ? api.productBom.listByProduct(product.id) : Promise.resolve({ success: true, data: [] })
            ]).then(([invRes, bomRes]) => {
                if (invRes.success) setInventoryItems(invRes.data || []);

                // If it's multi-size, populate the bom_items into the respective variants
                if (bomRes.success && bomRes.data && initialForm.pricing_mode === 'multi-size') {
                    setForm(prev => {
                        const updatedVariants = prev.size_variants.map(variant => {
                            const relatedBom = bomRes.data.filter((b: any) => b.variant_size === variant.size);
                            const bom_items: BomItem[] = relatedBom.map((b: any) => ({
                                id: b.id,
                                inventory_item_id: b.inventory_item_id,
                                qty_per_piece: Number(b.qty_per_piece),
                                unit: b.unit,
                                waste_factor: Number(b.waste_factor || 0),
                                notes: b.notes || ''
                            }));
                            return { ...variant, bom_items };
                        });
                        return { ...prev, size_variants: updatedVariants };
                    });
                }
            });
        }
    }, [isOpen, product]);

    const set = useCallback((patch: Partial<ProductFormData>) => {
        setForm(prev => ({ ...prev, ...patch }));
        const cleared = { ...errors };
        Object.keys(patch).forEach(k => delete cleared[k]);
        setErrors(cleared);
    }, [errors]);

    /* ─── Image Upload Handlers ─── */
    const handleImageUpload = async (files: FileList | null) => {
        if (!files || files.length === 0) return;
        const fileArray = Array.from(files).filter(f => f.type.startsWith('image/'));
        if (fileArray.length === 0) { toast.error('يرجى اختيار ملفات صور صحيحة'); return; }
        setUploading(true);
        const uploadedUrls: string[] = [];
        try {
            for (let i = 0; i < fileArray.length; i++) {
                const file = fileArray[i];
                setUploadProgress(`جاري رفع الصورة ${i + 1} من ${fileArray.length}...`);
                const ext = file.name.split('.').pop();
                const key = `products/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
                const { data, error } = await insforge.storage.from('products').upload(key, file);
                if (error || !data?.url) {
                    toast.error(`فشل في رفع ${file.name}`);
                    continue;
                }
                uploadedUrls.push(data.url);
            }
            if (uploadedUrls.length > 0) {
                setForm(prev => {
                    const newImages = [...(prev.images || []), ...uploadedUrls];
                    // First image uploaded becomes main if no main yet
                    const newMain = prev.image || newImages[0];
                    return { ...prev, images: newImages, image: newMain };
                });
                toast.success(`تم رفع ${uploadedUrls.length} صورة بنجاح`);
            }
        } finally {
            setUploading(false);
            setUploadProgress('');
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const removeImage = (url: string) => {
        setForm(prev => {
            const newImages = prev.images.filter(u => u !== url);
            const newMain = prev.image === url ? (newImages[0] || '') : prev.image;
            return { ...prev, images: newImages, image: newMain };
        });
    };

    const setMainImage = (url: string) => {
        set({ image: url });
    };

    const handleSave = async () => {
        const e: Record<string, string> = {};
        if (!form.name_ar.trim()) e.name_ar = 'مطلوب';
        if (form.base_price < 0) e.base_price = 'لا يمكن أن يكون سالباً';
        if (form.min_quantity < 1) e.min_quantity = 'يجب أن يكون 1 على الأقل';
        if (Object.keys(e).length > 0) {
            setErrors(e);
            toast.error('يرجى تصحيح الأخطاء');
            return;
        }
        setSaving(true);
        try {
            // Map name_en → name for DB compatibility
            const payload: any = { ...form, name: form.name_en || form.name_ar };
            delete payload.id; // Don't send id in the update/insert payload

            // Extract explicit BOM mappings from size_variants
            let extractedBomItems: any[] = [];
            if (payload.pricing_mode === 'multi-size' && payload.size_variants) {
                payload.size_variants.forEach((v: any) => {
                    if (v.bom_items && v.bom_items.length > 0) {
                        v.bom_items.forEach((bom: any) => {
                            if (bom.inventory_item_id) { // Only valid mappings
                                extractedBomItems.push({
                                    variant_size: v.size,
                                    inventory_item_id: bom.inventory_item_id,
                                    qty_per_piece: Number(bom.qty_per_piece) || 0,
                                    unit: bom.unit || 'pcs',
                                    waste_factor: Number(bom.waste_factor) || 0,
                                    notes: bom.notes || ''
                                });
                            }
                        });
                    }
                });
            }

            await onSave(product ? { ...payload } : payload, extractedBomItems);
        } catch (err: any) {
            toast.error(err?.message || 'فشل في حفظ المنتج');
        } finally {
            setSaving(false);
        }
    };

    if (!isOpen) return null;

    /* ─── Flat Price Tiers ─── */
    const addTier = () => {
        const lastTier = form.price_tiers[form.price_tiers.length - 1];
        const newMin = lastTier ? (lastTier.max_qty || lastTier.min_qty) + 1 : form.min_quantity;
        set({ price_tiers: [...form.price_tiers, { min_qty: newMin, max_qty: null, unit_price: form.base_price }] });
    };
    const removeTier = (idx: number) => set({ price_tiers: form.price_tiers.filter((_, i) => i !== idx) });
    const updateTier = (idx: number, patch: Partial<PriceTier>) => {
        const tiers = [...form.price_tiers];
        tiers[idx] = { ...tiers[idx], ...patch };
        set({ price_tiers: tiers });
    };

    /* ─── Multi-Size Variants ─── */
    const addSizeVariant = () => {
        const newVariant: SizeVariant = { size: '', label: '', tiers: [{ qty: form.min_quantity, unit_price: 0 }] };
        set({ size_variants: [...form.size_variants, newVariant] });
    };
    const removeSizeVariant = (idx: number) => set({ size_variants: form.size_variants.filter((_, i) => i !== idx) });
    const updateSizeVariant = (idx: number, patch: Partial<SizeVariant>) => {
        const variants = [...form.size_variants];
        variants[idx] = { ...variants[idx], ...patch };
        set({ size_variants: variants });
    };
    const addVariantTier = (varIdx: number) => {
        const variants = [...form.size_variants];
        const lastTier = variants[varIdx].tiers[variants[varIdx].tiers.length - 1];
        variants[varIdx].tiers = [...variants[varIdx].tiers, { qty: (lastTier?.qty || 0) + 200, unit_price: 0 }];
        set({ size_variants: variants });
    };
    const removeVariantTier = (varIdx: number, tIdx: number) => {
        const variants = [...form.size_variants];
        variants[varIdx].tiers = variants[varIdx].tiers.filter((_, i) => i !== tIdx);
        set({ size_variants: variants });
    };
    const updateVariantTier = (varIdx: number, tIdx: number, patch: Partial<SizeVariantTier>) => {
        const variants = [...form.size_variants];
        variants[varIdx].tiers[tIdx] = { ...variants[varIdx].tiers[tIdx], ...patch };
        set({ size_variants: variants });
    };

    /* ─── Production Options ─── */
    const addOptionGroup = () => {
        const g: ProductionOption = {
            name_ar: '', name_en: '', select_type: 'single', sort_order: form.production_options.length,
            values: [{ name_ar: '', name_en: '', price_delta: 0, is_default: true }]
        };
        set({ production_options: [...form.production_options, g] });
    };
    const removeOptionGroup = (idx: number) => set({ production_options: form.production_options.filter((_, i) => i !== idx) });
    const updateOptionGroup = (idx: number, patch: Partial<ProductionOption>) => {
        const opts = [...form.production_options];
        opts[idx] = { ...opts[idx], ...patch };
        set({ production_options: opts });
    };
    const addOptionValue = (gIdx: number) => {
        const opts = [...form.production_options];
        opts[gIdx].values = [...opts[gIdx].values, { name_ar: '', name_en: '', price_delta: 0, is_default: false }];
        set({ production_options: opts });
    };
    const removeOptionValue = (gIdx: number, vIdx: number) => {
        const opts = [...form.production_options];
        opts[gIdx].values = opts[gIdx].values.filter((_, i) => i !== vIdx);
        set({ production_options: opts });
    };
    const updateOptionValue = (gIdx: number, vIdx: number, patch: Partial<ProductionOptionValue>) => {
        const opts = [...form.production_options];
        opts[gIdx].values[vIdx] = { ...opts[gIdx].values[vIdx], ...patch };
        set({ production_options: opts });
    };

    /* ─── BOM Mapping ─── */
    const addBomItem = (varIdx: number) => {
        const variants = [...form.size_variants];
        if (!variants[varIdx].bom_items) variants[varIdx].bom_items = [];
        variants[varIdx].bom_items!.push({ inventory_item_id: '', qty_per_piece: 1, unit: 'pcs', waste_factor: 0 });
        set({ size_variants: variants });
    };
    const removeBomItem = (varIdx: number, bIdx: number) => {
        const variants = [...form.size_variants];
        if (variants[varIdx].bom_items) {
            variants[varIdx].bom_items = variants[varIdx].bom_items!.filter((_, i) => i !== bIdx);
        }
        set({ size_variants: variants });
    };
    const updateBomItem = (varIdx: number, bIdx: number, patch: Partial<BomItem>) => {
        const variants = [...form.size_variants];
        if (variants[varIdx].bom_items) {
            variants[varIdx].bom_items![bIdx] = { ...variants[varIdx].bom_items![bIdx], ...patch };
        }
        set({ size_variants: variants });
    };

    /* ─── Attribute Groups ─── */
    const addAttrGroup = () => {
        const g: AttributeGroup = {
            name_ar: '', name_en: '', select_type: 'single', sort_order: form.attribute_groups.length,
            values: [{ name_ar: '', name_en: '', price_delta: 0, weight_delta: 0, weight_unit: 'g' }]
        };
        set({ attribute_groups: [...form.attribute_groups, g] });
    };
    const removeAttrGroup = (idx: number) => set({ attribute_groups: form.attribute_groups.filter((_, i) => i !== idx) });
    const updateAttrGroup = (idx: number, patch: Partial<AttributeGroup>) => {
        const grps = [...form.attribute_groups];
        grps[idx] = { ...grps[idx], ...patch };
        set({ attribute_groups: grps });
    };
    const addAttrValue = (gIdx: number) => {
        const grps = [...form.attribute_groups];
        grps[gIdx].values = [...grps[gIdx].values, { name_ar: '', name_en: '', price_delta: 0, weight_delta: 0, weight_unit: 'g' }];
        set({ attribute_groups: grps });
    };
    const removeAttrValue = (gIdx: number, vIdx: number) => {
        const grps = [...form.attribute_groups];
        grps[gIdx].values = grps[gIdx].values.filter((_, i) => i !== vIdx);
        set({ attribute_groups: grps });
    };
    const updateAttrValue = (gIdx: number, vIdx: number, patch: Partial<AttributeValue>) => {
        const grps = [...form.attribute_groups];
        grps[gIdx].values[vIdx] = { ...grps[gIdx].values[vIdx], ...patch };
        set({ attribute_groups: grps });
    };

    return (
        <div className="fixed inset-0 z-50 overflow-hidden">
            <div className="flex items-start justify-center min-h-screen p-4">
                <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

                <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden my-4">
                    {/* Header */}
                    <div className="flex items-center justify-between px-6 py-4 border-b bg-white flex-shrink-0">
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 bg-primary/10 rounded-xl flex items-center justify-center">
                                <Package className="w-5 h-5 text-primary" />
                            </div>
                            <h2 className="text-lg font-bold">{product ? 'تعديل المنتج' : 'إضافة منتج جديد'}</h2>
                        </div>
                        <div className="flex items-center gap-2">
                            <button onClick={handleSave} disabled={saving}
                                className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl text-sm font-medium hover:opacity-90 disabled:opacity-50 transition">
                                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                {saving ? 'جاري الحفظ...' : 'حفظ'}
                            </button>
                            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl transition">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                    </div>

                    {/* Scrollable Content */}
                    <div className="flex-1 overflow-y-auto p-6 space-y-5">

                        {/* ──── BASIC INFO ──── */}
                        <Section title="المعلومات الأساسية" defaultOpen={true}>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <Field label="اسم المنتج (عربي)" required error={errors.name_ar}>
                                    <input className="input" value={form.name_ar}
                                        onChange={e => set({ name_ar: e.target.value })} placeholder="مثال: بطاقات أعمال" />
                                </Field>
                                <Field label="Product Name (EN)">
                                    <input className="input" value={form.name_en} dir="ltr"
                                        onChange={e => set({ name_en: e.target.value })} placeholder="e.g. Business Cards" />
                                </Field>
                            </div>

                            <Field label="الوصف">
                                <textarea className="input resize-none h-20" value={form.description_ar}
                                    onChange={e => set({ description_ar: e.target.value })} placeholder="وصف مختصر عن المنتج..." />
                            </Field>

                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                <Field label="الفئة">
                                    <select className="input" value={form.category} onChange={e => set({ category: e.target.value })}>
                                        {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                                    </select>
                                </Field>
                                <Field label="وحدة القياس">
                                    <input className="input" value={form.unit_of_measure}
                                        onChange={e => set({ unit_of_measure: e.target.value })} />
                                </Field>
                                <Field label="الحد الأدنى" error={errors.min_quantity}>
                                    <input className="input" type="number" min="1" value={form.min_quantity}
                                        onChange={e => set({ min_quantity: Number(e.target.value) })} />
                                </Field>
                                <div></div> {/* Spacer — images moved to dedicated section below */}
                            </div>

                            <div className="flex gap-6">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input type="checkbox" checked={form.is_active}
                                        onChange={e => set({ is_active: e.target.checked })}
                                        className="w-4 h-4 text-primary rounded border-gray-300" />
                                    <span className="text-sm">نشط</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input type="checkbox" checked={form.is_published}
                                        onChange={e => set({ is_published: e.target.checked })}
                                        className="w-4 h-4 text-primary rounded border-gray-300" />
                                    <span className="text-sm">منشور في المتجر</span>
                                </label>
                            </div>
                        </Section>

                        {/* ──── IMAGES ──── */}
                        <Section title="صور المنتج" subtitle="الصورة الرئيسية ومعرض الصور" defaultOpen={true}>
                            {/* Drop zone */}
                            <div
                                className="border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors hover:border-primary/50 hover:bg-primary/5"
                                style={{ borderColor: 'var(--border)' }}
                                onClick={() => fileInputRef.current?.click()}
                                onDragOver={e => { e.preventDefault(); e.currentTarget.classList.add('border-primary', 'bg-primary/5'); }}
                                onDragLeave={e => { e.currentTarget.classList.remove('border-primary', 'bg-primary/5'); }}
                                onDrop={e => { e.preventDefault(); e.currentTarget.classList.remove('border-primary', 'bg-primary/5'); handleImageUpload(e.dataTransfer.files); }}
                            >
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/*"
                                    multiple
                                    className="hidden"
                                    onChange={e => handleImageUpload(e.target.files)}
                                />
                                {uploading ? (
                                    <div className="flex flex-col items-center gap-2">
                                        <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--primary)' }} />
                                        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{uploadProgress}</p>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center gap-2">
                                        <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: 'var(--primary-soft-bg)' }}>
                                            <ImagePlus className="w-6 h-6" style={{ color: 'var(--primary)' }} />
                                        </div>
                                        <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>اسحب الصور هنا أو انقر للاختيار</p>
                                        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>PNG, JPG, WebP — يمكن اختيار عدة صور</p>
                                    </div>
                                )}
                            </div>

                            {/* Gallery Grid */}
                            {(form.images || []).length > 0 && (
                                <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 mt-3">
                                    {(form.images || []).map((url, idx) => (
                                        <div key={idx} className="relative group rounded-xl overflow-hidden border-2 transition-all"
                                            style={{ borderColor: form.image === url ? 'var(--primary)' : 'var(--border)', aspectRatio: '1' }}>
                                            <img src={url} alt={`product-${idx}`} className="w-full h-full object-cover" />
                                            {/* Main badge */}
                                            {form.image === url && (
                                                <div className="absolute top-1 right-1 px-1.5 py-0.5 rounded-md text-xs font-bold text-white flex items-center gap-1" style={{ backgroundColor: 'var(--primary)' }}>
                                                    <Star className="w-3 h-3 fill-white" /> رئيسية
                                                </div>
                                            )}
                                            {/* Hover controls */}
                                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                                {form.image !== url && (
                                                    <button
                                                        type="button"
                                                        onClick={() => setMainImage(url)}
                                                        className="p-1.5 bg-white/20 hover:bg-white/40 rounded-lg transition text-white text-xs flex items-center gap-1"
                                                        title="تعيين كصورة رئيسية"
                                                    >
                                                        <Star className="w-3.5 h-3.5" /> رئيسية
                                                    </button>
                                                )}
                                                <button
                                                    type="button"
                                                    onClick={() => removeImage(url)}
                                                    className="p-1.5 bg-red-500/80 hover:bg-red-600 rounded-lg transition text-white"
                                                    title="حذف الصورة"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                    {/* Add more */}
                                    <div
                                        className="rounded-xl border-2 border-dashed flex items-center justify-center cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-colors"
                                        style={{ borderColor: 'var(--border)', aspectRatio: '1' }}
                                        onClick={() => fileInputRef.current?.click()}
                                    >
                                        <div className="flex flex-col items-center gap-1">
                                            <Upload className="w-5 h-5" style={{ color: 'var(--text-muted)' }} />
                                            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>إضافة</span>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Main image URL preview / fallback manual entry */}
                            <div className="mt-2">
                                <label className="block text-xs mb-1" style={{ color: 'var(--text-muted)' }}>الصورة الرئيسية (URL) — تُحدَّث تلقائياً عند الرفع</label>
                                <input
                                    className="input text-sm"
                                    value={form.image}
                                    dir="ltr"
                                    onChange={e => set({ image: e.target.value })}
                                    placeholder="https://... (يمكن الكتابة يدوياً)"
                                />
                            </div>
                        </Section>

                        {/* ──── PRICING ──── */}
                        <Section title="التسعير" subtitle="السعر الأساسي وشرائح الكمية" defaultOpen={true}>

                            {/* Pricing Mode Toggle */}
                            <div className="flex gap-2 p-1 bg-gray-100 rounded-xl w-fit">
                                <button type="button"
                                    onClick={() => set({ pricing_mode: 'flat' })}
                                    className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${form.pricing_mode === 'flat' ? 'bg-white shadow text-primary' : 'text-gray-500 hover:text-gray-700'}`}>
                                    سعر موحد
                                </button>
                                <button type="button"
                                    onClick={() => set({ pricing_mode: 'multi-size' })}
                                    className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${form.pricing_mode === 'multi-size' ? 'bg-white shadow text-primary' : 'text-gray-500 hover:text-gray-700'}`}>
                                    <Layers className="w-3.5 h-3.5" />
                                    متعدد المقاسات
                                </button>
                            </div>

                            {/* FLAT MODE */}
                            {form.pricing_mode === 'flat' && (
                                <div className="space-y-3">
                                    <Field label="السعر الأساسي (دج)" required error={errors.base_price}>
                                        <input className="input w-48" type="number" min="0" value={form.base_price}
                                            onChange={e => set({ base_price: Number(e.target.value) })} />
                                    </Field>

                                    {form.price_tiers.length > 0 && (
                                        <div className="border border-gray-200 rounded-lg overflow-hidden">
                                            <table className="w-full text-sm">
                                                <thead className="bg-gray-50">
                                                    <tr>
                                                        <th className="px-3 py-2 text-right font-medium text-gray-600">من كمية</th>
                                                        <th className="px-3 py-2 text-right font-medium text-gray-600">إلى كمية</th>
                                                        <th className="px-3 py-2 text-right font-medium text-gray-600">سعر الوحدة (دج)</th>
                                                        <th className="px-3 py-2 w-10"></th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {form.price_tiers.map((tier, idx) => (
                                                        <tr key={idx} className="border-t border-gray-100">
                                                            <td className="px-3 py-2"><input className="input !py-1.5 w-24" type="number" value={tier.min_qty} onChange={e => updateTier(idx, { min_qty: Number(e.target.value) })} /></td>
                                                            <td className="px-3 py-2"><input className="input !py-1.5 w-24" type="number" value={tier.max_qty ?? ''} placeholder="∞" onChange={e => updateTier(idx, { max_qty: e.target.value ? Number(e.target.value) : null })} /></td>
                                                            <td className="px-3 py-2"><input className="input !py-1.5 w-28" type="number" value={tier.unit_price} onChange={e => updateTier(idx, { unit_price: Number(e.target.value) })} /></td>
                                                            <td className="px-3 py-2"><button onClick={() => removeTier(idx)} className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded"><Trash2 className="w-4 h-4" /></button></td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                    <button onClick={addTier} className="flex items-center gap-1 text-sm text-primary hover:underline">
                                        <Plus className="w-4 h-4" /> إضافة شريحة سعر
                                    </button>
                                </div>
                            )}

                            {/* MULTI-SIZE MODE */}
                            {form.pricing_mode === 'multi-size' && (
                                <div className="space-y-4">
                                    <p className="text-xs text-gray-500">كل مقاس له شرائح أسعار مستقلة حسب الكمية.</p>

                                    {form.size_variants.map((variant, varIdx) => (
                                        <div key={varIdx} className="border border-gray-200 rounded-xl overflow-hidden">
                                            {/* Variant Header */}
                                            <div className="flex items-center gap-3 px-4 py-3 bg-gray-50 border-b">
                                                <div className="flex-1 grid grid-cols-2 gap-3">
                                                    <div>
                                                        <label className="text-xs text-gray-500 mb-1 block">رمز المقاس</label>
                                                        <input className="input !py-1.5 text-sm" placeholder="مثال: 20x30" value={variant.size}
                                                            onChange={e => updateSizeVariant(varIdx, { size: e.target.value })} />
                                                    </div>
                                                    <div>
                                                        <label className="text-xs text-gray-500 mb-1 block">التسمية</label>
                                                        <input className="input !py-1.5 text-sm" placeholder="مثال: 20×30 cm" value={variant.label}
                                                            onChange={e => updateSizeVariant(varIdx, { label: e.target.value })} />
                                                    </div>
                                                </div>
                                                <button onClick={() => removeSizeVariant(varIdx)} className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded self-end mb-1">
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>

                                            {/* Tiers Table */}
                                            <div className="p-3">
                                                <table className="w-full text-sm">
                                                    <thead>
                                                        <tr className="text-gray-500">
                                                            <th className="text-right font-medium pb-2 pr-2">من كمية (قطعة)</th>
                                                            <th className="text-right font-medium pb-2">سعر الوحدة (دج)</th>
                                                            <th className="w-8"></th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {variant.tiers.map((tier, tIdx) => (
                                                            <tr key={tIdx} className="border-t border-gray-100">
                                                                <td className="py-1.5 pr-2">
                                                                    <input className="input !py-1 w-28" type="number" min="1" value={tier.qty}
                                                                        onChange={e => updateVariantTier(varIdx, tIdx, { qty: Number(e.target.value) })} />
                                                                </td>
                                                                <td className="py-1.5">
                                                                    <input className="input !py-1 w-28" type="number" min="0" value={tier.unit_price}
                                                                        onChange={e => updateVariantTier(varIdx, tIdx, { unit_price: Number(e.target.value) })} />
                                                                </td>
                                                                <td className="py-1.5">
                                                                    {variant.tiers.length > 1 && (
                                                                        <button onClick={() => removeVariantTier(varIdx, tIdx)} className="p-1 text-red-400 hover:text-red-600 rounded">
                                                                            <Minus className="w-3.5 h-3.5" />
                                                                        </button>
                                                                    )}
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                                <button onClick={() => addVariantTier(varIdx)} className="text-xs text-primary hover:underline mt-2">
                                                    + إضافة شريحة
                                                </button>
                                            </div>

                                            {/* Dedicated BOM Mapping UI for this Variant */}
                                            <div className="bg-yellow-50/50 border-t p-4">
                                                <h4 className="text-sm font-bold text-gray-800 mb-2 border-r-2 border-yellow-400 pr-2">شجرة المواد (BOM) الصريحة</h4>
                                                <p className="text-xs text-gray-500 mb-4">اربط عناصر المخزون المطلوبة لإنتاج قطعة واحدة من هذا المقاس.</p>

                                                {(!variant.bom_items || variant.bom_items.length === 0) ? (
                                                    <div className="text-xs text-red-500 bg-red-50 p-2 rounded border border-red-100 mb-3">
                                                        ⚠️ لا يوجد عناصر مخزون مرتبطة. لن يتم خصم مخزون لهذا المقاس!
                                                    </div>
                                                ) : (
                                                    <div className="space-y-2 mb-3">
                                                        {variant.bom_items.map((bom, bIdx) => (
                                                            <div key={bIdx} className="flex flex-wrap items-center gap-2 bg-white p-2 rounded border shadow-sm">
                                                                <select
                                                                    className="input !py-1 flex-1 min-w-[150px] text-sm"
                                                                    value={bom.inventory_item_id}
                                                                    onChange={e => updateBomItem(varIdx, bIdx, { inventory_item_id: e.target.value })}
                                                                >
                                                                    <option value="">- اختر العنصر -</option>
                                                                    {inventoryItems.map(inv => (
                                                                        <option key={inv.id} value={inv.id}>{inv.name} ({inv.sku || 'N/A'})</option>
                                                                    ))}
                                                                </select>

                                                                <div className="flex items-center gap-1 w-24">
                                                                    <input className="input !py-1 w-full text-sm" type="number" min="0" step="0.001" placeholder="الكمية" value={bom.qty_per_piece}
                                                                        onChange={e => updateBomItem(varIdx, bIdx, { qty_per_piece: Number(e.target.value) })} />
                                                                </div>

                                                                <select className="input !py-1 w-20 text-sm" value={bom.unit} onChange={e => updateBomItem(varIdx, bIdx, { unit: e.target.value })}>
                                                                    <option value="pcs">قطعة</option>
                                                                    <option value="g">غرام</option>
                                                                    <option value="ml">مل</option>
                                                                </select>

                                                                <div className="flex items-center gap-1 w-24">
                                                                    <input className="input !py-1 w-full text-sm" type="number" min="0" step="1" placeholder="هدر %" value={bom.waste_factor}
                                                                        onChange={e => updateBomItem(varIdx, bIdx, { waste_factor: Number(e.target.value) })} />
                                                                    <span className="text-xs text-gray-500">% هدر</span>
                                                                </div>

                                                                <button onClick={() => removeBomItem(varIdx, bIdx)} className="p-1 text-red-400 hover:text-red-600 rounded" title="إزالة من الوصفة">
                                                                    <Trash2 className="w-4 h-4" />
                                                                </button>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}

                                                <button onClick={() => addBomItem(varIdx)} className="bg-white border text-xs text-primary font-medium hover:bg-gray-50 px-3 py-1.5 rounded-lg flex items-center gap-1 shadow-sm">
                                                    <Plus className="w-3.5 h-3.5" /> ربط مادة من المخزون
                                                </button>
                                            </div>
                                        </div>
                                    ))}

                                    <button onClick={addSizeVariant} className="flex items-center gap-1.5 text-sm text-primary hover:underline font-medium">
                                        <Plus className="w-4 h-4" /> إضافة مقاس جديد
                                    </button>
                                </div>
                            )}
                        </Section>

                        {/* ──── PRODUCTION OPTIONS ──── */}
                        <Section title="خيارات الإنتاج" subtitle="مثل: وجه الطباعة، التشطيب، التصفيح" defaultOpen={form.production_options.length > 0}>
                            {form.production_options.map((opt, gIdx) => (
                                <div key={gIdx} className="border border-gray-200 rounded-lg p-4 space-y-3 bg-gray-50/50">
                                    <div className="flex items-center gap-3">
                                        <input className="input flex-1" value={opt.name_ar} placeholder="اسم المجموعة (عربي)"
                                            onChange={e => updateOptionGroup(gIdx, { name_ar: e.target.value })} />
                                        <select className="input w-32" value={opt.select_type}
                                            onChange={e => updateOptionGroup(gIdx, { select_type: e.target.value as any })}>
                                            <option value="single">اختيار واحد</option>
                                            <option value="multi">اختيار متعدد</option>
                                        </select>
                                        <button onClick={() => removeOptionGroup(gIdx)} className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded">
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>

                                    {opt.values.map((val, vIdx) => (
                                        <div key={vIdx} className="flex items-center gap-2 mr-4">
                                            <GripVertical className="w-4 h-4 text-gray-300 flex-shrink-0" />
                                            <input className="input flex-1 !py-1.5" value={val.name_ar} placeholder="اسم الخيار"
                                                onChange={e => updateOptionValue(gIdx, vIdx, { name_ar: e.target.value })} />
                                            <div className="flex items-center gap-1">
                                                <input className="input !py-1.5 w-20 text-center" type="number" value={val.price_delta} placeholder="+/- سعر"
                                                    onChange={e => updateOptionValue(gIdx, vIdx, { price_delta: Number(e.target.value) })} />
                                                <span className="text-xs text-gray-400">دج</span>
                                            </div>
                                            <label className="flex items-center gap-1 text-xs text-gray-500 whitespace-nowrap cursor-pointer">
                                                <input type="checkbox" checked={val.is_default} className="w-3.5 h-3.5 rounded"
                                                    onChange={e => updateOptionValue(gIdx, vIdx, { is_default: e.target.checked })} />
                                                افتراضي
                                            </label>
                                            <button onClick={() => removeOptionValue(gIdx, vIdx)} className="p-1 text-red-400 hover:text-red-600 rounded">
                                                <Minus className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    ))}
                                    <button onClick={() => addOptionValue(gIdx)} className="text-xs text-primary hover:underline mr-4">
                                        + إضافة خيار
                                    </button>
                                </div>
                            ))}
                            <button onClick={addOptionGroup} className="flex items-center gap-1 text-sm text-primary hover:underline">
                                <Plus className="w-4 h-4" /> إضافة مجموعة
                            </button>
                        </Section>

                        {/* ──── ATTRIBUTES ──── */}
                        <Section title="الخصائص والمتغيرات" subtitle="مثل: نوع الورق، المقاس" defaultOpen={form.attribute_groups.length > 0}>
                            {form.attribute_groups.map((grp, gIdx) => (
                                <div key={gIdx} className="border border-gray-200 rounded-lg p-4 space-y-3 bg-gray-50/50">
                                    <div className="flex items-center gap-3">
                                        <input className="input flex-1" value={grp.name_ar} placeholder="اسم الخاصية (عربي)"
                                            onChange={e => updateAttrGroup(gIdx, { name_ar: e.target.value })} />
                                        <select className="input w-32" value={grp.select_type}
                                            onChange={e => updateAttrGroup(gIdx, { select_type: e.target.value as any })}>
                                            <option value="single">اختيار واحد</option>
                                            <option value="multi">اختيار متعدد</option>
                                        </select>
                                        <button onClick={() => removeAttrGroup(gIdx)} className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded">
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>

                                    {grp.values.map((val, vIdx) => (
                                        <div key={vIdx} className="flex items-center gap-2 mr-4">
                                            <input className="input flex-1 !py-1.5" value={val.name_ar} placeholder="اسم القيمة"
                                                onChange={e => updateAttrValue(gIdx, vIdx, { name_ar: e.target.value })} />
                                            <div className="flex items-center gap-1">
                                                <input className="input !py-1.5 w-20 text-center" type="number" value={val.price_delta} placeholder="+/- سعر"
                                                    onChange={e => updateAttrValue(gIdx, vIdx, { price_delta: Number(e.target.value) })} />
                                                <span className="text-xs text-gray-400">دج</span>
                                            </div>
                                            <button onClick={() => removeAttrValue(gIdx, vIdx)} className="p-1 text-red-400 hover:text-red-600 rounded">
                                                <Minus className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    ))}
                                    <button onClick={() => addAttrValue(gIdx)} className="text-xs text-primary hover:underline mr-4">
                                        + إضافة قيمة
                                    </button>
                                </div>
                            ))}
                            <button onClick={addAttrGroup} className="flex items-center gap-1 text-sm text-primary hover:underline">
                                <Plus className="w-4 h-4" /> إضافة خاصية
                            </button>
                        </Section>

                        {/* ──── WEIGHT ──── */}
                        <Section title="الوزن والشحن" subtitle="اختياري — لحساب وزن الطلب" defaultOpen={form.has_weight}>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input type="checkbox" checked={form.has_weight}
                                    onChange={e => set({ has_weight: e.target.checked })}
                                    className="w-4 h-4 text-primary rounded border-gray-300" />
                                <span className="text-sm font-medium">تفعيل حساب الوزن</span>
                            </label>

                            {form.has_weight && (
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                    <Field label="وزن الوحدة">
                                        <input className="input" type="number" min="0" value={form.weight_per_unit}
                                            onChange={e => set({ weight_per_unit: Number(e.target.value) })} />
                                    </Field>
                                    <Field label="وحدة الوزن">
                                        <select className="input" value={form.weight_unit} onChange={e => set({ weight_unit: e.target.value as any })}>
                                            <option value="g">غرام (g)</option>
                                            <option value="kg">كيلوغرام (kg)</option>
                                        </select>
                                    </Field>
                                    <Field label="وزن التغليف">
                                        <input className="input" type="number" min="0" value={form.packaging_weight}
                                            onChange={e => set({ packaging_weight: Number(e.target.value) })} />
                                    </Field>
                                    <Field label="وحدة التغليف">
                                        <select className="input" value={form.packaging_weight_unit} onChange={e => set({ packaging_weight_unit: e.target.value as any })}>
                                            <option value="g">غرام (g)</option>
                                            <option value="kg">كيلوغرام (kg)</option>
                                        </select>
                                    </Field>
                                </div>
                            )}
                        </Section>

                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-end gap-3 px-6 py-4 border-t bg-gray-50 flex-shrink-0">
                        <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-200 rounded-xl transition">
                            إلغاء
                        </button>
                        <button onClick={handleSave} disabled={saving}
                            className="flex items-center gap-2 px-5 py-2 bg-primary text-white rounded-xl text-sm font-medium hover:opacity-90 disabled:opacity-50 transition">
                            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                            {saving ? 'جاري الحفظ...' : 'حفظ المنتج'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
