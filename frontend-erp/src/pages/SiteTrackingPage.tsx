import { useEffect, useState } from 'react';
import { Save, AlertCircle } from 'lucide-react';
import { api } from '../services/api';
import toast from 'react-hot-toast';
import { SiteConfig } from '../types/siteConfig';

export default function SiteTrackingPage() {
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

    const updateTrackingBase = (field: 'title' | 'description', value: string) => {
        if (!config) return;
        setConfig({
            ...config,
            tracking: {
                ...config.tracking,
                [field]: value
            }
        });
    };

    const updateStep = (stepId: string, field: 'label' | 'instruction', value: string) => {
        if (!config || !config.tracking.steps) return;
        setConfig({
            ...config,
            tracking: {
                ...config.tracking,
                steps: config.tracking.steps.map(s => s.id === stepId ? { ...s, [field]: value } : s)
            }
        });
    };

    if (loading || !config) return <div className="p-6">جاري التحميل...</div>;

    const { tracking } = config;



    return (
        <div className="p-6 max-w-5xl mx-auto" dir="rtl">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold mb-1" style={{ color: 'var(--text-primary)' }}>صفحة تتبع الطلبات (Tracking)</h1>
                    <p style={{ color: 'var(--text-muted)' }}>تخصيص أسماء حالات الطلب والرسائل المرافقة لكل حالة لتجربة عملاء مميزة.</p>
                </div>
                <button onClick={handleSave} disabled={saving} className="btn-primary flex items-center gap-2">
                    <Save className="w-4 h-4" />
                    {saving ? 'جاري الحفظ...' : 'حفظ التغييرات'}
                </button>
            </div>

            <div className="space-y-6">

                {/* Main Info */}
                <div className="bg-white rounded-2xl border p-5 shadow-sm" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)' }}>
                    <h2 className="text-lg font-bold mb-4" style={{ color: 'var(--text-primary)' }}>معلومات صفحة البحث</h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>عنوان الصفحة</label>
                            <input
                                type="text"
                                className="input-field"
                                value={tracking.title}
                                onChange={e => updateTrackingBase('title', e.target.value)}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>وصف الصفحة</label>
                            <input
                                type="text"
                                className="input-field"
                                value={tracking.description}
                                onChange={e => updateTrackingBase('description', e.target.value)}
                            />
                        </div>
                    </div>
                </div>

                {/* Status Mapping */}
                <div className="bg-white rounded-2xl border p-5 shadow-sm" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)' }}>
                    <h2 className="text-lg font-bold mb-2" style={{ color: 'var(--text-primary)' }}>مراحل الطلب والنصوص المخصصة</h2>
                    <p className="text-sm text-gray-500 mb-6">قم بتعديل المسميات التي تظهر للعميل لكل حالة، وأضف نصاً تعليمياً يظهر عندما يكون الطلب في تلك الحالة.</p>

                    <div className="space-y-4">
                        {tracking.steps && tracking.steps.map(step => (
                            <div key={step.id} className="p-4 border rounded-xl flex flex-col md:flex-row gap-4 bg-gray-50/50" style={{ borderColor: 'var(--color-border)' }}>

                                <div className="w-full md:w-32 pt-2 border-b md:border-b-0 md:border-l border-gray-200 pb-2 md:pb-0" style={{ borderColor: 'var(--color-border)' }}>
                                    <span className="text-xs font-bold text-gray-400 block mb-1 uppercase tracking-wide">رمز النظام</span>
                                    <span className="font-mono text-sm text-purple-700 bg-purple-100 px-2 py-0.5 rounded">{step.key}</span>
                                </div>

                                <div className="flex-1 space-y-3">
                                    <div>
                                        <label className="block text-xs font-medium mb-1 text-gray-500">الاسم المعروض للعميل (Label)</label>
                                        <input
                                            type="text"
                                            className="input-field py-1.5 font-bold"
                                            value={step.label}
                                            onChange={e => updateStep(step.id, 'label', e.target.value)}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-medium mb-1 text-gray-500">رسالة إضافية تظهر للعميل (Instructions)</label>
                                        <textarea
                                            className="input-field min-h-[60px] text-sm py-1.5"
                                            value={step.instruction}
                                            onChange={e => updateStep(step.id, 'instruction', e.target.value)}
                                        />
                                    </div>
                                </div>

                            </div>
                        ))}
                    </div>
                </div>

                <div className="bg-blue-50/10 border border-blue-500/20 rounded-xl p-4 flex gap-3">
                    <AlertCircle className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
                    <p className="text-sm text-blue-400">
                        <strong>نصيحة:</strong> استخدم حقل "رسالة إضافية" لتقليل الاستفسارات على الواتساب. على سبيل المثال، في حالة "في الشحن" (shipped)، أضف رسالة توضح أن شركة التوصيل ستتصل بهم قريباً.
                    </p>
                </div>

            </div>
        </div>
    );
}
