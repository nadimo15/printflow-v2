import { createClient } from '@insforge/sdk';
import fs from 'fs';
import path from 'path';

// Load env vars manually
const envPath = path.resolve(process.cwd(), '.env');
const envFile = fs.readFileSync(envPath, 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
    const [key, val] = line.split('=');
    if (key && val) env[key.trim()] = val.trim();
});

const API_KEY = env.VITE_INSFORGE_API_KEY;
const API_URL = env.VITE_INSFORGE_API_URL;

const client = createClient({
    baseUrl: API_URL || '',
    anonKey: API_KEY || ''
});

async function runTests() {
    console.log('--- Testing Orders List API ---');
    let queryOrders = client.database.from('orders')
        .select('*, customers(*), order_items(*), tasks(*, profiles!tasks_assigned_to_id_fkey(*))', { count: 'exact' });
    const { data: oData, error: oErr } = await queryOrders.limit(1);
    if (oErr) {
        console.error('❌ Orders fetch failed:', oErr.message);
    } else {
        console.log('✅ Orders fetch success. Count:', oData?.length);
    }

    console.log('\n--- Testing Tasks List API ---');
    const { data: tData, error: tErr } = await client.database.from('tasks')
        .select('*, profiles!tasks_assigned_to_id_fkey(*), orders(id, order_number, status), order_items(*)').limit(1);
    if (tErr) {
        console.error('❌ Tasks fetch failed:', tErr.message);
    } else {
        console.log('✅ Tasks fetch success. Count:', tData?.length);
    }

    console.log('\n--- Testing Expenses API ---');
    const { data: eData, error: eErr } = await client.database.from('expenses').select('*').limit(1);
    if (eErr) {
        console.error('❌ Expenses fetch failed:', eErr.message);
    } else {
        console.log('✅ Expenses fetch success.');
    }
}

runTests();
