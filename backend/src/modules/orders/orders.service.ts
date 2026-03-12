/**
 * Orders module — Service layer
 * Replaces: client.database.from('orders').*
 * Also replaces: create-order edge function (from frontend-erp perspective)
 */
import prisma from '../../prisma/client';
import { AppError } from '../../middleware/errorHandler';
import { v4 as uuid } from 'uuid';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function generateOrderNumber(): string {
    return `ORD-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 1000)}`;
}

// ─── Queries ──────────────────────────────────────────────────────────────────

export async function listOrders(params?: { status?: string }) {
    const where: any = {};
    if (params?.status) where.status = params.status;

    return prisma.order.findMany({
        where,
        include: {
            customer: true,
            orderItems: true,
            tasks: {
                include: {
                    assignedTo: { select: { id: true, name: true } },
                },
            },
        },
        orderBy: { createdAt: 'desc' },
    });
}

export async function listProductionEligible() {
    return prisma.order.findMany({
        where: { status: { in: ['confirmed', 'in_production'] } },
        include: { orderItems: true },
        orderBy: { createdAt: 'asc' },
    });
}

export async function getOrderById(id: string) {
    const order = await prisma.order.findUnique({
        where: { id },
        include: {
            customer: true,
            orderItems: true,
            tasks: {
                include: {
                    assignedTo: { select: { id: true, name: true } },
                },
            },
        },
    });
    if (!order) throw new AppError('Order not found.', 404);
    return order;
}

export async function getOrderByNumber(orderNumber: string) {
    const order = await prisma.order.findUnique({
        where: { orderNumber },
        include: { orderItems: true },
    });
    if (!order) throw new AppError('Order not found.', 404);
    return order;
}

// ─── Mutations ────────────────────────────────────────────────────────────────

export async function createOrder(data: {
    customerId?: string;
    guestInfo?: any;
    shippingAddress?: any;
    subtotal: number;
    discount?: number;
    shipping?: number;
    tax?: number;
    total: number;
    totalWeight?: number;
    courierName?: string;
    extraWeightKg?: number;
    extraWeightFee?: number;
    paymentMethod?: string;
    notes?: string;
    source?: string;
    items: Array<{
        productId?: string;
        name: string;
        nameAr?: string;
        sku?: string;
        unitPrice: number;
        quantity: number;
        unitWeight?: number;
        customization?: any;
    }>;
}) {
    const orderId = uuid();
    const orderNumber = generateOrderNumber();

    let finalCustomerId = data.customerId || null;
    if (!finalCustomerId && data.guestInfo?.phone) {
        let customer = await prisma.customer.findUnique({
            where: { phone: data.guestInfo.phone }
        });
        if (!customer) {
            customer = await prisma.customer.create({
                data: {
                    name: data.guestInfo.name || 'Guest',
                    phone: data.guestInfo.phone,
                    email: data.guestInfo.email,
                    wilaya: data.guestInfo.wilaya,
                    address: data.guestInfo.address,
                    isGuest: true
                }
            });
        }
        finalCustomerId = customer.id;
    }

    const order = await prisma.order.create({
        data: {
            id: orderId,
            orderNumber,
            customerId: finalCustomerId,
            guestInfo: data.guestInfo || null,
            shippingAddress: data.shippingAddress || null,
            subtotal: data.subtotal,
            discount: data.discount || 0,
            shipping: data.shipping || 0,
            tax: data.tax || 0,
            total: data.total,
            totalWeight: data.totalWeight || 0,
            courierName: data.courierName || null,
            extraWeightKg: data.extraWeightKg || 0,
            extraWeightFee: data.extraWeightFee || 0,
            paymentMethod: data.paymentMethod || 'cash_on_delivery',
            source: data.source || 'erp',
            notes: data.notes || null,
            status: 'pending',
            paymentStatus: 'unpaid',
            materialCost: 0,
            grossMargin: 0,
            orderItems: {
                create: data.items.map((item) => ({
                    productId: item.productId || null,
                    name: item.name,
                    nameAr: item.nameAr || null,
                    sku: item.sku || null,
                    unitPrice: item.unitPrice,
                    quantity: item.quantity,
                    total: item.unitPrice * item.quantity,
                    unitWeight: item.unitWeight || 0,
                    totalWeight: (item.unitWeight || 0) * item.quantity,
                    customization: item.customization || null,
                })),
            },
        },
        include: { orderItems: true },
    });

    return { id: order.id, orderNumber: order.orderNumber, total: order.total, order };
}

export async function updateOrderStatus(id: string, status: string) {
    return prisma.order.update({ where: { id }, data: { status } });
}

export async function updateOrderFields(id: string, fields: Record<string, any>) {
    return prisma.order.update({ where: { id }, data: fields });
}

export async function softDeleteOrder(id: string) {
    return prisma.order.update({ where: { id }, data: { status: 'cancelled' } });
}

// ─── Order Items ──────────────────────────────────────────────────────────────

export async function replaceOrderItems(orderId: string, items: any[]) {
    // Delete existing items
    await prisma.orderItem.deleteMany({ where: { orderId } });
    if (items.length === 0) return [];

    const created = await prisma.orderItem.createMany({
        data: items.map((item) => ({
            orderId,
            productId: item.productId || item.product_id || null,
            name: item.name,
            unitPrice: item.price || item.unit_price,
            quantity: item.quantity,
            total: (item.price || item.unit_price) * item.quantity,
            customization: item.customization || null,
            unitWeight: item.unit_weight || 0,
            totalWeight: (item.unit_weight || 0) * item.quantity,
        })),
    });
    return created;
}
