import { SiteConfig } from '../types/siteConfig';

export const defaultSiteConfig: SiteConfig = {
    settings: {
        brand_name: 'Pakomi',
        logo_url: '',
        contact_email: 'info@pakomi.dz',
        contact_phone: '0555-55-55-55',
        whatsapp_number: '',
        social_links: {
            instagram: '#',
            facebook: '#',
            tiktok: '#',
        },
        announcement_text: '',
        announcement_visible: false,
        seo_title: 'Pakomi Portal',
        seo_description: 'باكومي بورتال هي منصة جزائرية رائدة تدمج بين خبرة الطباعة التقليدية والحلول الرقمية الذكية',
    },
    navigation: {
        header_links: [
            { id: '1', label: 'المنتجات', type: 'route', target: '/products' },
            { id: '2', label: 'كيف نعمل', type: 'scroll', target: '#how-it-works' },
            { id: '3', label: 'آراء العملاء', type: 'scroll', target: '#reviews' },
            { id: '4', label: 'الأسئلة الشائعة', type: 'scroll', target: '#faq' },
        ],
        footer_columns: [
            {
                id: 'col-1',
                title: 'المنتجات',
                links: [
                    { id: 'p1', label: 'أكياس كرافت', type: 'route', target: '/products' },
                    { id: 'p2', label: 'أكياس بلاستيكية', type: 'route', target: '/products' },
                    { id: 'p3', label: 'صناديق كرتونية', type: 'route', target: '/products' },
                    { id: 'p4', label: 'تيشرات مطبوعة', type: 'route', target: '/products' },
                    { id: 'p5', label: 'كابات مطرزة', type: 'route', target: '/products' },
                ]
            },
            {
                id: 'col-2',
                title: 'الشركة',
                links: [
                    { id: 'c1', label: 'من نحن', type: 'scroll', target: '#about' },
                    { id: 'c2', label: 'كيف نعمل', type: 'scroll', target: '#how-it-works' },
                    { id: 'c3', label: 'آراء العملاء', type: 'scroll', target: '#reviews' },
                    { id: 'c4', label: 'تواصل معنا', type: 'scroll', target: '#contact' },
                ]
            },
            {
                id: 'col-3',
                title: 'الدعم',
                links: [
                    { id: 's1', label: 'الأسئلة الشائعة', type: 'scroll', target: '#faq' },
                    { id: 's2', label: 'تتبع الطلب', type: 'route', target: '/track' },
                    { id: 's3', label: 'شروط الاستخدام', type: 'route', target: '/terms' },
                    { id: 's4', label: 'سياسة الخصوصية', type: 'route', target: '/privacy' },
                ]
            }
        ],
        footer_text: 'باكومي بورتال هي منصة جزائرية رائدة تدمج بين خبرة الطباعة التقليدية والحلول الرقمية الذكية لدعم تجار الإيكوميرس في 58 ولاية.',
    },
    homepage: {
        hero: {
            badge_text: 'ثورة في عالم الطباعة والتغليف بالجزائر 🇩🇿',
            title: 'تغليف ذكي، إنتاج أسرع\nونمو لا يتوقف لعلامتك.',
            subtitle: 'ارتقِ بتجربة عملائك مع حلول تخصيص حديثة تغطي 58 ولاية. اربط أعمالك مباشرة بمنصة الطباعة والمتابعة الأقوى.',
            primary_cta_label: 'اطلب تغليفك الآن',
            primary_cta_link: '/products',
            secondary_cta_label: 'تتبع طلباتك',
            secondary_cta_link: '/track',
            background_url: '',
        },
        stats_visible: true,
        stats: [],
        how_it_works_visible: true,
        steps: [
            { id: 's1', icon_name: 'ShoppingBag', title: 'اختر منتجك', description: 'تصفح منتجاتنا المتنوعة المستوحاة من الجودة العالية وحدد باقتك' },
            { id: 's2', icon_name: 'Upload', title: 'ارفع تصميمك', description: 'أرفق شعارك بسهولة وسيتولى فريقنا تحسينه لنتيجة مبهرة' },
            { id: 's3', icon_name: 'Truck', title: 'استلم طلبك', description: 'تتبع طلبك بكل شفافية حتى وصوله إلى باب محلك' },
        ],
        faqs: [
            { id: 'f1', q: 'كم تستغرق عملية الإنتاج؟', a: 'تستغرق عملية الإنتاج عادة من 3 إلى 5 أيام عمل، وقد تختلف المدة قليلاً حسب نوع المنتج والكمية المطلوبة.', visible: true },
            { id: 'f2', q: 'هل يمكنني طلب عينة قبل الإنتاج النهائي؟', a: 'نعم، يمكننا توفير عينة بتصميمكم للتحقق من الجودة قبل اعتماد الإنتاج الكامل للتأكد من رضاكم التام.', visible: true },
            { id: 'f3', q: 'ما هي أقل كمية يمكن طلبها؟', a: 'تختلف الكمية الدنيا باختلاف المنتج. بعض المنتجات تتوفر ابتداءً من 100 قطعة، بينما تتطلب منتجات أخرى كميات أكبر. يمكنكم مراجعة تفاصيل كل منتج لمعرفة الحد الأدنى الخاص به.', visible: true },
            { id: 'f4', q: 'هل تقدمون خدمة التصميم؟', a: 'نعم، نمتلك فريق من المصممين المحترفين الذين يمكنهم مساعدتكم في إنشاء أو تحسين تصاميمكم لضمان أفضل نتيجة طباعة ممكنة.', visible: true },
        ],
        testimonials: [
            { id: 't1', name: 'أحمد. ك', rating: 5, text: 'جودة استثنائية! لقد أضاف التغليف الجديد لمسة احترافية حقيقية لمنتجاتنا. التوصيل كان سريعاً والتعامل راقي جداً.', visible: true },
            { id: 't2', name: 'سارة. م', rating: 5, text: 'تجربة رائعة من البداية للنهاية. نظام التتبع المباشر طمأننا كثيراً، والنتيجة النهائية فاقت توقعاتنا.', visible: true },
            { id: 't3', name: 'ياسين. ب', rating: 5, text: 'فريق محترف بالفعل. ساعدونا في تعديل التصميم ليتناسب مع الطباعة بشكل مثالي. بالتأكيد سنتعامل معهم مرة أخرى.', visible: true },
        ],
        final_cta: {
            title: 'جاهز للبدء؟',
            subtitle: 'انطلق بمشروعك الآن واحصل على تغليف مميز ينقل علامتك إلى مستوى آخر',
            cta_label: 'استعرض المنتجات',
            cta_url: '/products',
        }
    },
    product_page: {
        show_min_quantity: true,
        show_price_per_unit: true,
        quick_order_button_text: 'طلب سريع',
        add_to_cart_button_text: 'أضف إلى السلة',
    },
    forms: {
        quick_order: {
            name: { visible: true, required: true, label: 'الاسم الكامل', placeholder: 'محمد بن عبد الله', help_text: '' },
            phone: { visible: true, required: true, label: 'رقم الهاتف', placeholder: '05XXXXXXXX', help_text: '' },
            wilaya: { visible: true, required: true, label: 'الولاية', placeholder: 'اختر الولاية...', help_text: '' },
            address: { visible: true, required: true, label: 'العنوان', placeholder: 'الحي، البلدية...', help_text: '' },
            notes: { visible: true, required: false, label: 'ملاحظات', placeholder: 'ملاحظات إضافية حول الطلب (تعديلات، ألوان معينة...)', help_text: '' },
            design_upload: { visible: true, required: false, require_upload: false, label: 'ملف التصميم', placeholder: 'اضغط لرفع الملف أو اسحب الملف هنا', help_text: 'PNG, JPG, PDF, SVG, AI (Max 10MB)' },
        },
        checkout: {
            name: { visible: true, required: true, label: 'الاسم الكامل', placeholder: 'الاسم الكامل *', help_text: '' },
            phone: { visible: true, required: true, label: 'رقم الهاتف', placeholder: 'رقم الهاتف *', help_text: '' },
            wilaya: { visible: true, required: true, label: 'الولاية', placeholder: 'اختر الولاية *', help_text: '' },
            address: { visible: true, required: true, label: 'العنوان بالتفصيل', placeholder: 'العنوان بالتفصيل *', help_text: '' },
            notes: { visible: true, required: false, label: 'ملاحظات', placeholder: 'ملاحظات (اختياري)', help_text: '' },
            design_upload: { visible: false, required: false, require_upload: false, label: '', placeholder: '', help_text: '' },
        }
    },
    checkout: {
        payment_title: 'طريقة الدفع',
        payment_methods: {
            cod: { label: 'الدفع عند الاستلام', description: 'ادفع نقداً عند استلام طلبك', visible: true },
            bank: { label: 'تحويل بنكي', description: 'تحويل مباشر إلى حسابنا البنكي', visible: true },
            pickup: { label: 'الاستلام من المحل', description: 'استلم طلبك من مقرنا دُون توقُع رسوم توصيل', visible: true },
        },
        shipping_calculator_text: 'التكلفة التقديرية حسب الوزن',
        policies: [
            { id: '1', title: 'سياسة الاسترجاع', description: 'يمكنك استرجاع المبلغ خلال 3 أيام في حالة العيوب المصنعية.' },
            { id: '2', title: 'التوصيل', description: 'نحن ملتزمون بتوصيل طلبك في أسرع وقت ممكن.' }
        ],
        shipping_badges: [
            { id: '1', text: 'توصيل سريع', icon: 'Truck', enabled: true }
        ]
    },
    tracking: {
        title: 'تتبع طلبك',
        description: 'أدخل رقم طلبك لمعرفة حالته',
        steps: [
            { id: 'ts1', key: 'pending', label: 'معلّق', icon: 'Clock', instruction: 'طلبك قيد المراجعة. سنتواصل معك قريباً لتأكيد التفاصيل.' },
            { id: 'ts2', key: 'confirmed', label: 'مؤكد', icon: 'CheckCircle', instruction: 'تم تأكيد طلبك. يرجى اعتماد التصميم إذا كان مطلوباً.' },
            { id: 'ts3', key: 'in_production', label: 'قيد التنفيذ', icon: 'Package', instruction: 'طلبك الآن قيد الإنتاج والمتابعة.' },
            { id: 'ts4', key: 'ready', label: 'جاهز', icon: 'Box', instruction: 'طلبك جاهز! في انتظار شركة التوصيل أو الاستلام.' },
            { id: 'ts5', key: 'delivered', label: 'تم التسليم', icon: 'CheckCircle', instruction: 'تم تسليم طلبك بنجاح. شكراً لثقتكم بنا.' },
        ],
    },
    pages: { custom_pages: [] }
};
