
// Web Crypto API is global
const encoder = new TextEncoder();

async function signJwt(payload, secret) {
    const header = { alg: "HS256", typ: "JWT" };
    const now = Math.floor(Date.now() / 1000);
    const jwtPayload = {
        role: "postgres", // SUPERUSER role to bypass RLS
        iss: "supabase",
        iat: now,
        exp: now + 60, // 1 minute is enough
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

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, GET, OPTIONS"
};

const supabaseUrl = process.env.INSFORGE_API_URL || process.env.Supabase_Url || process.env.SUPABASE_URL;
const supabaseKey = process.env.INSFORGE_API_KEY || process.env.Supabase_Service_Role_Key || process.env.SUPABASE_SERVICE_ROLE_KEY;

module.exports = async (req) => {
    // Handle CORS preflight requests
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const { orderNumber } = await req.json();

        if (!orderNumber) {
            return new Response(JSON.stringify({ error: 'Order number is required' }), {
                status: 400,
                headers: { ...corsHeaders, "Content-Type": "application/json" }
            });
        }

        const secret = process.env.JWT_SECRET;
        const baseUrl = process.env.POSTGREST_BASE_URL || "http://postgrest:3000"; // Fallback based on diagnostics

        if (!secret) throw new Error("Missing JWT_SECRET");

        // Generate JWT with postgres role
        const token = await signJwt({}, secret);

        // Direct fetch to PostgREST (Internal)
        // Path is /orders (no /rest/v1)
        const response = await fetch(`${baseUrl}/orders?order_number=eq.${orderNumber}&select=*,order_items(*)`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
                // 'apikey': supabaseKey // Internal PostgREST doesn't need apikey, just JWT
            }
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('DB Error:', errorText);
            throw new Error(`DB Error ${response.status}: ${errorText}`);
        }

        const data = await response.json();
        const order = data[0]; // .single() equivalent

        if (!order) {
            return new Response(JSON.stringify({ error: 'Order not found' }), {
                status: 404,
                headers: { ...corsHeaders, "Content-Type": "application/json" }
            });
        }

        return new Response(JSON.stringify(order), {
            headers: { ...corsHeaders, "Content-Type": "application/json" }
        });

    } catch (error) {
        console.error('Track Order Error:', error);
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
    }
};
