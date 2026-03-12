import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.VITE_INSFORGE_API_URL,
    process.env.VITE_INSFORGE_API_KEY
);

async function testRPC() {
    console.log("Testing RPC...");
    const { data, error } = await supabase.rpc('admin_update_user_rpc', {
        target_user_id: '5730d7df-6b94-45ed-ad52-e4d287f093e3',
        new_is_active: false
    });

    if (error) {
        console.dir(error, { depth: null });
    } else {
        console.log("RPC Success:", data);
    }
}

testRPC();
