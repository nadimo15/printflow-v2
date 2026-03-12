// @ts-nocheck
// Script: Seed Admin User in InsForge with auto-confirm
import dotenv from 'dotenv';
dotenv.config();

import { insforge } from '../config/insforge';

async function seedAdmin() {
    const email = 'admin@printflow.dz';
    const password = 'admin123';
    const name = 'Admin';

    console.log('🔧 Creating admin user in InsForge...');

    // 1. Register user in InsForge Auth with auto-confirm
    const { data: authData, error: authError } = await insforge.auth.signUp({
        email,
        password,
        options: {
            data: { name, role: 'admin' },
            emailRedirectTo: undefined,
        }
    });

    if (authError) {
        console.error('❌ Auth Error:', authError.message);

        // If user already exists, try to login instead
        if (authError.message.includes('already') || authError.message.includes('exists')) {
            console.log('ℹ️  User may already exist. Trying login...');
            const { data: loginData, error: loginError } = await insforge.auth.signInWithPassword({ email, password });
            if (loginError) {
                console.error('❌ Login also failed:', loginError.message);
                console.log('');
                console.log('⚠️  The user exists but email verification may be required.');
                console.log('   Please check InsForge dashboard → Auth → Users');
                console.log('   And manually confirm the user email, or disable email confirmation in Auth settings.');
            } else {
                console.log('✅ Login successful! User ID:', loginData?.user?.id);
            }
        }
        return;
    }

    console.log('✅ Auth signup response:', JSON.stringify(authData, null, 2));

    const userId = authData?.user?.id;
    if (userId) {
        // 2. Create profile
        const { error: profileError } = await insforge.database
            .from('profiles')
            .upsert([{
                id: userId,
                name,
                email,
                role: 'admin',
                is_active: true,
            }]);

        if (profileError) {
            console.error('❌ Profile Error:', profileError.message);
        } else {
            console.log('✅ Profile created for admin');
        }
    }

    console.log('');
    console.log('🎉 Done!');
    console.log(`   Email:    ${email}`);
    console.log(`   Password: ${password}`);
    console.log('');
    console.log('⚠️  If login fails with "Email verification required":');
    console.log('   Go to InsForge Dashboard → Auth → Users → Find admin@printflow.dz');
    console.log('   And manually confirm the email OR disable email confirmation in Auth settings.');
}

seedAdmin();
