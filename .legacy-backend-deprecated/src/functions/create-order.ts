
const _enc = new TextEncoder();

async function _jwt(secret: string): Promise<string> {
    const now = Math.floor(Date.now() / 1000);
    const h = _b64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
    const p = _b64url(JSON.stringify({ role: "postgres", iss: "supabase", iat: now, exp: now + 86400 * 365 }));
    const key = await crypto.subtle.importKey("raw", _enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
    const sig = await crypto.subtle.sign("HMAC", key, _enc.encode(`${h}.${p}`));
    return `${h}.${p}.${_b64url(sig)}`;
}

function _b64url(v: string | ArrayBuffer): string {
    const s = typeof v === "string" ? btoa(v) : btoa(String.fromCharCode(...new Uint8Array(v as ArrayBuffer)));
    return s.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

const SHIP: Record<string, number> = {
    "الجزائر العاصمة": 400, "بليدة": 450, "تيبازة": 450, "بومرداس": 450,
    "البويرة": 500, "المدية": 500, "عين الدفلى": 550, "تيزي وزو": 550,
    "الشلف": 600, "وهران": 600, "سطيف": 650, "بجاية": 650, "جيجل": 650,
    "تيسمسيلت": 650, "قسنطينة": 650, "عنابة": 700, "باتنة": 700,
    "الوادي": 700, "سعيدة": 700, "سكيكدة": 700, "قالمة": 700,
    "مستغانم": 700, "تلمسان": 700, "المسيلة": 750, "سيدي بلعباس": 700,
    "ميلة": 700, "أم البواقي": 700, "تيارت": 700, "الجلفة": 800,
    "بسكرة": 800, "خنشلة": 800, "تبسة": 800, "سوق أهراس": 800,
    "الطارف": 750, "عين تيموشنت": 700, "معسكر": 700, "بريكة": 750,
    "ورقلة": 900, "الأغواط": 850, "غرداية": 950, "البيض": 900,
    "نعامة": 1000, "بشار": 1100, "تندوف": 1200, "تمنراست": 1200, "إليزي": 1200,
};

function shipCost(w: string, sub: number, pm: string): number {
    if (pm === "pickup") return 0;
    if (sub >= 50000) return 0;
    const c = SHIP[(w || "").trim()];
    return c !== undefined ? c : 700;
}

function isMulti(t: any[]): boolean { return Array.isArray(t) && t.length > 0 && Array.isArray((t[0] as any)?.tiers); }

function flatP(qty: number, tiers: any[], base: number): number {
    if (!tiers?.length) return base;
    const s = [...tiers].sort((a: any, b: any) => a.min_qty - b.min_qty);
    for (const t of s) { if (qty >= t.min_qty && (t.max_qty == null || qty <= t.max_qty)) return t.unit_price; }
    return (s[s.length - 1] as any)?.unit_price ?? base;
}

function multiP(qty: number, tiers: any[], sz: string | undefined, base: number): number {
    if (!tiers?.length) return base;
    const v = (tiers.find((x: any) => x.size === sz) || tiers[0]) as any;
    if (!v?.tiers?.length) return base;
    const s = [...v.tiers].sort((a: any, b: any) => a.qty - b.qty);
    let m = s[0] as any;
    for (const t of s) { if (qty >= (t as any).qty) m = t; }
    return m?.unit_price ?? base;
}

const CORS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function jsonResp(body: unknown, status = 200): Response {
    return new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });
}

