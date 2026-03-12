import { insforge } from '../config/insforge';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../../.env') });

async function checkUser() {
    console.log('🔍 Checking user role...');
    const { data: user, error } = await insforge.database
        .from('profiles')
        .select('*')
        .eq('email', 'worker@test.com')
        .single();

    if (error) {
        console.error('❌ Error:', error);
    } else {
        console.log('👤 User found:', JSON.stringify(user, null, 2));
    }
}

checkUser().catch(console.error);
