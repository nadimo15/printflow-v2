// complete-task.js — BOM-Aware Inventory Deduction v3.1 (Deno-compatible)
const encoder = new TextEncoder();

async function signJwt(payload: any, secret: string): Promise<string> {
    const header = { alg: "HS256", typ: "JWT" };
    const now = Math.floor(Date.now() / 1000);
    const jwtPayload = { role: "postgres", iss: "supabase", iat: now, exp: now + 3600 * 24 * 365, ...payload };
    const encodedHeader = b64url(JSON.stringify(header));
    const encodedPayload = b64url(JSON.stringify(jwtPayload));
    const data = encoder.encode(`${encodedHeader}.${encodedPayload}`);
    const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
    const signature = await crypto.subtle.sign("HMAC", key, data);
    return `${encodedHeader}.${encodedPayload}.${b64url(signature)}`;
}

function b64url(input: string | ArrayBuffer): string {
    const base64 = typeof input === "string"
        ? btoa(input)
        : btoa(String.fromCharCode(...new Uint8Array(input as ArrayBuffer)));
    return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

const corsHeaders: Record<string, string> = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
};

module.exports = async (req: Request) => {
    if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

    try {
        const secret = Deno.env.get("JWT_SECRET") as string;
        const baseUrl = Deno.env.get("POSTGREST_BASE_URL") || "http://postgrest:3000";
        if (!secret) throw new Error("Missing JWT_SECRET");

        const token = await signJwt({}, secret);

        const apiFetch = async (path: string, method = "GET", body: any = null): Promise<any> => {
            const url = `${baseUrl}/${path}`;
            const headers: Record<string, string> = {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json",
                "Prefer": "return=representation",
            };
            const opts: RequestInit = { method, headers };
            if (body !== null) opts.body = JSON.stringify(body);
            const res = await fetch(url, opts);
            if (!res.ok) {
                const txt = await res.text();
                throw new Error(`DB ${res.status} on ${path}: ${txt}`);
            }
            return await res.json();
        };

        const bodyData: any = await req.json();
        console.log("[complete-task v3.1] Payload:", JSON.stringify(bodyData));

        const { taskId, orderId, workerId } = bodyData;
        if (!taskId || !orderId) {
            return new Response(JSON.stringify({ error: "Missing taskId or orderId" }), { status: 400, headers: corsHeaders });
        }

        // STEP 1: Fetch order_items for this order
        const orderItems: any[] = await apiFetch(`order_items?order_id=eq.${orderId}&select=id,product_id,selected_size,quantity`);
        let totalActionCost = 0;

        for (const item of orderItems) {
            const productId: string = item.product_id;
            const variantSize: string | null = item.selected_size || null;
            const qty = Number(item.quantity) || 0;
            if (qty === 0 || !productId) continue;

            // STEP 2: Fetch BOM for this product+variant_size
            let bomRows: any[] = [];
            if (variantSize) {
                bomRows = await apiFetch(`product_bom?product_id=eq.${productId}&variant_size=eq.${encodeURIComponent(variantSize)}&select=*`);
            }
            if (!bomRows.length) {
                // Fallback without variant filter
                bomRows = await apiFetch(`product_bom?product_id=eq.${productId}&select=*`);
            }
            console.log(`[complete-task] BOM rows for ${productId}/${variantSize}: ${bomRows.length}`);

            // STEP 3: Deduct each BOM material
            for (const bom of bomRows) {
                const qtyToDeduct = Number(bom.qty_per_piece) * qty;
                if (qtyToDeduct <= 0) continue;

                const invRes: any[] = await apiFetch(`inventory_items?id=eq.${bom.inventory_item_id}&select=id,name,stock_quantity,cost_per_unit`);
                if (!invRes.length) {
                    console.warn(`[complete-task] Inventory item ${bom.inventory_item_id} not found`);
                    continue;
                }
                const inv = invRes[0];
                const newStock = Math.max(0, Number(inv.stock_quantity) - qtyToDeduct);

                await apiFetch(`inventory_items?id=eq.${inv.id}`, "PATCH", { stock_quantity: newStock });
                await apiFetch("inventory_transactions", "POST", {
                    item_id: inv.id,
                    transaction_type: "out",
                    quantity: qtyToDeduct,
                    reference_id: orderId,
                    notes: `Task ${taskId} — ${inv.name} × ${qtyToDeduct} ${bom.unit} (${qty} pcs × ${bom.qty_per_piece})`
                });

                const itemCost = qtyToDeduct * Number(inv.cost_per_unit);
                totalActionCost += itemCost;
                console.log(`[complete-task] Deducted ${qtyToDeduct} of ${inv.name}. Cost: ${itemCost}`);
            }
        }

        // STEP 4: Mark task completed
        await apiFetch(`tasks?id=eq.${taskId}`, "PATCH", { status: "completed" });

        // STEP 5: Update order material_cost + gross_margin
        const orders: any[] = await apiFetch(`orders?id=eq.${orderId}&select=total,material_cost,gross_margin`);
        if (orders.length > 0) {
            const order = orders[0];
            const newMaterialCost = (Number(order.material_cost) || 0) + totalActionCost;
            const newGrossMargin = Number(order.total) - newMaterialCost;
            await apiFetch(`orders?id=eq.${orderId}`, "PATCH", { material_cost: newMaterialCost, gross_margin: newGrossMargin });
            console.log(`[complete-task] Order updated: material_cost=${newMaterialCost}, margin=${newGrossMargin}`);
        }

        return new Response(
            JSON.stringify({ success: true, bomDeductionCost: totalActionCost, message: `BOM deduction OK. Cost: ${totalActionCost.toFixed(2)} DZD` }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
        );

    } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error("[complete-task] Error:", msg);
        return new Response(
            JSON.stringify({ success: false, error: { message: msg } }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
        );
    }
};
