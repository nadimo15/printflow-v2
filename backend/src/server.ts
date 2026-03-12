/**
 * Server entry point
 * Starts the HTTP server and connects to the database.
 */
import app from './app';
import { config } from './config/env';
import prisma from './prisma/client';

async function main() {
    // Test database connection
    try {
        await prisma.$connect();
        console.log('✅ Database connected successfully');
    } catch (err) {
        console.error('❌ Failed to connect to database:', err);
        process.exit(1);
    }

    // Start HTTP server
    const server = app.listen(config.port, () => {
        console.log(`\n🚀 PrintFlow Backend running`);
        console.log(`   Port:    ${config.port}`);
        console.log(`   Mode:    ${config.env}`);
        console.log(`   Health:  http://localhost:${config.port}/health`);
        console.log(`   API:     http://localhost:${config.port}/api\n`);
    });

    // Graceful shutdown
    const shutdown = async (signal: string) => {
        console.log(`\n${signal} received. Shutting down gracefully...`);
        server.close(async () => {
            await prisma.$disconnect();
            console.log('🛑 Server closed. Database disconnected.');
            process.exit(0);
        });
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
}

main().catch((err) => {
    console.error('Fatal startup error:', err);
    process.exit(1);
});
