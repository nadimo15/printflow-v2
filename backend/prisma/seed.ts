/**
 * Prisma seed script
 * Creates default admin user and default site config row.
 * Run with: npm run prisma:seed
 */
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Seeding database...');

    // ─── Default Admin User ────────────────────────────────────────────────────
    const adminEmail = 'admin@printflow.local';
    const existing = await prisma.profile.findUnique({ where: { email: adminEmail } });

    if (!existing) {
        const hashedPassword = await bcrypt.hash('printflow2025', 12);
        const admin = await prisma.profile.create({
            data: {
                email: adminEmail,
                password: hashedPassword,
                name: 'Admin',
                role: 'admin',
                isActive: true,
            },
        });
        console.log(`✅ Admin user created: ${admin.email}`);
        console.log(`   Password: printflow2025 (CHANGE THIS IN PRODUCTION)`);
    } else {
        console.log(`ℹ️  Admin user already exists: ${adminEmail}`);
    }

    // ─── Default Role Permissions ───────────────────────────────────────────────
    const roles = ['admin', 'manager', 'worker', 'designer'];
    for (const role of roles) {
        await prisma.rolePermission.upsert({
            where: { role },
            update: {},
            create: {
                role,
                permissions: {
                    canViewOrders: true,
                    canCreateOrders: ['admin', 'manager'].includes(role),
                    canConfirmOrders: ['admin', 'manager'].includes(role),
                    canManageInventory: ['admin', 'manager'].includes(role),
                    canManageUsers: role === 'admin',
                    canManageProducts: ['admin', 'manager'].includes(role),
                    canViewDashboard: ['admin', 'manager'].includes(role),
                },
            },
        });
    }
    console.log('✅ Default role permissions seeded');

    // ─── Default Site Config ────────────────────────────────────────────────────
    await prisma.siteConfig.upsert({
        where: { id: 'default' },
        update: {},
        create: {
            id: 'default',
            draftData: {
                siteName: 'PrintFlow Store',
                primaryColor: '#1a1a2e',
                logo: null,
            },
            publishedData: {
                siteName: 'PrintFlow Store',
                primaryColor: '#1a1a2e',
                logo: null,
            },
        },
    });
    console.log('✅ Default site config seeded');

    console.log('\n🎉 Seeding complete!');
}

main()
    .catch((e) => {
        console.error('❌ Seed failed:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
