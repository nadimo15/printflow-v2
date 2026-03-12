import { useEffect, useState } from 'react';
import { Save, AlertCircle, Plus, Trash2 } from 'lucide-react';
import { api } from '../services/api';
import toast from 'react-hot-toast';
import { SiteConfig } from '../types/siteConfig';

export default function SiteProductPage() {
    const [config, setConfig] = useState<SiteConfig | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        fetchConfig();
    }, []);

    const fetchConfig = async () => {
        try {
            const response = await api.siteConfig.get();
            if (response.success && response.data) {
                setConfig(response.data.draft_data);
            }
        } catch (error) {
            toast.error('فشل في تحميل الإعدادات');
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (!config) return;
        setSaving(true);
        try {
            await api.siteConfig.updateDraft(config);
            toast.success('تم الحفظ في المسودة بنجاح');
        } catch (error) {
            toast.error('فشل في حفظ الإعدادات');
        } finally {
            setSaving(false);
        }
    };

    const updateProductConfig = (field: string, value: any) => {
        if (!config) return;
        setConfig({
            ...config,
            product_page: {
                ...config.product_page,
                [field]: value
            }
        });
    };

    const updateReviews = (field: string, value: any) => {
        if (!config) return;
        setConfig({
            ...config,
            product_page: {
                ...config.product_page,
                reviews: {
                    enabled: config.product_page.reviews?.enabled ?? false,
                    title: config.product_page.reviews?.title ?? 'التقييمات',
                    [field]: value
                }
            }
        });
    };

    const addBadge = () => {
        if (!config) return;
        setConfig({
            ...config,
            product_page: {
                ...config.product_page,
                shipping_badges: [
                    ...config.product_page.shipping_badges || [],
                    { enabled: true, text: 'شارة جديدة', icon: 'Truck' }
                ]
            }
        });
    };

    const updateBadge = (index: number, field: string, value: any) => {
        if (!config || !config.product_page.shipping_badges) return;
        const badges = [...config.product_page.shipping_badges];
        badges[index] = { ...badges[index], [field]: value };
        setConfig({
            ...config,
            product_page: {
                ...config.product_page,
                shipping_badges: badges
            }
        });
    };

    const removeBadge = (index: number) => {
        if (!config || !config.product_page.shipping_badges) return;
        const badges = config.product_page.shipping_badges.filter((_, i) => i !== index);
        setConfig({
            ...config,
            product_page: {
                ...config.product_page,
                shipping_badges: badges
            }
        });
    };

    if (loading || !config) return <div className="p-6">جاري التحميل...</div>;

    const { product_page } = config;

    return (
        <div className="p-6 max-w-5xl mx-auto" dir="rtl">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold mb-1" style={{ color: 'var(--text-primary)' }}>صفحة المنتج (Product Page)</h1>
                    <p style={{ color: 'var(--text-muted)' }}>إدارة الإعدادات العامة لصفحات المنتجات</p>
                </div>
                <button onClick={handleSave} disabled={saving} className="btn-primary flex items-center gap-2">
                    <Save className="w-4 h-4" />
                    {saving ? 'جاري الحفظ...' : 'حفظ التغييرات'}
                </button>
            </div>

            <div className="space-y-6">

                {/* General Layout */}
                <div className="bg-white rounded-2xl border p-5 shadow-sm" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)' }}>
                    <h2 className="text-lg font-bold mb-4" style={{ color: 'var(--text-primary)' }}>الإعدادات العامة</h2>

                    <label className="flex items-center gap-3 cursor-pointer p-3 border rounded-xl hover:bg-gray-50 transition-colors" style={{ borderColor: 'var(--color-border)' }}>
                        <input
                            type="checkbox"
                            checked={product_page.show_stock_status}
                            onChange={e => updateProductConfig('show_stock_status', e.target.checked)}
                            className="rounded border-gray-300 w-5 h-5 text-purple-600 focus:ring-purple-500"
                        />
                        <div>
                            <span className="font-bold text-sm block" style={{ color: 'var(--text-primary)' }}>إظهار حالة المخزون (Stock Status)</span>
                            <span className="text-xs text-gray-500">يعرض للعميل رسالة توضح توفر المنتج أو نفاده أسفل السعر.</span>
                        </div>
                    </label>
                </div>

                {/* Reviews */}
                <div className="bg-white rounded-2xl border p-5 shadow-sm" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)' }}>
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>نظام التقييمات (Reviews)</h2>
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={product_page.reviews?.enabled ?? false}
                                onChange={e => updateReviews('enabled', e.target.checked)}
                                className="rounded border-gray-300 w-4 h-4 text-purple-600 focus:ring-purple-500"
                            />
                            <span className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>تفعيل التقييمات</span>
                        </label>
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>عنوان قسم التقييمات</label>
                        <input
                            type="text"
                            className="input-field"
                            value={product_page.reviews?.title ?? ''}
                            onChange={e => updateReviews('title', e.target.value)}
                            disabled={!(product_page.reviews?.enabled ?? false)}
                        />
                    </div>
                </div>

                {/* Badges */}
                <div className="bg-white rounded-2xl border p-5 shadow-sm" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)' }}>
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>شارات المنتج الثابتة (Badges)</h2>
                        <button onClick={addBadge} className="btn-secondary flex items-center gap-2 text-sm">
                            <Plus className="w-4 h-4" /> إضافة شارة
                        </button>
                    </div>
                    <p className="text-xs text-gray-500 mb-4">تظهر هذه الشارات أسفل زر "إضافة للسلة" لتعزيز الثقة (مثل: شحن سريع، ضمان، الخ).</p>

                    <div className="space-y-3">
                        {product_page.shipping_badges && product_page.shipping_badges.map((badge, idx) => (
                            <div key={idx} className="flex flex-wrap md:flex-nowrap items-center gap-3 p-3 border rounded-xl bg-gray-50/50" style={{ borderColor: 'var(--color-border)' }}>
                                <input
                                    type="checkbox"
                                    checked={badge.enabled}
                                    onChange={e => updateBadge(idx, 'enabled', e.target.checked)}
                                    className="rounded border-gray-300 w-4 h-4 text-purple-600 focus:ring-purple-500 shrink-0"
                                />

                                <div className="flex-1 min-w-[200px]">
                                    <input
                                        type="text"
                                        className="input-field py-1.5 text-sm font-bold"
                                        value={badge.text}
                                        onChange={e => updateBadge(idx, 'text', e.target.value)}
                                        placeholder="نص الشارة"
                                    />
                                </div>

                                <div className="w-full md:w-32">
                                    <input
                                        type="text"
                                        className="input-field py-1.5 text-sm text-center"
                                        value={badge.icon}
                                        dir="ltr"
                                        onChange={e => updateBadge(idx, 'icon', e.target.value)}
                                        placeholder="Lucide Icon"
                                    />
                                </div>

                                <button onClick={() => removeBadge(idx)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors shrink-0">
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        ))}

                        {(!product_page.shipping_badges || product_page.shipping_badges.length === 0) && (
                            <div className="text-center py-6 text-gray-400 border-2 border-dashed rounded-xl" style={{ borderColor: 'var(--color-border)' }}>
                                لا توجد شارات مفعلة
                            </div>
                        )}
                    </div>
                </div>

                <div className="bg-blue-50/10 border border-blue-500/20 rounded-xl p-4 flex gap-3">
                    <AlertCircle className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
                    <p className="text-sm text-blue-400">
                        <strong>ملاحظة:</strong> هذه الإعدادات تُطبق على مستوى <strong>كل المنتجات</strong>. إذا كنت ترغب بتخصيص عرض حقول معينة (مثل حقل رفع التصميم)، سيتم إدارتها من صفحة <strong>نماذج الإدخال (Forms)</strong>.
                    </p>
                </div>

            </div>
        </div>
    );
}
