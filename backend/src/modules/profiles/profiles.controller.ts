/**
 * Profiles module — Controller
 * Admin-only user management endpoints
 */
import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import * as profilesService from './profiles.service';

const createUserSchema = z.object({
    email: z.string().email(),
    password: z.string().min(6),
    name: z.string().min(1),
    role: z.enum(['admin', 'manager', 'worker', 'designer']),
    phone: z.string().optional(),
});

const updateUserSchema = z.object({
    name: z.string().min(1).optional(),
    role: z.enum(['admin', 'manager', 'worker', 'designer']).optional(),
    phone: z.string().nullable().optional(),
    isActive: z.boolean().optional(),
    email: z.string().email().optional(),
    password: z.string().min(6).optional(),
});

export async function list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const profiles = await profilesService.listProfiles();
        res.json({ success: true, data: profiles });
    } catch (err) { next(err); }
}

export async function getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const profile = await profilesService.getProfileById(req.params.id as string);
        res.json({ success: true, data: profile });
    } catch (err) { next(err); }
}

export async function create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const parsed = createUserSchema.safeParse(req.body);
        if (!parsed.success) {
            res.status(400).json({ success: false, error: { message: parsed.error.errors[0].message } });
            return;
        }
        const profile = await profilesService.adminCreateUser(parsed.data as any);
        res.status(201).json({ success: true, data: profile });
    } catch (err) { next(err); }
}

export async function update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const parsed = updateUserSchema.safeParse(req.body);
        if (!parsed.success) {
            res.status(400).json({ success: false, error: { message: parsed.error.errors[0].message } });
            return;
        }
        const profile = await profilesService.adminUpdateUser(req.params.id as string, parsed.data);
        res.json({ success: true, data: profile });
    } catch (err) { next(err); }
}

export async function deactivate(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const profile = await profilesService.deactivateUser(req.params.id as string);
        res.json({ success: true, data: profile });
    } catch (err) { next(err); }
}

export async function reactivate(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const profile = await profilesService.reactivateUser(req.params.id as string);
        res.json({ success: true, data: profile });
    } catch (err) { next(err); }
}
