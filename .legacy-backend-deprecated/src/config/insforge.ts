import { createClient } from '@insforge/sdk';
import dotenv from 'dotenv';

dotenv.config();

const API_KEY = process.env.INSFORGE_API_KEY;
const API_BASE_URL = process.env.INSFORGE_API_URL;

if (!API_KEY || !API_BASE_URL) {
    console.warn('⚠️ InsForge credentials not found in environment variables. InsForge features will be disabled.');
}

export const insforge = createClient({
    baseUrl: API_BASE_URL || '',
    anonKey: API_KEY || '',
});

console.log('✅ InsForge Client Initialized');
