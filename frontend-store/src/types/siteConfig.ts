export interface NavLink {
    id: string;
    label: string;
    type: 'route' | 'scroll' | 'external' | 'slug';
    target: string;
    is_cta?: boolean;
}

export interface FooterColumn {
    id: string;
    title: string;
    links: NavLink[];
}

export interface SiteSettings {
    brand_name: string;
    logo_url: string;
    contact_email: string;
    contact_phone: string;
    whatsapp_number: string;
    social_links: {
        instagram: string;
        facebook: string;
        tiktok: string;
    };
    announcement_text: string;
    announcement_visible: boolean;
    seo_title: string;
    seo_description: string;
}

export interface HomepageHero {
    badge_text: string;
    title: string;
    subtitle: string;
    primary_cta_label: string;
    primary_cta_link: string;
    secondary_cta_label: string;
    secondary_cta_link: string;
    background_url: string;
}

export interface HomepageStep {
    id: string;
    icon_name: string; // lucide icon name
    title: string;
    description: string;
}

export interface HomepageStat {
    id: string;
    value: string;
    label: string;
    icon_name: string;
}

export interface HomepageFAQ {
    id: string;
    q: string;
    a: string;
    visible: boolean;
}

export interface HomepageTestimonial {
    id: string;
    name: string;
    rating: number;
    text: string;
    visible: boolean;
}

export interface HomepageCTA {
    title: string;
    subtitle: string;
    cta_label: string;
    cta_url: string;
}

export interface FormFieldConfig {
    visible: boolean;
    required: boolean;
    label: string;
    placeholder: string;
    help_text: string;
    require_upload?: boolean;
}

export interface FormConfig {
    name?: FormFieldConfig;
    phone?: FormFieldConfig;
    email?: FormFieldConfig;
    wilaya?: FormFieldConfig;
    address?: FormFieldConfig;
    notes?: FormFieldConfig;
    design_upload?: FormFieldConfig;
}

export interface CheckoutConfig {
    payment_title: string;
    payment_methods: {
        cod: { label: string; description: string; visible: boolean };
        bank: { label: string; description: string; visible: boolean };
        pickup: { label: string; description: string; visible: boolean };
    };
    shipping_calculator_text: string;
    policies: { id: string; title: string; description: string }[];
    shipping_badges: { id: string; text: string; icon: string; enabled: boolean }[];
}

export interface TrackingConfig {
    title: string;
    description: string;
    steps: {
        id: string;
        key: 'pending' | 'confirmed' | 'in_production' | 'ready' | 'delivered';
        label: string;
        icon: string;
        instruction: string;
    }[];
}

export interface CustomPage {
    id: string;
    slug: string;
    title: string;
    content: string; // Markdown or HTML
    is_published: boolean;
    seo_description?: string;
    updated_at?: string;
}

export interface SiteConfig {
    settings: SiteSettings;
    navigation: {
        header_links: NavLink[];
        footer_columns: FooterColumn[];
        footer_text: string;
    };
    homepage: {
        hero: HomepageHero;
        stats_visible: boolean;
        stats: HomepageStat[];
        how_it_works_visible: boolean;
        steps: HomepageStep[];
        faqs: HomepageFAQ[];
        testimonials: HomepageTestimonial[];
        final_cta: HomepageCTA;
    };
    product_page: {
        show_min_quantity?: boolean;
        show_price_per_unit?: boolean;
        quick_order_button_text?: string;
        add_to_cart_button_text?: string;
        show_stock_status?: boolean;
        reviews?: { enabled: boolean; title: string; };
        shipping_badges?: { enabled: boolean; text: string; icon: string; }[];
    };
    forms: {
        quick_order: FormConfig;
        checkout: FormConfig;
    };
    checkout: CheckoutConfig;
    tracking: TrackingConfig;
    pages: { custom_pages: CustomPage[] };
}
