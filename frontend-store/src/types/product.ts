// ─── Product Domain Types ────────────────────────────────────────────────────

export type WeightUnit = 'g' | 'kg';
export type SelectType = 'single' | 'multi';
export type ProductStatus = 'draft' | 'active' | 'archived';

// Pricing tier: min_qty ≤ qty ≤ max_qty (null = unlimited) → unit_price
export interface PriceTier {
    id?: string;
    min_qty: number;
    max_qty: number | null;
    unit_price: number;
}

// A single value inside a production option group
export interface ProductionOptionValue {
    id?: string;
    name_ar: string;
    name_en: string;
    price_delta: number;
    is_default: boolean;
}

// A production option group (e.g. "Printing Side", "Lamination")
export interface ProductionOption {
    id?: string;
    name_ar: string;
    name_en: string;
    select_type: SelectType;
    sort_order: number;
    values: ProductionOptionValue[];
}

// A single value inside an attribute group (e.g. "A4", "Glossy")
export interface AttributeValue {
    id?: string;
    name_ar: string;
    name_en: string;
    price_delta: number;
    weight_delta: number;
    weight_unit: WeightUnit;
}

// An attribute group (e.g. "Paper Type", "Size", "Corners")
export interface AttributeGroup {
    id?: string;
    name_ar: string;
    name_en: string;
    select_type: SelectType;
    sort_order: number;
    values: AttributeValue[];
}

// Full product form data (matches DB columns + sub-entities)
export interface ProductFormData {
    id?: string;

    // Basic Info
    name_ar: string;
    name_en: string;
    description_ar: string;
    description_en: string;
    category: string;
    unit_of_measure: string;
    min_quantity: number;
    is_active: boolean;
    is_published: boolean;
    image: string;
    images?: string[];

    // Pricing
    base_price: number;
    price_tiers: PriceTier[];

    // Production Options
    production_options: ProductionOption[];

    // Attributes / Variants
    attribute_groups: AttributeGroup[];

    // Shipping & Weight
    has_weight: boolean;
    weight_per_unit: number;
    weight_unit: WeightUnit;
    packaging_weight: number;
    packaging_weight_unit: WeightUnit;
}

// Order weight calculation types
export interface OrderLineWeightInput {
    base_weight_g: number; // already normalized to grams
    weight_deltas_g: number[]; // each delta normalized to grams
    quantity: number;
}

export interface OrderWeightResult {
    effective_unit_weight_g: number;
    line_total_weight_g: number;
}

export const EMPTY_PRODUCT: ProductFormData = {
    name_ar: '',
    name_en: '',
    description_ar: '',
    description_en: '',
    category: 'bags',
    unit_of_measure: 'قطعة',
    min_quantity: 100,
    is_active: true,
    is_published: false,
    image: '',
    base_price: 0,
    price_tiers: [],
    production_options: [],
    attribute_groups: [],
    has_weight: false,
    weight_per_unit: 0,
    weight_unit: 'g',
    packaging_weight: 0,
    packaging_weight_unit: 'g',
};
