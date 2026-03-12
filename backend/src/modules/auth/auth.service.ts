/**
 * Auth module — Service layer
 * Handles login, registration, and token generation.
 * Replaces: client.auth.signInWithPassword(), client.auth.signUp()
 */
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../../prisma/client';
import { config } from '../../config/env';
import { AppError } from '../../middleware/errorHandler';

export async function loginUser(email: string, password: string) {
    // Find user by email
    const profile = await prisma.profile.findUnique({ where: { email: email.toLowerCase() } });
    if (!profile) {
        throw new AppError('Invalid email or password.', 401);
    }
    if (!profile.isActive) {
        throw new AppError('Account is deactivated. Contact an administrator.', 403);
    }

    // Verify password
    const isValid = await bcrypt.compare(password, profile.password);
    if (!isValid) {
        throw new AppError('Invalid email or password.', 401);
    }

    // Generate JWT
    const token = jwt.sign(
        { id: profile.id, email: profile.email, role: profile.role },
        config.jwtSecret,
        { expiresIn: config.jwtExpiresIn as any }
    );

    // Return user without password
    const { password: _pw, ...userWithoutPassword } = profile;
    return { token, user: userWithoutPassword };
}

export async function registerUser(data: {
    email: string;
    password: string;
    name: string;
    role?: string;
    phone?: string;
}) {
    const existing = await prisma.profile.findUnique({
        where: { email: data.email.toLowerCase() },
    });
    if (existing) {
        throw new AppError('An account with this email already exists.', 409);
    }

    const hashedPassword = await bcrypt.hash(data.password, 12);
    const profile = await prisma.profile.create({
        data: {
            email: data.email.toLowerCase(),
            password: hashedPassword,
            name: data.name,
            role: data.role || 'worker',
            phone: data.phone || null,
        },
    });

    const { password: _pw, ...userWithoutPassword } = profile;
    return userWithoutPassword;
}

export async function getMe(userId: string) {
    const profile = await prisma.profile.findUnique({ where: { id: userId } });
    if (!profile) throw new AppError('User not found.', 404);
    const { password: _pw, ...userWithoutPassword } = profile;
    return userWithoutPassword;
}
