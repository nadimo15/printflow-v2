/**
 * Profiles module — Service layer
 * Replaces:
 *  - client.database.rpc('admin_create_user_rpc', ...)
 *  - client.database.rpc('admin_update_user_rpc', ...)
 *  - client.database.from('profiles').select('*') (list / getById)
 */
import bcrypt from 'bcryptjs';
import prisma from '../../prisma/client';
import { AppError } from '../../middleware/errorHandler';

function omitPassword<T extends { password: string }>(profile: T) {
    const { password: _pw, ...rest } = profile;
    return rest;
}

export async function listProfiles() {
    const profiles = await prisma.profile.findMany({
        orderBy: { createdAt: 'desc' },
    });
    return profiles.map(omitPassword);
}

export async function getProfileById(id: string) {
    const profile = await prisma.profile.findUnique({ where: { id } });
    if (!profile) throw new AppError('Profile not found.', 404);
    return omitPassword(profile);
}

/**
 * admin_create_user_rpc equivalent:
 * Admin creates a new user with a temporary password.
 */
export async function adminCreateUser(data: {
    email: string;
    password: string;
    name: string;
    role: string;
    phone?: string;
}) {
    const existing = await prisma.profile.findUnique({
        where: { email: data.email.toLowerCase() },
    });
    if (existing) throw new AppError('A user with this email already exists.', 409);

    const hashedPassword = await bcrypt.hash(data.password, 12);
    const profile = await prisma.profile.create({
        data: {
            email: data.email.toLowerCase(),
            password: hashedPassword,
            name: data.name,
            role: data.role,
            phone: data.phone || null,
            isActive: true,
        },
    });
    return omitPassword(profile);
}

/**
 * admin_update_user_rpc equivalent:
 * Admin can update name, role, phone, is_active, email, or password.
 */
export async function adminUpdateUser(
    id: string,
    data: Partial<{
        name: string;
        role: string;
        phone: string | null;
        isActive: boolean;
        email: string;
        password: string;
    }>
) {
    const updateData: any = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.role !== undefined) updateData.role = data.role;
    if (data.phone !== undefined) updateData.phone = data.phone;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;
    if (data.email !== undefined) updateData.email = data.email.toLowerCase();
    if (data.password !== undefined) updateData.password = await bcrypt.hash(data.password, 12);

    const profile = await prisma.profile.update({ where: { id }, data: updateData });
    return omitPassword(profile);
}

/**
 * Soft-delete: deactivate a user (preserves audit trail).
 */
export async function deactivateUser(id: string) {
    const profile = await prisma.profile.update({
        where: { id },
        data: { isActive: false },
    });
    return omitPassword(profile);
}

export async function reactivateUser(id: string) {
    const profile = await prisma.profile.update({
        where: { id },
        data: { isActive: true },
    });
    return omitPassword(profile);
}
