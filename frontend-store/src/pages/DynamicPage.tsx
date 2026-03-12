import { useParams } from 'react-router-dom';
import { useSiteConfig } from '../hooks/useSiteConfig';
import NotFoundPage from './NotFoundPage';

export default function DynamicPage() {
    const { slug } = useParams();
    const { config, isPreviewMode } = useSiteConfig();

    const pages = config.pages?.custom_pages || [];

    // Find the requested page by slug
    const page = pages.find((p: any) => p.slug === slug);

    // If page not found, or not published (and we aren't previewing), show 404
    if (!page || (!isPreviewMode && !page.is_published)) {
        return <NotFoundPage />;
    }

    return (
        <div className="min-h-screen relative overflow-hidden bg-surface-darker pt-32 pb-16 text-white leading-relaxed">
            {/* Background aesthetics */}
            <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none mix-blend-overlay"></div>
            <div className="blob-purple w-[600px] h-[600px] top-[-100px] right-[-100px] opacity-10 mix-blend-screen pointer-events-none" />

            <div className="max-w-4xl mx-auto px-4 relative z-10">
                {isPreviewMode && !page.is_published && (
                    <div className="mb-6 bg-yellow-500/20 border border-yellow-500/50 text-yellow-400 px-4 py-3 rounded-xl flex items-center justify-center font-bold">
                        وضع المعاينة: هذه الصفحة غير منشورة ولن تظهر للزوار.
                    </div>
                )}

                <div className="mb-12 border-b border-white/10 pb-8 text-center md:text-right">
                    <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-white mb-4">
                        {page.title}
                    </h1>
                    <p className="text-sm text-gray-500">
                        تم التحديث: {new Date(page.updated_at || Date.now()).toLocaleDateString('ar-DZ')}
                    </p>
                </div>

                <div className="glass-card p-8 md:p-12 rounded-3xl border-white/10 bg-surface-dark/80 relative overflow-hidden prose prose-invert prose-purple max-w-none">
                    <div className="absolute top-0 left-0 w-32 h-32 bg-pakomi-purple/10 rounded-full blur-3xl -ml-16 -mt-16 pointer-events-none"></div>

                    {/* Render raw HTML/text */}
                    <div
                        className="relative z-10 space-y-4"
                        dangerouslySetInnerHTML={{ __html: page.content }}
                    />

                </div>
            </div>
        </div>
    );
}
