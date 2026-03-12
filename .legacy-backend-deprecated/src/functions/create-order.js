// Web Crypto API is global in Deno
const encoder = new TextEncoder();

async function signJwt(payload, secret) {
    const header = { alg: "HS256", typ: "JWT" };
    const now = Math.floor(Date.now() / 1000);
    const jwtPayload = {
        role: "postgres",
        iss: "supabase",
        iat: now,
        exp: now + 3600 * 24 * 365, // 1 year
        ...payload
    };

    const encodedHeader = b64url(JSON.stringify(header));
    const encodedPayload = b64url(JSON.stringify(jwtPayload));
    const data = encoder.encode(`${encodedHeader}.${encodedPayload}`);

    const key = await crypto.subtle.importKey(
        "raw",
        encoder.encode(secret),
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["sign"]
    );

    const signature = await crypto.subtle.sign("HMAC", key, data);
    const encodedSignature = b64url(signature);

    return `${encodedHeader}.${encodedPayload}.${encodedSignature}`;
}

function b64url(input) {
    let base64;
    if (typeof input === "string") {
        base64 = btoa(input);
    } else {
        base64 = btoa(String.fromCharCode(...new Uint8Array(input)));
    }
    return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

// ─── Domain Logic (Mirrored from Frontend) ───

function toGrams(value, unit) {
    return unit === 'kg' ? value * 1000 : value;
}

function computeUnitPrice(qty, tiers, basePrice) {
    if (!tiers || tiers.length === 0) return basePrice;
    const sorted = [...tiers].sort((a, b) => a.min_qty - b.min_qty);

    for (const tier of sorted) {
        const withinMin = qty >= tier.min_qty;
        const withinMax = tier.max_qty === null || qty <= tier.max_qty;
        if (withinMin && withinMax) return tier.unit_price;
    }

    const lastTier = sorted[sorted.length - 1];
    if (qty > (lastTier.max_qty ?? Infinity)) return lastTier.unit_price;

    return basePrice;
}

// ─── Algerian Shipping Matrix ───
function getShippingCost(wilaya, weightG) {
    if (!wilaya) return 1000;

    // Base Rates
    let baseRate = 600; // Default North/Mid
    if (wilaya === 'الجزائر العاصمة') baseRate = 400;
    else if (['ورقلة', 'الأغواط', 'بسكرة', 'الوادي', 'أدرار', 'تمنراست', 'تندوف', 'إليزي', 'بشار'].includes(wilaya)) {
        baseRate = 1000; // South
    }

    // Weight logic: +200 DZD per extra Kg over 5Kg 
    let extraWeightCost = 0;
    if (weightG > 5000) {
        const extraKg = Math.ceil((weightG - 5000) / 1000);
        extraWeightCost = extraKg * 200;
    }

    return baseRate + extraWeightCost;
}

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
};

