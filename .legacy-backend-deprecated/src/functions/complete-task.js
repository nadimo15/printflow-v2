// complete-task.js (Deno Edge Function)
const encoder = new TextEncoder();

async function signJwt(payload, secret) {
    const header = { alg: "HS256", typ: "JWT" };
    const now = Math.floor(Date.now() / 1000);
    const jwtPayload = {
        role: "postgres",
        iss: "supabase",
        iat: now,
        exp: now + 3600 * 24 * 365,
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
    return `${encodedHeader}.${encodedPayload}.${b64url(signature)}`;
}

function b64url(input) {
    let base64 = typeof input === "string" ? btoa(input) : btoa(String.fromCharCode(...new Uint8Array(input)));
    return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
};

module.exports = async (req) => {
    if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

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
        console.log("Complete Task Payload:", JSON.stringify(body));

        const { taskId, orderId, workerId, consumption } = body;
        if (!taskId || !orderId || !consumption) {
            return new Response(JSON.stringify({ error: "Missing highly required strict-mode fields" }), { status: 400, headers: corsHeaders });
        }

        const blanksTotal = (consumption.blanksUsed || 0) + (consumption.blanksWasted || 0);
        const blanksWasted = consumption.blanksWasted || 0;
        const reworkReason = consumption.reworkReason || 'Unspecified';
        const inkGrams = consumption.inkUsedGrams || 0;

        let totalActionCost = 0;

        // 1. Fetch Inventory Assets
        const inkItems = await apiFetch(`inventory_items?type=eq.ink&order=cost_per_unit.asc&limit=1`);
        const blankItems = await apiFetch(`inventory_items?type=eq.blank&order=cost_per_unit.asc&limit=1`);

        // Use generic placeholders if specific SKU isn't passed (for V1 of strict mode)
        const primaryInk = inkItems[0];
        const primaryBlank = blankItems[0];

        // 2. Perform Deductions & Costing
        if (blanksTotal > 0 && primaryBlank) {
            const newStock = Math.max(0, primaryBlank.stock_quantity - blanksTotal);
            await apiFetch(`inventory_items?id=eq.${primaryBlank.id}`, 'PATCH', { stock_quantity: newStock });

            // Log Transaction
            await apiFetch('inventory_transactions', 'POST', {
                item_id: primaryBlank.id,
                transaction_type: 'out',
                quantity: blanksTotal,
                reference_id: orderId,
                notes: `Task ${taskId} completed by ${workerId}. Wasted: ${blanksWasted}`
            });

            // Log to Quality Control table if waste occurred
            if (blanksWasted > 0) {
                await apiFetch('rework_logs', 'POST', {
                    task_id: taskId,
                    order_id: orderId,
                    worker_id: workerId,
                    reason: reworkReason,
                    quantity_ruined: blanksWasted,
                    estimated_cost_loss: (blanksWasted * primaryBlank.cost_per_unit)
                });
            }

            totalActionCost += (blanksTotal * primaryBlank.cost_per_unit);
        }

        if (inkGrams > 0 && primaryInk) {
            const newStock = Math.max(0, primaryInk.stock_quantity - inkGrams);
            await apiFetch(`inventory_items?id=eq.${primaryInk.id}`, 'PATCH', { stock_quantity: newStock });

            // Log Transaction (Ink is in grams)
            await apiFetch('inventory_transactions', 'POST', {
                item_id: primaryInk.id,
                transaction_type: 'out',
                quantity: inkGrams,
                reference_id: orderId,
                notes: `Task ${taskId} completed (Ink used)`
            });

            totalActionCost += (inkGrams * primaryInk.cost_per_unit);
        }

        // 3. Mark Task as Completed
        await apiFetch(`tasks?id=eq.${taskId}`, 'PATCH', { status: 'completed' });

        // 4. Update parent Order COGS and Gross Margin
        const orders = await apiFetch(`orders?id=eq.${orderId}&select=total,material_cost,gross_margin`);
        if (orders.length > 0) {
            const order = orders[0];
            const newMaterialCost = (Number(order.material_cost) || 0) + totalActionCost;
            const newGrossMargin = Number(order.total) - newMaterialCost;

            await apiFetch(`orders?id=eq.${orderId}`, 'PATCH', {
                material_cost: newMaterialCost,
                gross_margin: newGrossMargin
            });
        }

        return new Response(JSON.stringify({ success: true, newMaterialCostAdded: totalActionCost }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200
        });

    } catch (e) {
        return new Response(JSON.stringify({ success: false, error: { message: e.message } }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 500
        });
    }
};
