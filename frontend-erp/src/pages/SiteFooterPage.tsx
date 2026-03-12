import { useEffect, useState } from 'react';
import { Save, AlertCircle, Plus, Trash2, ArrowUp, ArrowDown, Columns } from 'lucide-react';
import { api } from '../services/api';
import toast from 'react-hot-toast';
import { SiteConfig, FooterColumn, NavLink } from '../types/siteConfig';

export default function SiteFooterPage() {
    const [config, setConfig] = useState<SiteConfig | null>(null);
    const [columns, setColumns] = useState<FooterColumn[]>([]);
    const [footerText, setFooterText] = useState('');
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
                setColumns(response.data.draft_data.navigation.footer_columns || []);
                setFooterText(response.data.draft_data.navigation.footer_text || '');
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
                    footer_columns: columns,
                    footer_text: footerText
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

    // -- Column Management --
    const addColumn = () => {
        setColumns([...columns, { id: `col-${Date.now()}`, title: 'عمود جديد', links: [] }]);
    };

    const removeColumn = (colId: string) => {
        setColumns(columns.filter(c => c.id !== colId));
    };

    const updateColumnTitle = (colId: string, title: string) => {
        setColumns(columns.map(c => c.id === colId ? { ...c, title } : c));
    };

    const moveColumn = (index: number, direction: 'up' | 'down') => {
        if (direction === 'up' && index === 0) return;
        if (direction === 'down' && index === columns.length - 1) return;

        const newCols = [...columns];
        const targetIndex = direction === 'up' ? index - 1 : index + 1;
        [newCols[index], newCols[targetIndex]] = [newCols[targetIndex], newCols[index]];
        setColumns(newCols);
    };

    // -- Link Management --
    const addLink = (colId: string) => {
        setColumns(columns.map(c => {
            if (c.id === colId) {
                return { ...c, links: [...c.links, { id: `link-${Date.now()}`, label: '', type: 'route', target: '' }] };
            }
            return c;
        }));
    };

    const updateLink = (colId: string, linkId: string, field: keyof NavLink, value: any) => {
        setColumns(columns.map(c => {
            if (c.id === colId) {
                return {
                    ...c,
                    links: c.links.map(l => l.id === linkId ? { ...l, [field]: value } : l)
                };
            }
            return c;
        }));
    };

    const removeLink = (colId: string, linkId: string) => {
        setColumns(columns.map(c => {
            if (c.id === colId) {
                return { ...c, links: c.links.filter(l => l.id !== linkId) };
            }
            return c;
        }));
    };

    const moveLink = (colId: string, index: number, direction: 'up' | 'down') => {
        setColumns(columns.map(c => {
            if (c.id === colId) {
                if (direction === 'up' && index === 0) return c;
                if (direction === 'down' && index === c.links.length - 1) return c;
                const newLinks = [...c.links];
                const targetIndex = direction === 'up' ? index - 1 : index + 1;
                [newLinks[index], newLinks[targetIndex]] = [newLinks[targetIndex], newLinks[index]];
                return { ...c, links: newLinks };
            }
            return c;
        }));
    };

    if (loading) return <div className="p-6">جاري التحميل...</div>;

    return (
        <div className="p-6 max-w-5xl mx-auto" dir="rtl">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold mb-1" style={{ color: 'var(--text-primary)' }}>شريط التذييل (Footer)</h1>
                    <p style={{ color: 'var(--text-muted)' }}>إدارة أعمدة الروابط السفلية ونص التذييل</p>
                </div>
                <button onClick={handleSave} disabled={saving} className="btn-primary flex items-center gap-2">
                    <Save className="w-4 h-4" />
                    {saving ? 'جاري الحفظ...' : 'حفظ التغييرات'}
                </button>
            </div>

            <div className="space-y-6">
                {/* Footer Text */}
                <div className="bg-white rounded-2xl border p-5 shadow-sm" style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
                    <h2 className="text-lg font-bold mb-4" style={{ color: 'var(--text-primary)' }}>الوصف السفلي</h2>
                    <div>
                        <textarea
                            className="input-field w-full min-h-[100px] resize-none"
                            value={footerText}
                            onChange={(e) => setFooterText(e.target.value)}
                            placeholder="نص تعريفي بالنشاط يظهر أسفل شعار باكومي في التذييل..."
                        />
                    </div>
                </div>

                {/* Columns Builder */}
                <div className="bg-white rounded-2xl border p-5 shadow-sm" style={{ backgroundColor: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
                    <div className="flex justify-between items-center mb-6 pb-4 border-b" style={{ borderColor: 'var(--color-border)' }}>
                        <h2 className="text-lg font-bold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                            <Columns className="w-5 h-5 text-purple-500" />
                            أعمدة الروابط السريعة
                        </h2>
                        <button onClick={addColumn} className="btn-secondary flex items-center gap-2 text-sm">
                            <Plus className="w-4 h-4" /> إضافة عمود
                        </button>
                    </div>

                    <div className="space-y-6">
                        {columns.map((col, colIdx) => (
                            <div key={col.id} className="p-4 border rounded-2xl bg-gray-50/50" style={{ borderColor: 'var(--color-border)' }}>
                                <div className="flex justify-between items-center mb-4">
                                    <div className="flex-1 max-w-sm flex items-center gap-3">
                                        <div className="flex flex-col gap-1 shrink-0">
                                            <button onClick={() => moveColumn(colIdx, 'up')} disabled={colIdx === 0} className="hover:text-purple-600 disabled:opacity-20 transition-colors" style={{ color: 'var(--text-secondary)' }}>
                                                <ArrowUp className="w-4 h-4" />
                                            </button>
                                            <button onClick={() => moveColumn(colIdx, 'down')} disabled={colIdx === columns.length - 1} className="hover:text-purple-600 disabled:opacity-20 transition-colors" style={{ color: 'var(--text-secondary)' }}>
                                                <ArrowDown className="w-4 h-4" />
                                            </button>
                                        </div>
                                        <input
                                            type="text"
                                            className="input-field py-1.5 font-bold"
                                            value={col.title}
                                            onChange={e => updateColumnTitle(col.id, e.target.value)}
                                            placeholder="عنوان العمود (مثلاً: المنتجات)"
                                        />
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <button onClick={() => addLink(col.id)} className="text-sm font-medium text-purple-600 hover:text-purple-700 flex items-center gap-1">
                                            <Plus className="w-4 h-4" /> إضافة رابط
                                        </button>
                                        <button onClick={() => removeColumn(col.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-xl transition-colors shrink-0" title="حذف العمود بالكامل">
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>

                                {/* Sub Links */}
                                <div className="pl-6 space-y-2 border-r-2 mr-6 pr-4" style={{ borderColor: 'var(--color-border)' }}>
                                    {col.links.map((link, linkIdx) => (
                                        <div key={link.id} className="flex flex-wrap md:flex-nowrap gap-2 items-center bg-white p-2 rounded-xl border shadow-sm" style={{ borderColor: 'var(--color-border)' }}>
                                            <input type="text" className="input-field py-1.5 flex-1 min-w-[150px]" value={link.label} onChange={e => updateLink(col.id, link.id, 'label', e.target.value)} placeholder="الرابط" />

                                            <select className="input-field py-1.5 w-full md:w-32 text-sm" value={link.type} onChange={e => updateLink(col.id, link.id, 'type', e.target.value)}>
                                                <option value="route">Route</option>
                                                <option value="scroll">Scroll</option>
                                                <option value="slug">Slug</option>
                                                <option value="external">Ext</option>
                                            </select>

                                            <input type="text" className="input-field py-1.5 flex-1 min-w-[150px]" value={link.target} onChange={e => updateLink(col.id, link.id, 'target', e.target.value)} dir="ltr" placeholder="/about" />

                                            <div className="flex gap-1 border rounded-lg overflow-hidden shrink-0" style={{ borderColor: 'var(--color-border)' }}>
                                                <button onClick={() => moveLink(col.id, linkIdx, 'up')} disabled={linkIdx === 0} className="px-1 py-1.5 hover:bg-gray-100 disabled:opacity-30" style={{ color: 'var(--text-secondary)' }}><ArrowUp className="w-3 h-3" /></button>
                                                <div className="w-px" style={{ backgroundColor: 'var(--color-border)' }}></div>
                                                <button onClick={() => moveLink(col.id, linkIdx, 'down')} disabled={linkIdx === col.links.length - 1} className="px-1 py-1.5 hover:bg-gray-100 disabled:opacity-30" style={{ color: 'var(--text-secondary)' }}><ArrowDown className="w-3 h-3" /></button>
                                            </div>

                                            <button onClick={() => removeLink(col.id, link.id)} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg shrink-0">
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    ))}
                                    {col.links.length === 0 && (
                                        <div className="text-xs text-gray-400 py-2">لا يوجد روابط في هذا العمود</div>
                                    )}
                                </div>
                            </div>
                        ))}

                        {columns.length === 0 && (
                            <div className="text-center py-8 text-gray-400 border-2 border-dashed rounded-xl" style={{ borderColor: 'var(--color-border)' }}>
                                لا توجد أعمدة مضافة. ابدأ بإضافة عمود لبناء هيكل الفوتر.
                            </div>
                        )}
                    </div>
                </div>

                <div className="bg-blue-50/10 border border-blue-500/20 rounded-xl p-4 flex gap-3">
                    <AlertCircle className="w-5 h-5 text-blue-400 shrink-0" />
                    <p className="text-sm text-blue-400">
                        <strong>ملاحظة هامة:</strong> الروابط الاجتماعية (انستغرام، تيك توك، فيسبوك) يتم التحكم فيها من صفحة <strong>إعدادات الموقع العامة</strong>.
                    </p>
                </div>
            </div>
        </div>
    );
}
