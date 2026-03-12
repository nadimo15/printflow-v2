import { useEffect, useState } from 'react';
import { Save, Globe, AlertCircle } from 'lucide-react';
import { api } from '../services/api';
import toast from 'react-hot-toast';
import { SiteConfig, SiteSettings } from '../types/siteConfig';

export default function SiteSettingsPage() {
    const [config, setConfig] = useState<SiteConfig | null>(null);
    const [settings, setSettings] = useState<SiteSettings | null>(null);
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
                setSettings(response.data.draft_data.settings);
            }
        } catch (error) {
            toast.error('فشل في تحميل إعدادات الموقع');
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (!config || !settings) return;
        setSaving(true);
        try {
            const newDraft = { ...config, settings };
            await api.siteConfig.updateDraft(newDraft);
            setConfig(newDraft);
            toast.success('تم الحفظ في المسودة بنجاح');
        } catch (error) {
            toast.error('فشل في حفظ الإعدادات');
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="p-6">جاري التحميل...</div>;
    if (!settings) return <div className="p-6">لم يتم العثور على الإعدادات</div>;

    return (
        <div className="p-6 max-w-5xl mx-auto" dir="rtl">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold mb-1" style={{ color: 'var(--text-primary)' }}>إعدادات الموقع العامة</h1>
                    <p style={{ color: 'var(--text-muted)' }}>إدارة الهوية البصرية، معلومات التواصل، وإعدادات SEO الأساسية</p>
                </div>
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="btn-primary flex items-center gap-2"
                >
                    <Save className="w-4 h-4" />
                    {saving ? 'جاري الحفظ...' : 'حفظ التغييرات'}
                </button>
            </div>

            <div className="space-y-6">
                {/* -- الهوية البصرية -- */}
                <div className="p-5 rounded-2xl border" style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
                    <h2 className="text-lg font-bold mb-4 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                        <Globe className="w-5 h-5 text-purple-500" /> الهوية البصرية
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>اسم العلامة التجارية</label>
                            <input type="text" className="input-field" value={settings.brand_name} onChange={e => setSettings({ ...settings, brand_name: e.target.value })} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>رابط الشعار (Logo URL)</label>
                            <input type="text" className="input-field" value={settings.logo_url} onChange={e => setSettings({ ...settings, logo_url: e.target.value })} placeholder="اتركه فارغاً لاستخدام النص" />
                        </div>
                    </div>
                </div>

                {/* -- معلومات التواصل -- */}
                <div className="p-5 rounded-2xl border" style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
                    <h2 className="text-lg font-bold mb-4" style={{ color: 'var(--text-primary)' }}>معلومات التواصل</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>البريد الإلكتروني</label>
                            <input type="email" className="input-field" value={settings.contact_email} onChange={e => setSettings({ ...settings, contact_email: e.target.value })} dir="ltr" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>رقم الهاتف</label>
                            <input type="text" className="input-field" value={settings.contact_phone} onChange={e => setSettings({ ...settings, contact_phone: e.target.value })} dir="ltr" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>رقم الواتساب</label>
                            <input type="text" className="input-field" value={settings.whatsapp_number} onChange={e => setSettings({ ...settings, whatsapp_number: e.target.value })} dir="ltr" placeholder="مثال: +213555..." />
                        </div>
                    </div>
                </div>

                {/* -- روابط التواصل الاجتماعي -- */}
                <div className="p-5 rounded-2xl border" style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
                    <h2 className="text-lg font-bold mb-4" style={{ color: 'var(--text-primary)' }}>روابط التواصل الاجتماعي</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>انستغرام</label>
                            <input type="text" className="input-field" value={settings.social_links.instagram} onChange={e => setSettings({ ...settings, social_links: { ...settings.social_links, instagram: e.target.value } })} dir="ltr" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>فيسبوك</label>
                            <input type="text" className="input-field" value={settings.social_links.facebook} onChange={e => setSettings({ ...settings, social_links: { ...settings.social_links, facebook: e.target.value } })} dir="ltr" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>تيك توك</label>
                            <input type="text" className="input-field" value={settings.social_links.tiktok} onChange={e => setSettings({ ...settings, social_links: { ...settings.social_links, tiktok: e.target.value } })} dir="ltr" />
                        </div>
                    </div>
                </div>

                {/* -- الشريط الإعلاني -- */}
                <div className="p-5 rounded-2xl border" style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>الشريط الإعلاني (Top Bar)</h2>
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input type="checkbox" checked={settings.announcement_visible} onChange={e => setSettings({ ...settings, announcement_visible: e.target.checked })} className="rounded border-gray-300 w-4 h-4 text-purple-600 focus:ring-purple-500" />
                            <span className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>تفعيل الشريط الإعلاني</span>
                        </label>
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>نص الإعلان</label>
                        <input type="text" className="input-field" value={settings.announcement_text} onChange={e => setSettings({ ...settings, announcement_text: e.target.value })} disabled={!settings.announcement_visible} />
                    </div>
                </div>

                {/* -- تحسين محركات البحث SEO -- */}
                <div className="p-5 rounded-2xl border" style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
                    <h2 className="text-lg font-bold mb-4" style={{ color: 'var(--text-primary)' }}>تحسين محركات البحث (SEO)</h2>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>عنوان الموقع الرئيسي (Title Tag)</label>
                            <input type="text" className="input-field" value={settings.seo_title} onChange={e => setSettings({ ...settings, seo_title: e.target.value })} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>الوصف الرئيسي (Meta Description)</label>
                            <textarea className="input-field min-h-[80px] resize-none" value={settings.seo_description} onChange={e => setSettings({ ...settings, seo_description: e.target.value })} />
                        </div>
                    </div>
                </div>

                <div className="bg-blue-50/10 border border-blue-500/20 rounded-xl p-4 flex gap-3">
                    <AlertCircle className="w-5 h-5 text-blue-400 shrink-0" />
                    <p className="text-sm text-blue-400">
                        ملاحظة: التغييرات التي تقوم بها هنا تُحفظ في <strong>المسودة</strong> ولن تظهر في الموقع العام للزبائن إلا بعد الذهاب إلى "مركز النشر" واعتماد النسخة.
                    </p>
                </div>
            </div>
        </div>
    );
}