module.exports = async (req) => {
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        const secret = process.env.JWT_SECRET;
        const baseUrl = process.env.POSTGREST_BASE_URL || "http://postgrest:3000";

        if (!secret) throw new Error("Missing JWT_SECRET");

        const token = await signJwt({}, secret);

        const apiFetch = async (path, method = 'GET', body = null) => {
            const url = `${baseUrl}/${path}`;
            const headers = {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json",
                "Prefer": "return=representation"
            };
            const options = { method, headers, body: body ? JSON.stringify(body) : null };

            const res = await fetch(url, options);
            if (!res.ok) {
                const txt = await res.text();
                throw new Error(`DB Error ${res.status} on ${path}: ${txt}`);
            }
            return await res.json();
        };

        const body = await req.json();
        console.log("Payload:", JSON.stringify(body));

        const {
            customerName, customerPhone, customerEmail,
            wilaya, address, items, paymentMethod, notes, internalNotes,
            guestInfo, shippingAddress, source
        } = body;

        const cName = customerName || guestInfo?.name;
        const cPhone = customerPhone || guestInfo?.phone;
        const cEmail = customerEmail || guestInfo?.email;
        const cWilaya = wilaya || guestInfo?.wilaya;
        const cAddress = address || guestInfo?.address;
        const cItems = items;

        if (!cName || !cPhone || !cItems || cItems.length === 0) {
            return new Response(JSON.stringify({ error: "Missing fields" }), { status: 400, headers: corsHeaders });
        }

        // 1. Fetch Products for Validation (SECURITY: Server-side pricing enforcement)
        const productIds = [...new Set(cItems.map(i => i.productId || i.id).filter(Boolean))];
        let productsMap = {};
        if (productIds.length > 0) {
            const products = await apiFetch(`products?id=in.(${productIds.join(',')})`);
            products.forEach(p => { productsMap[p.id] = p; });
        }

        const orderId = crypto.randomUUID();
        const orderNumber = `ORD-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 1000)}`;

        // 2. Process Order Items (Calculate True Price & Weight)
        let subtotal = 0;
        let orderTotalWeightG = 0;
        const orderItems = [];

        for (const item of cItems) {
            const pid = item.productId || item.id;
            const product = productsMap[pid];
            const quantity = item.quantity || 1;
            let unitPrice = item.unitPrice || item.price || 0;
            let unitWeightG = 0;

            if (product) {
                // --- Price Calculation (Overrides Client Trust) ---
                if (product.price_tiers && product.price_tiers.length > 0) {
                    unitPrice = computeUnitPrice(quantity, product.price_tiers, product.base_price || 0);
                } else {
                    unitPrice = product.base_price || 0;
                }

                let priceDelta = 0;
                let weightDeltaG = 0;

                const findValue = (group, valName) => group.values?.find(v => (v.name_ar === valName || v.name_en === valName || v.name === valName));

                if (product.production_options && item.customization) {
                    for (const opt of product.production_options) {
                        const selection = item.customization[opt.name_ar] || item.customization[opt.name_en];
                        if (selection) {
                            const val = findValue(opt, selection);
                            if (val) priceDelta += (val.price_delta || 0);
                        }
                    }
                }

                if (product.attribute_groups && item.customization) {
                    for (const grp of product.attribute_groups) {
                        const selection = item.customization[grp.name_ar] || item.customization[grp.name_en];
                        if (selection) {
                            const val = findValue(grp, selection);
                            if (val) {
                                priceDelta += (val.price_delta || 0);
                                weightDeltaG += toGrams(val.weight_delta || 0, val.weight_unit || 'g');
                            }
                        }
                    }
                }

                unitPrice += priceDelta;

                // --- Weight Calculation ---
                if (product.has_weight) {
                    const baseWeight = toGrams(product.weight_per_unit || 0, product.weight_unit || 'g');
                    unitWeightG = Math.max(0, baseWeight + weightDeltaG);
                }
            }

            const total = unitPrice * quantity;
            const lineWeightG = unitWeightG * quantity;

            subtotal += total;
            orderTotalWeightG += lineWeightG;

            orderItems.push({
                order_id: orderId,
                product_id: pid || null,
                variant_id: item.variantId || null,
                name: item.name,
                name_ar: item.nameAr || item.name,
                sku: item.sku || 'N/A',
                unit_price: unitPrice,
                quantity: quantity,
                total: total,
                unit_weight: unitWeightG,
                total_weight: lineWeightG,
                customization: item.customization || null
            });
        }

        const uniqueProducts = [...new Set(orderItems.map(i => i.product_id).filter(Boolean))];
        let totalPackagingG = 0;
        uniqueProducts.forEach(pid => {
            const p = productsMap[pid];
            if (p && p.has_weight) {
                totalPackagingG += toGrams(p.packaging_weight || 0, p.packaging_weight_unit || 'g');
            }
        });
        orderTotalWeightG += totalPackagingG;

        // Apply authentic Shipping Calculation
        const shipping = subtotal > 50000 ? 0 : getShippingCost(cWilaya, orderTotalWeightG);
        const totalAmount = subtotal + shipping;

        // 3. Create or Fetch Customer
        let customerId;
        const found = await apiFetch(`customers?phone=eq.${cPhone}&select=id`);
        if (found.length > 0) {
            customerId = found[0].id;
        } else {
            const created = await apiFetch('customers', 'POST', {
                name: cName,
                email: cEmail,
                phone: cPhone,
                wilaya: cWilaya,
                address: cAddress,
                is_guest: true
            });
            customerId = created[0].id;
        }

        // 4. Create Order
        await apiFetch('orders', 'POST', {
            id: orderId,
            order_number: orderNumber,
            customer_id: customerId,
            guest_info: { name: cName, phone: cPhone, wilaya: cWilaya, address: cAddress },
            subtotal,
            discount: 0,
            shipping,
            tax: 0,
            total: totalAmount,
            total_weight: orderTotalWeightG,
            shipping_address: shippingAddress || { name: cName, phone: cPhone, wilaya: cWilaya, address: cAddress },
            payment_method: paymentMethod || 'cash_on_delivery',
            notes,
            internal_notes: internalNotes,
            source: source || (guestInfo ? 'storefront' : 'erp'),
            status: 'pending'
        });

        // 5. Create Items
        await apiFetch('order_items', 'POST', orderItems);

        return new Response(JSON.stringify({
            success: true,
            data: {
                id: orderId,
                orderNumber,
                total: totalAmount,
                totalWeight: orderTotalWeightG
            }
        }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 201
        });

    } catch (e) {
        return new Response(JSON.stringify({ error: e.message, stack: e.stack }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 500
        });
    }
};
