/**
 * Prisma client singleton
 * Import this instead of creating new PrismaClient instances.
 */
import { PrismaClient } from '@prisma/client';
import { config } from '../config/env';

const globalForPrisma = globalThis as unknown as {
    prisma: PrismaClient | undefined;
};

export const prisma =
    globalForPrisma.prisma ??
    new PrismaClient({
        log: config.isDev ? ['query', 'error', 'warn'] : ['error'],
    });

if (config.isDev) {
    globalForPrisma.prisma = prisma;
}

export default prisma;
