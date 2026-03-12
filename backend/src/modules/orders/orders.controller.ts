/**
 * Orders module — Controller
 */
import { Request, Response, NextFunction } from 'express';
import * as ordersService from './orders.service';

export async function list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const data = await ordersService.listOrders({ status: req.query.status as string });
        res.json({ success: true, data });
    } catch (err) { next(err); }
}

export async function listProductionEligible(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const data = await ordersService.listProductionEligible();
        res.json({ success: true, data });
    } catch (err) { next(err); }
}

export async function getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const data = await ordersService.getOrderById(req.params.id);
        res.json({ success: true, data });
    } catch (err) { next(err); }
}

export async function track(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const data = await ordersService.getOrderByNumber(req.params.orderNumber);
        res.json({ success: true, data });
    } catch (err) { next(err); }
}

export async function create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const data = await ordersService.createOrder(req.body);
        res.status(201).json({ success: true, data });
    } catch (err) { next(err); }
}

export async function updateStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const data = await ordersService.updateOrderStatus(req.params.id, req.body.status);
        res.json({ success: true, data });
    } catch (err) { next(err); }
}

export async function updateFields(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const data = await ordersService.updateOrderFields(req.params.id, req.body);
        res.json({ success: true, data });
    } catch (err) { next(err); }
}

export async function softDelete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const data = await ordersService.softDeleteOrder(req.params.id);
        res.json({ success: true, data });
    } catch (err) { next(err); }
}

export async function replaceItems(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const data = await ordersService.replaceOrderItems(req.params.id, req.body.items || []);
        res.json({ success: true, data });
    } catch (err) { next(err); }
}
