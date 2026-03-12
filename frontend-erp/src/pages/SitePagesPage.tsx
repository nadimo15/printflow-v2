import { useEffect, useState } from 'react';
import { Save, AlertCircle, Plus, Trash2, Edit } from 'lucide-react';
import { api } from '../services/api';
import toast from 'react-hot-toast';
import { SiteConfig } from '../types/siteConfig';

export default function SitePagesPage() {
    const [config, setConfig] = useState<SiteConfig | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [editIndex, setEditIndex] = useState<number | null>(null); // Null means list view

    useEffect(() => {
        fetchConfig();
    }, []);

    const fetchConfig = async () => {
        try {
            const response = await api.siteConfig.get();
            if (response.success && response.data) {
                const raw = response.data.draft_data || response.data;
                // Normalize pages: DB may store as [] instead of {custom_pages: []}
                const pages = Array.isArray(raw.pages)
                    ? { custom_pages: raw.pages }
                    : (raw.pages || { custom_pages: [] });
                if (!pages.custom_pages) pages.custom_pages = [];
                setConfig({ ...raw, pages } as SiteConfig);
            } else {
                // No config found — use empty default
                setConfig({ pages: { custom_pages: [] } } as unknown as SiteConfig);
            }
        } catch (error) {
            console.error('SitePagesPage fetchConfig error:', error);
            toast.error('فشل في تحميل الإعدادات');
            // Still set an empty config so the page renders
            setConfig({ pages: { custom_pages: [] } } as unknown as SiteConfig);
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

    const addPage = () => {
        if (!config) return;
        setConfig({
            ...config,
            pages: {
                ...config.pages,
                custom_pages: [
                    ...config.pages.custom_pages,
                    { id: `page-${Date.now()}`, slug: 'new-page', title: 'صفحة جديدة', content: 'محتوى الصفحة هنا...', is_published: false }
                ]
            }
        });
        setEditIndex(config.pages.custom_pages.length); // Open the new page in editor
    };

    const updatePage = (index: number, field: string, value: any) => {
        if (!config) return;
        const custom_pages = [...config.pages.custom_pages];
        custom_pages[index] = { ...custom_pages[index], [field]: value };
        setConfig({
            ...config,
            pages: { ...config.pages, custom_pages }
        });
    };

    const removePage = (index: number) => {
        if (!config) return;
        const custom_pages = config.pages.custom_pages.filter((_, i) => i !== index);
        setConfig({
            ...config,
            pages: { ...config.pages, custom_pages }
        });
        if (editIndex === index) setEditIndex(null);
    };

    if (loading || !config) return <div className="p-6">جاري التحميل...</div>;

    const { pages } = config;

    return (
        <div className="p-6 max-w-5xl mx-auto" dir="rtl">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold mb-1" style={{ color: 'var(--text-primary)' }}>الصفحات المخصصة (Custom Pages)</h1>
                    <p style={{ color: 'var(--text-muted)' }}>إنشاء وإدارة صفحات تعريفية إضافية (مثل: من نحن، سياسة الخصوصية، شروط الاستخدام).</p>
                </div>
                <button onClick={handleSave} disabled={saving} className="btn-primary flex items-center gap-2">
                    <Save className="w-4 h-4" />
                    {saving ? 'جاري الحفظ...' : 'حفظ التغييرات'}
                </button>
            </div>

            <div className="bg-white rounded-2xl border min-h-[500px] flex overflow-hidden shadow-sm" style={{ borderColor: 'var(--color-border)', backgroundColor: 'var(--color-surface)' }}>

                {/* Sidebar List */}
                <div className="w-1/3 border-l bg-gray-50/50 flex flex-col" style={{ borderColor: 'var(--color-border)' }}>
                    <div className="p-4 border-b flex justify-between items-center bg-white" style={{ borderColor: 'var(--color-border)' }}>
                        <h2 className="font-bold" style={{ color: 'var(--text-primary)' }}>قائمة الصفحات</h2>
                        <button onClick={addPage} className="p-1.5 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors">
                            <Plus className="w-4 h-4" />
                        </button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-2 space-y-1">
                        {pages.custom_pages.map((page, idx) => (
                            <div
                                key={page.id}
                                onClick={() => setEditIndex(idx)}
                                className={`p-3 rounded-xl cursor-pointer flex justify-between items-center transition-colors border ${editIndex === idx ? 'bg-purple-50 border-purple-200' : 'bg-white border-transparent hover:border-gray-200'}`}
                            >
                                <div className="flex flex-col overflow-hidden">
                                    <span className="font-bold text-sm truncate" style={{ color: 'var(--text-primary)' }}>{page.title || 'بدون عنوان'}</span>
                                    <span className="text-xs text-gray-400 font-mono truncate" dir="ltr">/{page.slug}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className={`w-2 h-2 rounded-full ${page.is_published ? 'bg-green-500' : 'bg-gray-300'}`} title={page.is_published ? 'منشورة' : 'مسودة غير ظاهرة'}></div>
                                    <button onClick={(e) => { e.stopPropagation(); removePage(idx); }} className="p-1 text-red-400 hover:text-red-600 rounded">
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        ))}
                        {pages.custom_pages.length === 0 && (
                            <div className="text-center py-10 text-xs text-gray-400">لا توجد صفحات. اضغط على (+) لإضافة صفحة.</div>
                        )}
                    </div>
                </div>

                {/* Editor Pane */}
                <div className="w-2/3 p-6 flex flex-col items-center justify-center bg-white" style={{ backgroundColor: 'var(--color-surface)' }}>
                    {editIndex !== null && pages.custom_pages[editIndex] ? (
                        <div className="w-full h-full flex flex-col space-y-4 animate-in fade-in duration-200">
                            <div className="flex justify-between items-center">
                                <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>محرر الصفحة</h2>
                                <label className="flex items-center gap-2 cursor-pointer bg-gray-50 border px-3 py-1.5 rounded-lg" style={{ borderColor: 'var(--color-border)' }}>
                                    <input
                                        type="checkbox"
                                        checked={pages.custom_pages[editIndex].is_published}
                                        onChange={e => updatePage(editIndex, 'is_published', e.target.checked)}
                                        className="rounded border-gray-300 w-4 h-4 text-green-600 focus:ring-green-500"
                                    />
                                    <span className="text-sm font-bold text-gray-700">تفعيل ظهور الصفحة للمستخدمين</span>
                                </label>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1 text-gray-500">عنوان الصفحة (للزوار)</label>
                                    <input
                                        type="text"
                                        className="input-field text-lg font-bold py-2"
                                        value={pages.custom_pages[editIndex].title}
                                        onChange={e => updatePage(editIndex, 'title', e.target.value)}
                                        placeholder="مثال: سياسة الخصوصية"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1 text-gray-500">رابط الصفحة (Slug - أحرف انجليزية فقط)</label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-2.5 text-gray-400 font-mono text-sm">/pages/</span>
                                        <input
                                            type="text"
                                            className="input-field py-2 pl-16 font-mono text-sm"
                                            dir="ltr"
                                            value={pages.custom_pages[editIndex].slug}
                                            onChange={e => updatePage(editIndex, 'slug', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))}
                                            placeholder="privacy-policy"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="flex-1 flex flex-col min-h-0">
                                <label className="block text-sm font-medium mb-1 text-gray-500">المحتوى (يدعم نصوص Markdown البسيطة - أو نصوص عادية)</label>
                                <textarea
                                    className="input-field flex-1 resize-none font-mono text-sm p-4 leading-relaxed whitespace-pre-wrap"
                                    value={pages.custom_pages[editIndex].content}
                                    onChange={e => updatePage(editIndex, 'content', e.target.value)}
                                    placeholder="# عنوان كبير&#10;محتوى الصفحة هنا..."
                                    dir="auto"
                                />
                            </div>

                        </div>
                    ) : (
                        <div className="text-center flex flex-col items-center justify-center opacity-50">
                            <Edit className="w-12 h-12 text-gray-300 mb-4" />
                            <p className="text-gray-500">اختر صفحة من القائمة لتعديلها أو أضف صفحة جديدة.</p>
                        </div>
                    )}
                </div>

            </div>

            <div className="mt-6 bg-blue-50/10 border border-blue-500/20 rounded-xl p-4 flex gap-3">
                <AlertCircle className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
                <p className="text-sm text-blue-400">
                    <strong>معلومة:</strong> للوصول إلى أي صفحة منشورة، استخدم الرابط الثابت <code>https://yourstore.com/pages/SLUG</code>. لتضمينها في الفوتر، استخدم نوع الرابط <strong>صفحة ديناميكية (Slug)</strong> في صفحة تحرير الفوتر، واكتب الـ slug فقط في حقل الوجهة.
                </p>
            </div>

        </div>
    );
}
