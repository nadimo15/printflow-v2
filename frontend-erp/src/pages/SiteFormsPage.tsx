import { useEffect, useState } from 'react';
import { Save, AlertCircle } from 'lucide-react';
import { api } from '../services/api';
import toast from 'react-hot-toast';
import { SiteConfig, FormFieldConfig } from '../types/siteConfig';

export default function SiteFormsPage() {
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

    const updateField = (formType: 'checkout' | 'quick_order', fieldName: string, prop: keyof FormFieldConfig, value: any) => {
        if (!config) return;
        setConfig({
            ...config,
            forms: {
                ...config.forms,
                [formType]: {
                    ...config.forms[formType] as any,
                    [fieldName]: {
                        ...(config.forms[formType] as any)[fieldName],
                        [prop]: value
                    }
                }
            }
        });
    };

    if (loading || !config) return <div className="p-6">جاري التحميل...</div>;

    const renderFieldRow = (formType: 'checkout' | 'quick_order', fieldName: string, displayLabel: string, showRequireUpload = false) => {
        const fieldConfig = (config.forms[formType] as any)[fieldName] as FormFieldConfig;
        if (!fieldConfig) return null;

        return (
            <div className="p-4 border rounded-xl bg-gray-50/50 mb-4" style={{ borderColor: 'var(--color-border)' }}>
                <div className="flex flex-wrap md:flex-nowrap items-center justify-between gap-4 mb-4">
                    <h3 className="font-bold text-md w-full md:w-48" style={{ color: 'var(--text-primary)' }}>{displayLabel}</h3>

                    <div className="flex gap-4 items-center">
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={fieldConfig.visible}
                                onChange={e => updateField(formType, fieldName, 'visible', e.target.checked)}
                                className="rounded border-gray-300 w-4 h-4 text-purple-600 focus:ring-purple-500"
                            />
                            <span className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>مرئي (Visible)</span>
                        </label>

                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={fieldConfig.required}
                                onChange={e => updateField(formType, fieldName, 'required', e.target.checked)}
                                disabled={!fieldConfig.visible} // Only required if visible
                                className="rounded border-gray-300 w-4 h-4 text-purple-600 focus:ring-purple-500 disabled:opacity-50"
                            />
                            <span className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }} title="يمنع إرسال الطلب إذا كان فارغاً">إجباري (Required)</span>
                        </label>

                        {showRequireUpload && (
                            <label className="flex items-center gap-2 cursor-pointer ml-4 p-1.5 bg-purple-50 rounded-lg border border-purple-100">
                                <input
                                    type="checkbox"
                                    checked={(fieldConfig as any).require_upload || false}
                                    onChange={e => updateField(formType, fieldName, 'require_upload', e.target.checked)}
                                    disabled={!fieldConfig.visible}
                                    className="rounded border-gray-300 w-4 h-4 text-purple-700 focus:ring-purple-600 disabled:opacity-50"
                                />
                                <span className="text-sm font-bold text-purple-800" title="يمنع إضافة المنتج للسلة دون رفع ملف (صورة/PDF)">مطلوب رفع ملف إجبارياً</span>
                            </label>
                        )}
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <label className="block text-xs font-medium mb-1 text-gray-500">تسمية الحقل (Label)</label>
                        <input type="text" className="input-field py-1.5" value={fieldConfig.label} onChange={e => updateField(formType, fieldName, 'label', e.target.value)} disabled={!fieldConfig.visible} />
                    </div>
                    <div>
                        <label className="block text-xs font-medium mb-1 text-gray-500">النص المؤقت (Placeholder)</label>
                        <input type="text" className="input-field py-1.5" value={fieldConfig.placeholder} onChange={e => updateField(formType, fieldName, 'placeholder', e.target.value)} disabled={!fieldConfig.visible} />
                    </div>
                    <div>
                        <label className="block text-xs font-medium mb-1 text-gray-500">النص المساعد (Help text)</label>
                        <input type="text" className="input-field py-1.5" value={fieldConfig.help_text} onChange={e => updateField(formType, fieldName, 'help_text', e.target.value)} disabled={!fieldConfig.visible} placeholder="مثال: اختياري لتسهيل التواصل" />
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="p-6 max-w-5xl mx-auto" dir="rtl">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold mb-1" style={{ color: 'var(--text-primary)' }}>النماذج والحقول (Forms)</h1>
                    <p style={{ color: 'var(--text-muted)' }}>التحكم الكلي بظهور وإجبارية حقول إدخال العملاء في المتجر</p>
                </div>
                <button onClick={handleSave} disabled={saving} className="btn-primary flex items-center gap-2">
                    <Save className="w-4 h-4" />
                    {saving ? 'جاري الحفظ...' : 'حفظ التغييرات'}
                </button>
            </div>

            <div className="space-y-6">

                {/* Quick Order Form */}
                <div className="bg-white rounded-2xl border p-5 shadow-sm" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)' }}>
                    <h2 className="text-lg font-bold mb-4 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                        نموذج الطلب السريع (صفحة المنتج)
                    </h2>
                    <p className="text-sm text-gray-500 mb-6">الحقول التي تظهر للعميل في شاشة المنتج أو النافذة المنبثقة قبل إضافة المنتج للسلة.</p>

                    <div className="space-y-2">
                        {renderFieldRow('quick_order', 'address', 'العنوان الكامل / البلدية')}
                        {renderFieldRow('quick_order', 'wilaya', 'الولاية')}
                        {renderFieldRow('quick_order', 'email', 'البريد الإلكتروني')}
                        {renderFieldRow('quick_order', 'notes', 'ملاحظات الطلب')}
                        {renderFieldRow('quick_order', 'design_upload', 'رفع تصميم (ملف)', true)}
                    </div>
                </div>

                {/* Checkout Form */}
                <div className="bg-white rounded-2xl border p-5 shadow-sm" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)' }}>
                    <h2 className="text-lg font-bold mb-4 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                        نموذج إتمام الطلب الرئيسي (Checkout)
                    </h2>
                    <p className="text-sm text-gray-500 mb-6">الحقول التي تظهر في صفحة /checkout لملء بيانات التوصيل النهائية.</p>

                    <div className="space-y-2">
                        {renderFieldRow('checkout', 'address', 'العنوان الكامل')}
                        {renderFieldRow('checkout', 'wilaya', 'الولاية')}
                        {renderFieldRow('checkout', 'email', 'البريد الإلكتروني')}
                        {renderFieldRow('checkout', 'notes', 'ملاحظات إضافية للتوصيل')}
                    </div>
                    <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-xl p-4 flex gap-3 text-sm text-yellow-800">
                        <AlertCircle className="w-5 h-5 shrink-0" />
                        <p><strong>حقول لا يمكن إخفاؤها:</strong> الاسم ورقم الهاتف يعتبران حقولاً إلزامية أساسية لتكوين الطلب في النظام ولا يمكن إخفاؤهما من التشيك اوت.</p>
                    </div>
                </div>

                <div className="bg-blue-50/10 border border-blue-500/20 rounded-xl p-4 flex gap-3">
                    <AlertCircle className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
                    <div className="text-sm text-blue-400">
                        <strong>نصيحة للمبيعات:</strong><br />
                        - اجعل <code>العنوان الكامل</code> اختيارياً في "الطلب السريع" وإلزامياً في "التشيك اوت" لزيادة نسبة التحويل (Conversion Rate).<br />
                        - إذا كنت تستخدم واتساب لتأكيد الطلبات، يمكنك الاستغناء تماماً عن حقل <code>البريد الإلكتروني</code> بإخفائه.
                    </div>
                </div>

            </div>
        </div>
    );
}
