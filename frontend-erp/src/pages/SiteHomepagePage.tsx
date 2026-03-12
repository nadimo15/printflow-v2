import { useEffect, useState } from 'react';
import { Save, Plus, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { api } from '../services/api';
import toast from 'react-hot-toast';
import { SiteConfig } from '../types/siteConfig';

export default function SiteHomepagePage() {
    const [config, setConfig] = useState<SiteConfig | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [expandedSection, setExpandedSection] = useState<string | null>('hero');

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



    const updateNested = (section: keyof SiteConfig['homepage'], field: string, value: any) => {
        if (!config) return;
        setConfig({
            ...config,
            homepage: {
                ...config.homepage,
                [section]: {
                    ...config.homepage[section] as any,
                    [field]: value
                }
            }
        });
    };

    const updateRootArray = (arrayKey: keyof SiteConfig['homepage'], index: number, field: string, value: any) => {
        if (!config) return;
        const array = [...((config.homepage[arrayKey] as any[]) || [])];
        array[index] = { ...array[index], [field]: value };
        setConfig({
            ...config,
            homepage: {
                ...config.homepage,
                [arrayKey]: array
            }
        });
    };

    const addToRootArray = (arrayKey: keyof SiteConfig['homepage'], newItem: any) => {
        if (!config) return;
        const array = [...((config.homepage[arrayKey] as any[]) || [])];
        array.push({ id: Math.random().toString(36).substring(2, 9), ...newItem });
        setConfig({
            ...config,
            homepage: { ...config.homepage, [arrayKey]: array }
        });
    };

    const removeFromRootArray = (arrayKey: keyof SiteConfig['homepage'], id: string) => {
        if (!config) return;
        const array = ((config.homepage[arrayKey] as any[]) || []).filter((item: any) => item.id !== id);
        setConfig({
            ...config,
            homepage: { ...config.homepage, [arrayKey]: array }
        });
    };

    if (loading || !config) return <div className="p-6">جاري التحميل...</div>;

    const { homepage } = config;

    const toggleSection = (section: string) => {
        setExpandedSection(expandedSection === section ? null : section);
    };

    return (
        <div className="p-6 max-w-5xl mx-auto" dir="rtl">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold mb-1" style={{ color: 'var(--text-primary)' }}>الصفحة الرئيسية (Homepage)</h1>
                    <p style={{ color: 'var(--text-muted)' }}>إدارة النصوص الفائقة، الخطوات، الإحصائيات، والأسئلة الشائعة</p>
                </div>
                <button onClick={handleSave} disabled={saving} className="btn-primary flex items-center gap-2">
                    <Save className="w-4 h-4" />
                    {saving ? 'جاري الحفظ...' : 'حفظ التغييرات'}
                </button>
            </div>

            <div className="space-y-4">
                {/* -- HERO SECTION -- */}
                <div className="bg-white rounded-2xl border shadow-sm overflow-hidden" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)' }}>
                    <button onClick={() => toggleSection('hero')} className="w-full flex justify-between items-center p-5 bg-gray-50/50 hover:bg-gray-50 transition-colors">
                        <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>القسم الترحيبي (Hero Banner)</h2>
                        {expandedSection === 'hero' ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                    </button>

                    {expandedSection === 'hero' && (
                        <div className="p-5 border-t space-y-4" style={{ borderColor: 'var(--color-border)' }}>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>العنوان الرئيسي (Title)</label>
                                    <input type="text" className="input-field" value={homepage.hero.title} onChange={e => updateNested('hero', 'title', e.target.value)} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>العنوان الفرعي (Subtitle - ملون)</label>
                                    <input type="text" className="input-field" value={homepage.hero.subtitle} onChange={e => updateNested('hero', 'subtitle', e.target.value)} />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>نص الشارة العلوية (Badge)</label>
                                <textarea className="input-field min-h-[40px]" value={homepage.hero.badge_text} onChange={e => updateNested('hero', 'badge_text', e.target.value)} />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t" style={{ borderColor: 'var(--color-border)' }}>
                                <div className="space-y-3">
                                    <h3 className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>الزر الرئيسي (Primary CTA)</h3>
                                    <div>
                                        <label className="block text-xs mb-1">النص</label>
                                        <input type="text" className="input-field py-1.5" value={homepage.hero.primary_cta_label} onChange={e => updateNested('hero', 'primary_cta_label', e.target.value)} />
                                    </div>
                                    <div>
                                        <label className="block text-xs mb-1">الوجهة (الرابط)</label>
                                        <input type="text" className="input-field py-1.5" dir="ltr" value={homepage.hero.primary_cta_link} onChange={e => updateNested('hero', 'primary_cta_link', e.target.value)} />
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <h3 className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>الزر الثانوي (Secondary CTA)</h3>
                                    <div>
                                        <label className="block text-xs mb-1">النص</label>
                                        <input type="text" className="input-field py-1.5" value={homepage.hero.secondary_cta_label} onChange={e => updateNested('hero', 'secondary_cta_label', e.target.value)} />
                                    </div>
                                    <div>
                                        <label className="block text-xs mb-1">الوجهة (الرابط)</label>
                                        <input type="text" className="input-field py-1.5" dir="ltr" value={homepage.hero.secondary_cta_link} onChange={e => updateNested('hero', 'secondary_cta_link', e.target.value)} />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* -- STATS SECTION -- */}
                <div className="bg-white rounded-2xl border shadow-sm overflow-hidden" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)' }}>
                    <button onClick={() => toggleSection('stats')} className="w-full flex justify-between items-center p-5 bg-gray-50/50 hover:bg-gray-50 transition-colors">
                        <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>شريط الإحصائيات الأرقام</h2>
                        {expandedSection === 'stats' ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                    </button>

                    {expandedSection === 'stats' && (
                        <div className="p-5 border-t space-y-4" style={{ borderColor: 'var(--color-border)' }}>
                            <div className="flex justify-between items-center py-2 border-b bg-gray-50/20" style={{ borderColor: 'var(--color-border)' }}>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input type="checkbox" checked={homepage.stats_visible} onChange={e => setConfig({ ...config, homepage: { ...config.homepage, stats_visible: e.target.checked } })} className="rounded border-gray-300 w-4 h-4 text-purple-600 focus:ring-purple-500" />
                                    <span className="text-sm font-medium">إظهار الإحصائيات (Stats Visible)</span>
                                </label>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                                {homepage.stats.map((stat, idx) => (
                                    <div key={stat.id || idx} className="p-3 border rounded-xl relative group" style={{ borderColor: 'var(--color-border)' }}>
                                        <button onClick={() => removeFromRootArray('stats', stat.id!)} className="absolute top-2 left-2 p-1 text-red-500 bg-red-50 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Trash2 className="w-3 h-3" />
                                        </button>
                                        <label className="block text-xs text-gray-500 mb-1">الرقم/القيمة</label>
                                        <input type="text" className="input-field py-1 mb-2 text-center font-bold" value={stat.value} onChange={e => updateRootArray('stats', idx, 'value', e.target.value)} />
                                        <label className="block text-xs text-gray-500 mb-1">الوصف</label>
                                        <input type="text" className="input-field py-1 text-center text-sm" value={stat.label} onChange={e => updateRootArray('stats', idx, 'label', e.target.value)} />
                                    </div>
                                ))}
                            </div>
                            <button onClick={() => addToRootArray('stats', { label: 'جديد', value: '0' })} className="btn-secondary w-full py-2 flex items-center justify-center gap-2">
                                <Plus className="w-4 h-4" /> إضافة إحصائية
                            </button>
                        </div>
                    )}
                </div>

                {/* -- HOW IT WORKS SECTION -- */}
                <div className="bg-white rounded-2xl border shadow-sm overflow-hidden" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)' }}>
                    <button onClick={() => toggleSection('howItWorks')} className="w-full flex justify-between items-center p-5 bg-gray-50/50 hover:bg-gray-50 transition-colors">
                        <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>خطوات العمل (How it works)</h2>
                        {expandedSection === 'howItWorks' ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                    </button>

                    {expandedSection === 'howItWorks' && (
                        <div className="p-5 border-t space-y-6" style={{ borderColor: 'var(--color-border)' }}>
                            <div className="flex justify-between items-center py-2 border-b bg-gray-50/20" style={{ borderColor: 'var(--color-border)' }}>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input type="checkbox" checked={homepage.how_it_works_visible} onChange={e => setConfig({ ...config, homepage: { ...config.homepage, how_it_works_visible: e.target.checked } })} className="rounded border-gray-300 w-4 h-4 text-purple-600 focus:ring-purple-500" />
                                    <span className="text-sm font-medium">إظهار الخطوات (Visible)</span>
                                </label>
                            </div>

                            <div className="space-y-3">
                                <h3 className="font-bold text-sm mb-2" style={{ color: 'var(--text-primary)' }}>الخطوات</h3>
                                {homepage.steps.map((step, idx) => (
                                    <div key={step.id || idx} className="flex gap-3 items-start p-3 border rounded-xl" style={{ borderColor: 'var(--color-border)' }}>
                                        <div className="flex-1 space-y-2">
                                            <input type="text" className="input-field py-1.5 font-bold" placeholder="عنوان الخطوة" value={step.title} onChange={e => updateRootArray('steps', idx, 'title', e.target.value)} />
                                            <textarea className="input-field py-1.5 min-h-[60px]" placeholder="وصف الخطوة" value={step.description} onChange={e => updateRootArray('steps', idx, 'description', e.target.value)} />
                                        </div>
                                        <div className="w-16 space-y-2 shrink-0">
                                            <button onClick={() => removeFromRootArray('steps', step.id!)} className="w-full p-2 text-red-500 hover:bg-red-50 rounded border border-transparent hover:border-red-200 transition-colors text-xs flex justify-center items-center gap-1 mt-1">
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                                <button onClick={() => addToRootArray('steps', { title: 'خطوة جديدة', description: '' })} className="btn-secondary w-full py-2 flex items-center justify-center gap-2">
                                    <Plus className="w-4 h-4" /> إضافة خطوة
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* -- FAQs SECTION -- */}
                <div className="bg-white rounded-2xl border shadow-sm overflow-hidden" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)' }}>
                    <button onClick={() => toggleSection('faqs')} className="w-full flex justify-between items-center p-5 bg-gray-50/50 hover:bg-gray-50 transition-colors">
                        <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>الأسئلة الشائعة (FAQs)</h2>
                        {expandedSection === 'faqs' ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                    </button>

                    {expandedSection === 'faqs' && (
                        <div className="p-5 border-t space-y-4" style={{ borderColor: 'var(--color-border)' }}>
                            {homepage.faqs.map((faq, idx) => (
                                <div key={faq.id || idx} className="p-3 border rounded-xl relative group pr-10" style={{ borderColor: 'var(--color-border)' }}>
                                    <button onClick={() => removeFromRootArray('faqs', faq.id!)} className="absolute top-4 right-3 text-red-400 hover:text-red-600">
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                    <div className="space-y-2">
                                        <input type="text" className="input-field py-1.5 font-bold" placeholder="السؤال؟" value={faq.q} onChange={e => updateRootArray('faqs', idx, 'q', e.target.value)} />
                                        <textarea className="input-field py-1.5 min-h-[80px]" placeholder="الجواب التفصيلي..." value={faq.a} onChange={e => updateRootArray('faqs', idx, 'a', e.target.value)} />
                                    </div>
                                </div>
                            ))}
                            <button onClick={() => addToRootArray('faqs', { q: 'سؤال جديد؟', a: 'الإجابة هنا' })} className="btn-secondary w-full py-2 flex items-center justify-center gap-2">
                                <Plus className="w-4 h-4" /> إضافة سؤال
                            </button>
                        </div>
                    )}
                </div>

                {/* -- FINAL CTA SECTION -- */}
                <div className="bg-white rounded-2xl border shadow-sm overflow-hidden" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)' }}>
                    <button onClick={() => toggleSection('finalCta')} className="w-full flex justify-between items-center p-5 bg-gray-50/50 hover:bg-gray-50 transition-colors">
                        <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>قسم الدعوة النهائي (Bottom CTA)</h2>
                        {expandedSection === 'finalCta' ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                    </button>

                    {expandedSection === 'finalCta' && (
                        <div className="p-5 border-t space-y-4" style={{ borderColor: 'var(--color-border)' }}>
                            <div>
                                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>العنوان البارز</label>
                                <input type="text" className="input-field" value={homepage.final_cta.title} onChange={e => updateNested('final_cta', 'title', e.target.value)} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>الوصف الشجيعي (Subtitle)</label>
                                <textarea className="input-field min-h-[60px]" value={homepage.final_cta.subtitle} onChange={e => updateNested('final_cta', 'subtitle', e.target.value)} />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t" style={{ borderColor: 'var(--color-border)' }}>
                                <div>
                                    <label className="block text-xs mb-1">نص الزر</label>
                                    <input type="text" className="input-field py-1.5" value={homepage.final_cta.cta_label} onChange={e => updateNested('final_cta', 'cta_label', e.target.value)} />
                                </div>
                                <div>
                                    <label className="block text-xs mb-1">الوجهة (Target)</label>
                                    <input type="text" className="input-field py-1.5" dir="ltr" value={homepage.final_cta.cta_url} onChange={e => updateNested('final_cta', 'cta_url', e.target.value)} />
                                </div>
                            </div>
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
}