module.exports = async (req: Request): Promise<Response> => {
    if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
    try {
        const secret = Deno.env.get("JWT_SECRET");
        const base = Deno.env.get("POSTGREST_BASE_URL") || "http://postgrest:3000";
        if (!secret) throw new Error("JWT_SECRET missing");
        const tok = await _jwt(secret);

        const go = async (path: string, method = "GET", body: unknown = null): Promise<any> => {
            const r = await fetch(`${base}/${path}`, {
                method, headers: { Authorization: `Bearer ${tok}`, "Content-Type": "application/json", Prefer: "return=representation" },
                body: body != null ? JSON.stringify(body) : null,
            });
            if (!r.ok) throw new Error(`DB ${r.status} [${path}]: ${await r.text()}`);
            return r.json();
        };

        const B: any = await req.json();
        const nm = B.customerName ?? B.guestInfo?.name;
        const ph = B.customerPhone ?? B.guestInfo?.phone;
        const em = B.customerEmail ?? B.guestInfo?.email ?? null;
        const wl = B.wilaya ?? B.guestInfo?.wilaya;
        const ad = B.address ?? B.guestInfo?.address;
        const items: any[] = B.items ?? [];

        if (!nm || !ph || !items.length) return jsonResp({ error: "Missing: name, phone, or items" }, 400);

        const pids = [...new Set<string>(items.map((i: any) => i.productId ?? i.id).filter(Boolean))];
        const pm: Record<string, any> = {};
        if (pids.length) (await go(`products?id=in.(${pids.join(",")})`)).forEach((p: any) => { pm[p.id] = p; });

        const id = crypto.randomUUID();
        const num = `ORD-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 1000)}`;
        let sub = 0, wg = 0;
        const lines: any[] = [];

        for (const item of items) {
            const pid: string = item.productId ?? item.id;
            const prod = pm[pid];
            const qty: number = item.quantity ?? 1;
            let price = 0, uw = 0;
            if (prod) {
                const t: any[] = prod.price_tiers ?? [];
                const sz: string | undefined = item.customization?.selected_size;
                price = isMulti(t) ? multiP(qty, t, sz, prod.base_price ?? 0) : t.length ? flatP(qty, t, prod.base_price ?? 0) : (prod.base_price ?? 0);
                const fv = (g: any, sel: string) => g.values?.find((v: any) => v.name_ar === sel || v.name_en === sel);
                if (item.customization) {
                    for (const o of (prod.production_options ?? [])) { const v = fv(o, item.customization[o.name_ar] ?? item.customization[o.name_en]); if (v) price += v.price_delta ?? 0; }
                    for (const g of (prod.attribute_groups ?? [])) { const v = fv(g, item.customization[g.name_ar] ?? item.customization[g.name_en]); if (v) { price += v.price_delta ?? 0; if (prod.has_weight) uw += v.weight_delta ?? 0; } }
                }
                if (prod.has_weight) uw = Math.max(uw, prod.weight_per_unit ?? 0);
            } else { price = item.unitPrice ?? item.price ?? 0; }
            const lt = price * qty, lw = uw * qty;
            sub += lt; wg += lw;
            lines.push({ order_id: id, product_id: pid ?? null, variant_id: item.variantId ?? null, name: item.name ?? "منتج", name_ar: item.nameAr ?? item.name, sku: item.sku ?? "N/A", unit_price: price, quantity: qty, total: lt, unit_weight: uw, total_weight: lw, customization: item.customization ? { ...item.customization, _sp: price } : null });
        }

        const sc = shipCost(wl, sub, B.paymentMethod ?? "cash_on_delivery");
        const tot = sub + sc;

        let cid: string;
        const cf = await go(`customers?phone=eq.${encodeURIComponent(ph)}&select=id`);
        if (cf.length) { cid = cf[0].id; }
        else { const cr = await go("customers", "POST", { name: nm, email: em, phone: ph, wilaya: wl, address: ad, is_guest: true }); cid = cr[0].id; }

        await go("orders", "POST", { id, order_number: num, customer_id: cid, guest_info: { name: nm, phone: ph, email: em, wilaya: wl, address: ad }, subtotal: sub, discount: 0, shipping: sc, tax: 0, total: tot, total_weight: wg, shipping_address: B.shippingAddress ?? { name: nm, phone: ph, wilaya: wl, address: ad }, payment_method: B.paymentMethod ?? "cash_on_delivery", notes: B.notes ?? null, internal_notes: B.internalNotes ?? null, source: B.source ?? (B.guestInfo ? "storefront" : "erp"), status: "pending", material_cost: 0, gross_margin: 0 });
        await go("order_items", "POST", lines);

        console.log(`[create-order] ✅ ${num} sub=${sub} ship=${sc} tot=${tot}`);
        return jsonResp({ success: true, data: { id, orderNumber: num, total: tot, shipping: sc, subtotal: sub, totalWeight: wg } }, 201);
    } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        console.error("[create-order]", msg);
        return jsonResp({ error: msg, code: "ORDER_CREATION_FAILED" }, 500);
    }
};
