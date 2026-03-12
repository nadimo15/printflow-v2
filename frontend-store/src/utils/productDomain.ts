// ─── Product Domain Functions (Pure — no external dependencies) ──────────────
// Guardrail applied: all functions are pure, typed, and throw on invariant violation.

import type { PriceTier, OrderLineWeightInput, OrderWeightResult, WeightUnit } from '../types/product';

/**
 * Compute unit price for a given quantity using pricing tiers.
 * Returns base_price if no tiers match.
 * Tiers are sorted by min_qty ascending; the last tier with null max_qty catches all higher quantities.
 */
export function computeUnitPrice(qty: number, tiers: PriceTier[], basePrice: number): number {
    if (!tiers || tiers.length === 0) return basePrice;

    const sorted = [...tiers].sort((a, b) => a.min_qty - b.min_qty);

    // Find the matching tier
    for (const tier of sorted) {
        const withinMin = qty >= tier.min_qty;
        const withinMax = tier.max_qty === null || qty <= tier.max_qty;
        if (withinMin && withinMax) return (tier as any).price ?? tier.unit_price;
    }

    // If qty exceeds all tiers, use the last tier's price
    const lastTier = sorted[sorted.length - 1];
    if (qty > (lastTier.max_qty ?? Infinity)) return (lastTier as any).price ?? lastTier.unit_price;

    return basePrice;
}

/**
 * Compute total price for a given quantity.
 */
export function computeTotalPrice(qty: number, tiers: PriceTier[], basePrice: number): number {
    return computeUnitPrice(qty, tiers, basePrice) * qty;
}

/**
 * Normalize a weight value to grams.
 */
export function toGrams(value: number, unit: WeightUnit): number {
    return unit === 'kg' ? value * 1000 : value;
}

/**
 * Format grams for display: show as kg if ≥ 1000g.
 */
export function formatWeight(grams: number): string {
    if (grams >= 1000) return `${(grams / 1000).toFixed(3).replace(/\.?0+$/, '')} كغ`;
    return `${grams.toFixed(1).replace(/\.0$/, '')} غ`;
}

/**
 * Compute effective unit weight in grams.
 * Invariant I6: effective weight must be ≥ 0.
 * Throws if the result would be negative.
 */
export function computeEffectiveWeight(
    baseWeightG: number,
    deltasG: number[]
): number {
    const total = baseWeightG + deltasG.reduce((sum, d) => sum + d, 0);
    if (total < 0) {
        throw new Error(
            `INVARIANT_VIOLATION: effective_unit_weight (${total}g) < 0. ` +
            `Base: ${baseWeightG}g, Deltas: [${deltasG.join(', ')}]g`
        );
    }
    return total;
}

/**
 * Compute order line weight result.
 */
export function computeLineWeight(input: OrderLineWeightInput): OrderWeightResult {
    const effective = computeEffectiveWeight(input.base_weight_g, input.weight_deltas_g);
    return {
        effective_unit_weight_g: effective,
        line_total_weight_g: effective * input.quantity,
    };
}

/**
 * Compute total order weight from multiple lines + optional packaging weight.
 * Formula: Σ(effective_weight_i × qty_i) + packaging_weight_g
 */
export function computeOrderWeight(
    lines: OrderLineWeightInput[],
    packagingWeightG: number = 0
): number {
    const linesTotal = lines.reduce((sum, line) => {
        const result = computeLineWeight(line);
        return sum + result.line_total_weight_g;
    }, 0);
    return linesTotal + packagingWeightG;
}

/**
 * Validate pricing tiers for overlaps.
 * Returns an array of error messages (empty = valid).
 */
export function validateTiers(tiers: PriceTier[]): string[] {
    const errors: string[] = [];
    const sorted = [...tiers].sort((a, b) => a.min_qty - b.min_qty);

    for (let i = 0; i < sorted.length; i++) {
        const tier = sorted[i];
        if (tier.min_qty <= 0) {
            errors.push(`الشريحة ${i + 1}: الحد الأدنى للكمية يجب أن يكون أكبر من 0`);
        }
        if (tier.unit_price < 0) {
            errors.push(`الشريحة ${i + 1}: السعر لا يمكن أن يكون سالباً`);
        }
        if (tier.max_qty !== null && tier.max_qty < tier.min_qty) {
            errors.push(`الشريحة ${i + 1}: الحد الأقصى يجب أن يكون أكبر من أو يساوي الحد الأدنى`);
        }

        // Check overlap with next tier
        if (i < sorted.length - 1) {
            const next = sorted[i + 1];
            if (tier.max_qty === null) {
                errors.push(`الشريحة ${i + 1}: شريحة بحد أقصى غير محدد يجب أن تكون الأخيرة`);
            } else if (next.min_qty <= tier.max_qty) {
                errors.push(`الشريحة ${i + 1} و ${i + 2}: تتداخل في نطاق الكميات`);
            }
        }
    }

    return errors;
}
