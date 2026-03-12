// record-payment.js (Deno Edge Function)
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
                "Prefer": method === 'PATCH' ? "return=representation" : "return=minimal"
            };
            const options = { method, headers, body: body ? JSON.stringify(body) : null };
            const res = await fetch(url, options);
            if (!res.ok) {
                const txt = await res.text();
                throw new Error(`DB Error ${res.status} on ${path}: ${txt}`);
            }
            return method === 'GET' || method === 'PATCH' ? await res.json() : { success: true };
        };

        const body = await req.json();
        const { customerId, amount, recordedBy } = body;

        if (!customerId || !amount) {
            return new Response(JSON.stringify({ error: "Missing required fields" }), { status: 400, headers: corsHeaders });
        }

        // 1. Fetch current customer
        const customers = await apiFetch(`customers?id=eq.${customerId}&select=outstanding_balance`);
        if (!customers || customers.length === 0) {
            throw new Error("Customer not found");
        }

        const customer = customers[0];
        const currentBalance = Number(customer.outstanding_balance) || 0;

        // Ensure we don't negative balance unless they pre-paid
        const newBalance = Math.max(0, currentBalance - Number(amount));

        // 2. Update Customer Balance
        await apiFetch(`customers?id=eq.${customerId}`, 'PATCH', { outstanding_balance: newBalance });

        // Future optimization: Log the tranasction to a `customer_ledger` table here.

        return new Response(JSON.stringify({ success: true, newBalance }), {
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
