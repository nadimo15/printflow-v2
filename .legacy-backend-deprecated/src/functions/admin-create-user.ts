
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        const supabaseClient = createClient(
            Deno.env.get("INSFORGE_URL") ?? "",
            Deno.env.get("INSFORGE_ANON_KEY") ?? "",
            { global: { headers: { Authorization: req.headers.get("Authorization")! } } }
        );

        const {
            data: { user },
        } = await supabaseClient.auth.getUser();

        if (!user) {
            return new Response("Unauthorized", { status: 401 });
        }

        // Check if user is admin
        const { data: profile } = await supabaseClient
            .from("profiles")
            .select("role")
            .eq("id", user.id)
            .single();

        if (!profile || profile.role !== "admin") {
            return new Response("Forbidden: Admin access required", { status: 403 });
        }

        const { email, password, name, role, phone } = await req.json();

        if (!email || !password || !name) {
            return new Response("Missing required fields", { status: 400 });
        }

        // Use Service Role to create user
        const supabaseAdmin = createClient(
            Deno.env.get("INSFORGE_URL") ?? "",
            Deno.env.get("INSFORGE_SERVICE_ROLE_KEY") ?? ""
        );

        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
            user_metadata: { name },
        });

        if (authError) throw authError;

        if (!authData.user) throw new Error("Failed to create user");

        // Create profile
        const { data: profileData, error: profileError } = await supabaseAdmin
            .from("profiles")
            .insert([
                {
                    id: authData.user.id,
                    name,
                    email,
                    role: role || "worker",
                    phone: phone || null,
                    is_active: true,
                },
            ])
            .select()
            .single();

        if (profileError) throw profileError;

        return new Response(JSON.stringify({ success: true, data: profileData }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 201,
        });
    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 400,
        });
    }
});
