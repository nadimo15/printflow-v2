
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

        const { userId, email, password } = await req.json();

        if (!userId) {
            return new Response("Missing userId", { status: 400 });
        }

        // Use Service Role to update user
        const supabaseAdmin = createClient(
            Deno.env.get("INSFORGE_URL") ?? "",
            Deno.env.get("INSFORGE_SERVICE_ROLE_KEY") ?? ""
        );

        const attributes: any = {};
        if (email) attributes.email = email;
        if (password) attributes.password = password;

        const { data, error } = await supabaseAdmin.auth.admin.updateUserById(
            userId,
            attributes
        );

        if (error) throw error;

        // If email updated, sync to profile
        if (email) {
            await supabaseAdmin.from('profiles').update({ email }).eq('id', userId);
        }

        return new Response(JSON.stringify({ success: true, user: data.user }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200,
        });
    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 400,
        });
    }
});
