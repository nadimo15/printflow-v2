import { useEffect, useState } from 'react';
import { Save, AlertCircle, Plus, Trash2 } from 'lucide-react';
import { api } from '../services/api';
import toast from 'react-hot-toast';
import { SiteConfig } from '../types/siteConfig';

export default function SiteCheckoutPage() {
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
                const raw = response.data.draft_data || response.data;
                // Normalize checkout: DB shape may differ from TS type
                const dbCheckout = raw.checkout || {};
                const checkout = {
                    payment_title: dbCheckout.payment_title || dbCheckout.free_shipping_threshold_text || 'الدفع نقداً عند الاستلام',
                    shipping_calculator_text: dbCheckout.shipping_calculator_text || dbCheckout.shipping_info_text || '',
                    policies: dbCheckout.policies || [],
                    shipping_badges: dbCheckout.shipping_badges || [],
                    payment_methods: dbCheckout.payment_methods || { cod: { label: 'الدفع عند الاستلام', description: '', visible: true }, bank: { label: '', description: '', visible: false }, pickup: { label: '', description: '', visible: false } },
                };
                setConfig({ ...raw, checkout } as SiteConfig);
            } else {
                setConfig({
                    checkout: { payment_title: '', shipping_calculator_text: '', policies: [], shipping_badges: [], payment_methods: { cod: { label: '', description: '', visible: true }, bank: { label: '', description: '', visible: false }, pickup: { label: '', description: '', visible: false } } }
                } as unknown as SiteConfig);
            }
        } catch (error) {
            console.error('SiteCheckoutPage fetchConfig error:', error);
            toast.error('فشل في تحميل الإعدادات');
            setConfig({
                checkout: { payment_title: '', shipping_calculator_text: '', policies: [], shipping_badges: [], payment_methods: { cod: { label: '', description: '', visible: true }, bank: { label: '', description: '', visible: false }, pickup: { label: '', description: '', visible: false } } }
            } as unknown as SiteConfig);
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

    const updateCheckout = (field: keyof SiteConfig['checkout'], value: any) => {
        if (!config) return;
        setConfig({
            ...config,
            checkout: {
                ...config.checkout,
                [field]: value
            }
        });
    };

    const addPolicy = () => {
        if (!config) return;
        setConfig({
            ...config,
            checkout: {
                ...config.checkout,
                policies: [
                    ...config.checkout.policies,
                    { id: Math.random().toString(36).substring(2, 9), title: 'سياسة جديدة', description: 'محتوى السياسة هنا' }
                ]
            }
        });
    };

    const updatePolicy = (index: number, field: string, value: string) => {
        if (!config) return;
        const policies = [...(config.checkout?.policies || [])];
        policies[index] = { ...policies[index], [field]: value };
        setConfig({
            ...config,
            checkout: { ...config.checkout, policies }
        });
    };

    const removePolicy = (index: number) => {
        if (!config) return;
        const policies = (config.checkout?.policies || []).filter((_, i) => i !== index);
        setConfig({
            ...config,
            checkout: { ...config.checkout, policies }
        });
    };

    if (loading || !config) return <div className="p-6">جاري التحميل...</div>;

    const { checkout } = config;

    return (
        <div className="p-6 max-w-5xl mx-auto" dir="rtl">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold mb-1" style={{ color: 'var(--text-primary)' }}>صفحة إتمام الطلب (Checkout)</h1>
                    <p style={{ color: 'var(--text-muted)' }}>تخصيص نصوص الدفع والتوصيل وسياسات المتجر.</p>
                </div>
                <button onClick={handleSave} disabled={saving} className="btn-primary flex items-center gap-2">
                    <Save className="w-4 h-4" />
                    {saving ? 'جاري الحفظ...' : 'حفظ التغييرات'}
                </button>
            </div>

            <div className="space-y-6">

                {/* Texts */}
                <div className="bg-white rounded-2xl border p-5 shadow-sm" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)' }}>
                    <h2 className="text-lg font-bold mb-4" style={{ color: 'var(--text-primary)' }}>نصوص إرشادية</h2>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>نص طرق الدفع (Payment Methods Text)</label>
                            <input
                                type="text"
                                className="input-field"
                                value={checkout?.payment_title || ''}
                                onChange={e => updateCheckout('payment_title', e.target.value)}
                                placeholder="مثال: الدفع نقداً عند الاستلام"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>نص حساب التوصيل (Shipping Calculation Text)</label>
                            <textarea
                                className="input-field min-h-[80px]"
                                value={checkout?.shipping_calculator_text || ''}
                                onChange={e => updateCheckout('shipping_calculator_text', e.target.value)}
                                placeholder="مثال: يتم حساب تكلفة التوصيل تلقائياً بناءً على الولاية المختارة."
                            />
                        </div>
                    </div>
                </div>

                {/* Policies */}
                <div className="bg-white rounded-2xl border p-5 shadow-sm" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)' }}>
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>سياسات المتجر المبسطة</h2>
                        <button onClick={addPolicy} className="btn-secondary flex items-center gap-2 text-sm">
                            <Plus className="w-4 h-4" /> إضافة سياسة
                        </button>
                    </div>
                    <p className="text-xs text-gray-500 mb-6">تظهر هذه السياسات أسفل ملخص الطلب لطمأنة العميل (مثل الاستبدال، ضمان الجودة، مدة التوصيل).</p>

                    <div className="space-y-4">
                        {(checkout?.policies || []).map((policy, idx) => (
                            <div key={idx} className="p-4 border rounded-xl bg-gray-50/50 flex gap-4" style={{ borderColor: 'var(--color-border)' }}>
                                <div className="flex-1 space-y-3">
                                    <div>
                                        <label className="block text-xs font-medium mb-1 text-gray-500">عنوان السياسة</label>
                                        <input
                                            type="text"
                                            className="input-field py-1.5 font-bold"
                                            value={policy.title}
                                            onChange={e => updatePolicy(idx, 'title', e.target.value)}
                                            placeholder="مثال: الاستبدال والاسترجاع"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium mb-1 text-gray-500">وصف السياسة</label>
                                        <textarea
                                            className="input-field min-h-[60px] text-sm py-1.5"
                                            value={policy.description}
                                            onChange={e => updatePolicy(idx, 'description', e.target.value)}
                                            placeholder="نص السياسة بشكل مختصر..."
                                        />
                                    </div>
                                </div>
                                <div className="pt-6">
                                    <button onClick={() => removePolicy(idx)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors border border-transparent hover:border-red-100">
                                        <Trash2 className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>
                        ))}
                        {(checkout?.policies || []).length === 0 && (
                            <div className="text-center py-6 text-gray-400 border-2 border-dashed rounded-xl" style={{ borderColor: 'var(--color-border)' }}>
                                لا توجد سياسات مضافة.
                            </div>
                        )}
                    </div>
                </div>

                <div className="bg-blue-50/10 border border-blue-500/20 rounded-xl p-4 flex gap-3">
                    <AlertCircle className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
                    <p className="text-sm text-blue-400">
                        <strong>نصيحة:</strong> اجعل السياسات قصيرة ومطمئنة لزيادة الثقة وتقليل معدل التخلي عن السلة.
                    </p>
                </div>

            </div>
        </div>
    );
}
