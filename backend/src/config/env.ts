/**
 * Environment configuration loader
 * All config is read here once and exported as typed constants.
 * Never import process.env directly in other files — use this module.
 */
import dotenv from 'dotenv';
import path from 'path';

// Load .env file (only in non-production environments)
if (process.env.NODE_ENV !== 'production') {
    dotenv.config({ path: path.resolve(__dirname, '../../.env') });
}

function requireEnv(key: string): string {
    const value = process.env[key];
    if (!value) {
        throw new Error(`Missing required environment variable: ${key}`);
    }
    return value;
}

export const config = {
    // Server
    env: (process.env.NODE_ENV || 'development') as 'development' | 'production' | 'test',
    port: parseInt(process.env.PORT || '5000', 10),
    isDev: (process.env.NODE_ENV || 'development') === 'development',

    // Database
    databaseUrl: requireEnv('DATABASE_URL'),

    // JWT
    jwtSecret: requireEnv('JWT_SECRET'),
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',

    // CORS
    corsOrigins: (process.env.CORS_ORIGINS || 'http://localhost:5173,http://localhost:5174')
        .split(',')
        .map((s) => s.trim()),
};
