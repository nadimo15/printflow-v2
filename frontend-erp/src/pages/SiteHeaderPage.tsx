import { useEffect, useState } from 'react';
import { Save, AlertCircle, Plus, Trash2, ArrowUp, ArrowDown } from 'lucide-react';
import { api } from '../services/api';
import toast from 'react-hot-toast';
import { SiteConfig, NavLink } from '../types/siteConfig';

export default function SiteHeaderPage() {
    const [config, setConfig] = useState<SiteConfig | null>(null);
    const [links, setLinks] = useState<NavLink[]>([]);
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
                setLinks(response.data.draft_data.navigation.header_links || []);
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
            const newDraft = {
                ...config,
                navigation: {
                    ...config.navigation,
                    header_links: links
                }
            };
            await api.siteConfig.updateDraft(newDraft);
            setConfig(newDraft);
            toast.success('تم الحفظ في المسودة بنجاح');
        } catch (error) {
            toast.error('فشل في حفظ الإعدادات');
        } finally {
            setSaving(false);
        }
    };

    const addLink = () => {
        setLinks([...links, { id: Date.now().toString(), label: '', type: 'route', target: '' }]);
    };

    const updateLink = (id: string, field: keyof NavLink, value: any) => {
        setLinks(links.map(l => l.id === id ? { ...l, [field]: value } : l));
    };

    const removeLink = (id: string) => {
        setLinks(links.filter(l => l.id !== id));
    };

    const moveLink = (index: number, direction: 'up' | 'down') => {
        if (direction === 'up' && index === 0) return;
        if (direction === 'down' && index === links.length - 1) return;

        const newLinks = [...links];
        const targetIndex = direction === 'up' ? index - 1 : index + 1;
        [newLinks[index], newLinks[targetIndex]] = [newLinks[targetIndex], newLinks[index]];
        setLinks(newLinks);
    };

    if (loading) return <div className="p-6">جاري التحميل...</div>;

    return (
        <div className="p-6 max-w-5xl mx-auto" dir="rtl">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold mb-1" style={{ color: 'var(--text-primary)' }}>القائمة العلوية (Header)</h1>
                    <p style={{ color: 'var(--text-muted)' }}>إدارة روابط التصفح العلوية وأنواعها</p>
                </div>
                <button onClick={handleSave} disabled={saving} className="btn-primary flex items-center gap-2">
                    <Save className="w-4 h-4" />
                    {saving ? 'جاري الحفظ...' : 'حفظ التغييرات'}
                </button>
            </div>

            <div className="bg-white rounded-2xl border p-5 shadow-sm" style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>روابط التصفح</h2>
                    <button onClick={addLink} className="btn-secondary flex items-center gap-2 text-sm">
                        <Plus className="w-4 h-4" /> إضافة رابط جديد
                    </button>
                </div>

                <div className="space-y-3">
                    {links.map((link, index) => (
                        <div key={link.id} className="flex flex-col md:flex-row gap-3 items-end p-4 border rounded-xl bg-gray-50/50" style={{ borderColor: 'var(--color-border)' }}>
                            <div className="flex-1 w-full">
                                <label className="block text-xs font-medium mb-1 text-gray-500">عنوان الرابط</label>
                                <input type="text" className="input-field py-2" value={link.label} onChange={e => updateLink(link.id, 'label', e.target.value)} placeholder="مثال: الرئيسية" />
                            </div>

                            <div className="w-full md:w-48">
                                <label className="block text-xs font-medium mb-1 text-gray-500">نوع الرابط</label>
                                <select className="input-field py-2" value={link.type} onChange={e => updateLink(link.id, 'type', e.target.value)}>
                                    <option value="route">رابط داخلي (Route)</option>
                                    <option value="scroll">تمرير لصفحة الهوم (Scroll)</option>
                                    <option value="slug">صفحة ديناميكية (Slug)</option>
                                    <option value="external">رابط خارجي (External)</option>
                                </select>
                            </div>

                            <div className="flex-1 w-full">
                                <label className="block text-xs font-medium mb-1 text-gray-500">الوجهة (Target)</label>
                                <input type="text" className="input-field py-2" value={link.target} onChange={e => updateLink(link.id, 'target', e.target.value)} dir="ltr" placeholder={link.type === 'scroll' ? '#how-it-works' : '/products'} />
                            </div>

                            <div className="flex items-center h-10 gap-2 w-full md:w-auto mt-2 md:mt-0">
                                <label className="flex items-center gap-2 cursor-pointer ml-4">
                                    <input type="checkbox" checked={link.is_cta || false} onChange={e => updateLink(link.id, 'is_cta', e.target.checked)} className="rounded border-gray-300 w-4 h-4 text-purple-600 focus:ring-purple-500" />
                                    <span className="text-xs font-medium text-purple-600">زر بارز (CTA)</span>
                                </label>

                                <div className="flex gap-1 border rounded-lg overflow-hidden shrink-0 ml-2" style={{ borderColor: 'var(--color-border)' }}>
                                    <button onClick={() => moveLink(index, 'up')} disabled={index === 0} className="p-2 hover:bg-gray-100 disabled:opacity-30 transition-colors" style={{ color: 'var(--text-secondary)' }}>
                                        <ArrowUp className="w-4 h-4" />
                                    </button>
                                    <div className="w-px bg-gray-200" style={{ backgroundColor: 'var(--color-border)' }}></div>
                                    <button onClick={() => moveLink(index, 'down')} disabled={index === links.length - 1} className="p-2 hover:bg-gray-100 disabled:opacity-30 transition-colors" style={{ color: 'var(--text-secondary)' }}>
                                        <ArrowDown className="w-4 h-4" />
                                    </button>
                                </div>

                                <button onClick={() => removeLink(link.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg shrink-0 transition-colors">
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    ))}

                    {links.length === 0 && (
                        <div className="text-center py-8 text-gray-400 border-2 border-dashed rounded-xl" style={{ borderColor: 'var(--color-border)' }}>
                            لا توجد روابط مضافة حالياً
                        </div>
                    )}
                </div>
            </div>

            <div className="mt-6 bg-blue-50/10 border border-blue-500/20 rounded-xl p-4 flex gap-3">
                <AlertCircle className="w-5 h-5 text-blue-400 shrink-0" />
                <p className="text-sm text-blue-400">
                    <strong>دليل أنواع الروابط:</strong><br />
                    - <code>رابط داخلي</code>: لصفحات المتجر الأساسية (مثل <code>/products</code>).<br />
                    - <code>تمرير لصفحة الهوم</code>: للاقسام بالصفحة الرئيسية (مثل <code>#reviews</code>).<br />
                    - <code>صفحة ديناميكية</code>: لصفحات المعلومات المُنشأة بالنظام (مثل <code>/pages/privacy</code>).<br />
                    - <code>رابط خارجي</code>: لمواقع خارج النظام (مثل <code>https://google.com</code>).
                </p>
            </div>
        </div>
    );
}
