import { useEffect, useState } from 'react';
import { Save, RefreshCw, Eye, CheckCircle, ArrowRightLeft, Edit } from 'lucide-react';
import { api } from '../services/api';
import toast from 'react-hot-toast';
import { SiteConfig } from '../types/siteConfig';

export default function PublishCenterPage() {
    const [draftConfig, setDraftConfig] = useState<SiteConfig | null>(null);
    const [liveConfig, setLiveConfig] = useState<SiteConfig | null>(null);
    const [loading, setLoading] = useState(true);
    const [publishing, setPublishing] = useState(false);
    const [reverting, setReverting] = useState(false);

    useEffect(() => {
        fetchConfigs();
    }, []);

    const fetchConfigs = async () => {
        try {
            const response = await api.siteConfig.get();
            if (response.success && response.data) {
                setDraftConfig(response.data.draft_data);
                setLiveConfig(response.data.published_data);
            }
        } catch (error) {
            toast.error('فشل في تحميل الإعدادات من الخادم');
        } finally {
            setLoading(false);
        }
    };

    const handlePublish = async () => {
        if (!confirm('هل أنت متأكد من رغبتك في اعتماد هذه المسودة وعرضها فوراً لمستخدمي المتجر العام؟')) return;

        setPublishing(true);
        try {
            await api.siteConfig.publish();
            toast.success('تم النشر بنجاح! المتجر العام يعرض الآن التحديثات.');
            fetchConfigs(); // Refresh to sync dates and states visually
        } catch (error) {
            toast.error('حدث خطأ أثناء النشر');
        } finally {
            setPublishing(false);
        }
    };

    const handleRevertDraftToLive = async () => {
        if (!liveConfig) return;
        if (!confirm('هل أنت متأكد من رغبتك في إرجاع المسودة الحالية إلى نفس نسخة الموقع الحي الحالي؟ سيؤدي هذا لمسح أي تعديلات غير منشورة قمت بها.')) return;

        setReverting(true);
        try {
            await api.siteConfig.updateDraft(liveConfig);
            toast.success('تم التراجع واستعادة النسخة المنشورة إلى المسودة بنجاح.');
            fetchConfigs();
        } catch (error) {
            toast.error('حدث خطأ أثناء التراجع');
        } finally {
            setReverting(false);
        }
    }

    const handlePreview = () => {
        // Open the store frontend explicitly instructing it to read draft configs via URL parity
        const storeUrl = import.meta.env.VITE_FRONTEND_STORE_URL || 'http://localhost:5173';
        window.open(`${storeUrl}?preview=true`, '_blank');
    };

    // Simple deep equal check to see if there are pending changes
    // Usually stringifying JSON is a hack, but it works fine for predictable JSONB configs
    const hasPendingChanges = JSON.stringify(draftConfig) !== JSON.stringify(liveConfig);

    if (loading || !draftConfig || !liveConfig) return <div className="p-6">جاري التحميل...</div>;

    return (
        <div className="p-6 max-w-4xl mx-auto" dir="rtl">
            <div className="mb-8 text-center">
                <h1 className="text-3xl font-black mb-2 flex items-center justify-center gap-3 text-gray-900" style={{ color: 'var(--text-primary)' }}>
                    <RefreshCw className="w-8 h-8 text-purple-600" />
                    مركز النشر والمزامنة (Publish Center)
                </h1>
                <p className="text-gray-500 max-w-xl mx-auto">
                    التحكم النهائي في إطلاق التعديلات الجمالية والهيكلية إلى المتجر العام. جميع التعديلات التي قمت بها في صفحات "الإعدادات" تُحفظ كمسودة مخفية، ولن تظهر للعملاء حتى تقوم باعتماد النشر من هنا.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">

                {/* Live Status Card */}
                <div className="bg-white rounded-3xl border shadow-sm p-6 relative overflow-hidden flex flex-col" style={{ borderColor: 'var(--color-border)' }}>
                    <div className="absolute top-0 right-0 w-32 h-32 bg-green-50 rounded-bl-full -z-10 blur-xl"></div>

                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-full bg-green-100 flex justify-center items-center text-green-600">
                            <CheckCircle className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-gray-900">النسخة الحية (Live)</h2>
                            <p className="text-sm text-green-600 font-medium tracking-wide">الظاهرة للزوار حالياً</p>
                        </div>
                    </div>

                    <div className="flex-1 mt-4 space-y-3">
                        <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                            <span className="block text-xs text-gray-400 mb-1">تاريخ النشر</span>
                            {/* Normally we'd fetch the exact update_at date from backend, but keeping this simple for now */}
                            <strong className="text-sm font-mono text-gray-700">نشطة وآمنة</strong>
                        </div>
                        <p className="text-xs text-gray-500 leading-relaxed">
                            تمثل هذه النسخة الحالة المستقرة للمتجر التي يمكن للجميع رؤيتها والتسوق من خلالها بدون أخطاء إن شاء الله.
                        </p>
                    </div>
                </div>

                {/* Draft Status Card */}
                <div className="bg-white rounded-3xl border shadow-lg ring-2 ring-purple-100 p-6 relative overflow-hidden flex flex-col" style={{ borderColor: 'var(--color-border)' }}>
                    <div className={`absolute top-0 right-0 w-32 h-32 rounded-bl-full -z-10 blur-xl ${hasPendingChanges ? 'bg-purple-100' : 'bg-gray-100'}`}></div>

                    <div className="flex items-center gap-3 mb-4">
                        <div className={`w-10 h-10 rounded-full flex justify-center items-center ${hasPendingChanges ? 'bg-purple-100 text-purple-600' : 'bg-gray-100 text-gray-400'}`}>
                            <Edit className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-gray-900">المسودة (Draft)</h2>
                            <p className={`text-sm font-medium tracking-wide ${hasPendingChanges ? 'text-purple-600' : 'text-gray-500'}`}>
                                {hasPendingChanges ? 'يوجد تعديلات غير منشورة!' : 'لا توجد تعديلات جديدة'}
                            </p>
                        </div>
                    </div>

                    <div className="flex-1 mt-4 space-y-3">
                        <button onClick={handlePreview} className="w-full btn-secondary py-3 flex items-center justify-center gap-2 border-purple-200 hover:border-purple-300 hover:bg-purple-50 text-purple-700 transition-all font-bold group">
                            <Eye className="w-4 h-4 group-hover:scale-110 transition-transform" /> معاينة التعديلات سرّياً
                        </button>
                        <p className="text-xs text-gray-500 text-center px-4">
                            تصفح المتجر بأمان لرؤية التعديلات قبل إرسالها للعامة. سيفتح نافذة جديدة.
                        </p>
                    </div>
                </div>

            </div>

            <div className="flex flex-col items-center gap-4 py-8 border-y border-dashed mb-8 relative" style={{ borderColor: 'var(--color-border)' }}>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-gray-50 p-2 rounded-full border border-gray-200">
                    <ArrowRightLeft className="w-6 h-6 text-gray-400" />
                </div>

                <button
                    onClick={handlePublish}
                    disabled={publishing || !hasPendingChanges}
                    className={`px-8 py-4 rounded-full font-black text-lg shadow-xl hover:shadow-2xl transition-all transform hover:-translate-y-1 active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-3
             ${hasPendingChanges ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white' : 'bg-gray-200 text-gray-500 shadow-none hover:shadow-none hover:transform-none'}
           `}
                >
                    <Save className="w-6 h-6" />
                    {publishing ? 'جاري الاعتماد الأخير...' : 'اعتماد التغييرات ونشرها فوراً'}
                </button>

                {!hasPendingChanges && (
                    <p className="text-sm text-gray-400 font-medium">النسخة الحية تتطابق تماماً مع المسودة (لا شيء للنشر).</p>
                )}
            </div>

            {hasPendingChanges && (
                <div className="text-center mt-6">
                    <button
                        onClick={handleRevertDraftToLive}
                        disabled={reverting}
                        className="text-sm font-bold text-red-500 hover:text-red-600 underline underline-offset-4 opacity-80 hover:opacity-100 transition-opacity"
                    >
                        تراجعت عن رأيي! ألغِ كل التعديلات المتبقية واستعد المسودة من النسخة الحية.
                    </button>
                </div>
            )}

        </div>
    );
}
