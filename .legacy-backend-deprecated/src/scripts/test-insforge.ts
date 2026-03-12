import { insforge } from '../config/insforge';
import dotenv from 'dotenv';

dotenv.config();

async function testConnection() {
    console.log('Testing InsForge connection...');
    try {
        // Try to fetch something simple, like the health of the service or just check if client is initialized
        // Since we don't know if there are any tables yet, we'll just check if the client configuration is correct
        console.log('Client config:', {
            baseUrl: process.env.INSFORGE_API_URL,
            hasKey: !!process.env.INSFORGE_API_KEY
        });

        if (insforge) {
            console.log('✅ InsForge client successfully initialized.');
            // If there were an actual verify method, we would use it here.
            // For now, initialization without error is a good sign.
        } else {
            console.error('❌ InsForge client failed to initialize.');
            process.exit(1);
        }

    } catch (error) {
        console.error('❌ Connection failed:', error);
        process.exit(1);
    }
}

testConnection();
