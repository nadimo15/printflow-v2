
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
        // Create client with the user's auth context (RLS will apply, but for dashboard stats we might need admin view)
        // Actually, 'admin-create-user' pattern (checking role then using service role) is safer if we want full stats 
        // regardless of RLS policies (e.g. if we want admins to see everyone's stats but RLS restricts 'tasks').
        // Let's use service role after verifying admin/manager status.

        const supabaseClient = createClient(
            Deno.env.get("INSFORGE_URL") ?? "",
            Deno.env.get("INSFORGE_ANON_KEY") ?? "",
            { global: { headers: { Authorization: req.headers.get("Authorization")! } } }
        );

        const { data: { user } } = await supabaseClient.auth.getUser();
        if (!user) return new Response("Unauthorized", { status: 401 });

        // Check role
        const { data: profile } = await supabaseClient
            .from("profiles")
            .select("role")
            .eq("id", user.id)
            .single();

        if (!profile || !['admin', 'manager'].includes(profile.role)) {
            // Regular workers might not need this full overview, or they see limited stats.
            // backend/routes/employees.ts didn't seem to restrict this endpoint? 
            // But assuming it's for the dashboard "Team" section or similar.
            // Let's allow it for now but maybe filter? The previous implementation returned ALL employees.
            // Let's stick to admin/manager for full stats.
            return new Response("Forbidden", { status: 403 });
        }

        const supabaseAdmin = createClient(
            Deno.env.get("INSFORGE_URL") ?? "",
            Deno.env.get("INSFORGE_SERVICE_ROLE_KEY") ?? ""
        );

        // Get all active profiles
        const { data: employees, error: empError } = await supabaseAdmin
            .from('profiles')
            .select('id, name, role')
            .eq('is_active', true);

        if (empError) throw empError;

        // Get all tasks (lightweight select)
        const { data: tasks, error: taskError } = await supabaseAdmin
            .from('tasks')
            .select('assigned_to_id, status');

        if (taskError) throw taskError;

        const stats = (employees || []).map((emp: any) => {
            const empTasks = (tasks || []).filter((t: any) => t.assigned_to_id === emp.id);
            return {
                id: emp.id,
                name: emp.name,
                role: emp.role,
                totalTasks: empTasks.length,
                completedTasks: empTasks.filter((t: any) => t.status === 'completed').length,
                inProgressTasks: empTasks.filter((t: any) => t.status === 'in_progress').length,
                pendingTasks: empTasks.filter((t: any) => t.status === 'pending').length,
            };
        });

        return new Response(JSON.stringify({ success: true, data: stats }), {
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
