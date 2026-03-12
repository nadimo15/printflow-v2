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

console.log('Connecting to:', API_URL);

const client = createClient({
    baseUrl: API_URL || '',
    anonKey: API_KEY || ''
});

async function runTests() {
    console.log('Starting Test A: Create remote users via SDK / RPC');

    const testUsers = [
        { email: `test.supervisor_${Date.now()}@test.com`, name: 'Test Supervisor', role: 'supervisor', phone: '1111' },
        { email: `test.designer_${Date.now()}@test.com`, name: 'Test Designer', role: 'designer', phone: '2222' },
        { email: `test.worker_${Date.now()}@test.com`, name: 'Test Worker', role: 'worker', phone: '3333' }
    ];

    for (const user of testUsers) {
        console.log(`\nAttempting to create: ${user.name} (${user.role})`);
        try {
            // THIS IS THE EXACT CALL MADE BY THE FRONTEND
            const { data, error } = await client.database.rpc('admin_create_user_rpc', {
                user_email: user.email,
                user_password: 'Password123!',
                user_name: user.name,
                user_role: user.role,
                user_phone: user.phone
            });

            if (error) {
                console.error(`❌ Failed to create ${user.role}:`, error.message);
            } else {
                console.log(`✅ Successfully created ${user.role}:`, data);
            }
        } catch (err) {
            console.error(`💥 Exception creating ${user.role}:`, err);
        }
    }

    // Verify they appear in profiles
    console.log('\n--- Requesting Latest Profiles List ---');
    const { data: profiles, error: pErr } = await client.database.from('profiles').select('*').order('created_at', { ascending: false }).limit(5);

    if (pErr) {
        console.error('Failed to fetch team list:', pErr);
    } else {
        console.table(profiles.map(p => ({ Name: p.name, Email: p.email, Role: p.role })));
    }
}

runTests();
