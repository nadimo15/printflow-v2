const API_URL = "https://bp44w5kz.eu-central.insforge.app/rest/v1/";
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(API_URL.replace('/rest/v1/', ''), "ik_afdae9ce09aced9a8773a151bbfbab30");

async function test() {
    // Login as admin
    const { data: auth, error: authErr } = await supabase.auth.signInWithPassword({
        email: 'admin@printflow.dz',
        password: 'password123'
    });

    if (authErr) {
        console.log("LOGIN ERR:", authErr);
        return;
    }

    // Fetch orders exactly as the frontend does
    const { data, error } = await supabase.from('orders')
        .select('*, customers(*), order_items(*), tasks(*, profiles(name))', { count: 'exact' })
        .order('created_at', { ascending: false });

    console.log("ERR:", error);
    console.log("DATA LENGTH:", data?.length);
    if (data?.length === 0) console.log("DATA IS EMPTY!");
}

test();
