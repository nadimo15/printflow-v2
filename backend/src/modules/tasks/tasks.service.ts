/**
 * Tasks module — Service layer
 * Replaces: client.database.from('tasks').*
 * CRITICAL: Also replaces the `complete-task` edge function (BOM-aware inventory deduction).
 */
import prisma from '../../prisma/client';
import { AppError } from '../../middleware/errorHandler';

export async function listTasks() {
    return prisma.task.findMany({
        include: {
            assignedTo: { select: { id: true, name: true } },
            order: { select: { id: true, orderNumber: true, status: true } },
            orderItem: true,
        },
        orderBy: { createdAt: 'desc' },
    });
}

export async function getKanban() {
    const tasks = await prisma.task.findMany({
        include: {
            assignedTo: { select: { id: true, name: true } },
            order: { select: { id: true, orderNumber: true } },
            orderItem: true,
        },
        orderBy: { createdAt: 'desc' },
    });

    return {
        pending: tasks.filter((t) => t.status === 'pending'),
        in_progress: tasks.filter((t) => t.status === 'in_progress'),
        paused: tasks.filter((t) => t.status === 'paused'),
        completed: tasks.filter((t) => t.status === 'completed'),
    };
}

export async function createTask(data: {
    title: string;
    type: string;
    status?: string;
    priority?: string;
    orderId?: string;
    orderItemId?: string;
}) {
    return prisma.task.create({
        data: {
            title: data.title,
            type: data.type,
            status: data.status || 'pending',
            priority: data.priority || 'normal',
            orderId: data.orderId || null,
            orderItemId: data.orderItemId || null,
        },
    });
}

export async function updateTask(id: string, data: Record<string, any>) {
    return prisma.task.update({ where: { id }, data });
}

export async function updateTaskStatus(
    id: string,
    status: string,
    additionalData?: Record<string, any>
) {
    const updates: any = { status, ...additionalData };
    if (status === 'completed') updates.completedAt = new Date();
    if (status === 'in_progress' && !updates.startedAt) updates.startedAt = new Date();
    return prisma.task.update({ where: { id }, data: updates });
}

export async function assignTask(id: string, assignedToId: string | null, assignedById?: string) {
    return prisma.task.update({
        where: { id },
        data: {
            assignedToId,
            ...(assignedById ? { assignedById } : {}),
        },
    });
}

/**
 * BOM-aware task completion — replaces `complete-task.js` edge function.
 * On task completion:
 * 1. Load order item's product_id and customization (size, sides, colors)
 * 2. Match BOM rows against those conditions
 * 3. Deduct inventory stock per BOM rules
 * 4. Log inventory transactions
 * 5. Log rework if blanks were wasted
 * 6. Mark task as completed with actual_cost
 * 7. Update order material_cost and gross_margin
 */
export async function completeTaskWithInventory(data: {
    taskId: string;
    orderId: string;
    workerId?: string;
    blanksWasted?: number;
    reworkReason?: string;
}) {
    const { taskId, orderId, workerId, blanksWasted = 0, reworkReason = 'Unspecified' } = data;
    let totalActionCost = 0;

    // 1. Fetch order items
    const orderItems = await prisma.orderItem.findMany({
        where: { orderId },
        take: 1,
    });

    const orderItem = orderItems[0];
    if (!orderItem) throw new AppError('No order items found for this order.', 400);

    const productId = orderItem.productId;
    const customization = (orderItem.customization as any) || {};
    const selectedSize = customization.selected_size || customization.selectedSize || null;
    const orderQty = Number(orderItem.quantity);
    const printSides = customization.printOptions?.sides?.value || customization.printSides || null;
    const printColors = customization.printOptions?.colors?.value || customization.printColors || null;

    // 2. Fetch and filter BOM rows
    let matchedBomRows: any[] = [];
    if (productId) {
        const allBomRows = await prisma.productBOM.findMany({
            where: { productId },
            include: { inventoryItem: true },
        });

        matchedBomRows = allBomRows.filter((row) => {
            const conds = (row.matchingConditions as any) || {};
            if (conds.size && conds.size !== selectedSize && row.variantSize !== selectedSize && row.variantSize !== 'all' && row.variantSize !== '')
                return false;
            if (conds.print_sides && conds.print_sides !== printSides) return false;
            if (conds.print_colors && conds.print_colors !== printColors) return false;
            return true;
        });
    }

    if (matchedBomRows.length === 0 && (blanksWasted > 0)) {
        throw new AppError(
            `No BOM defined for size "${selectedSize || 'default'}". Cannot deduct inventory. Please define BOM in the product settings.`,
            400
        );
    }

    // 3. Deduct inventory and log transactions
    for (const bomRow of matchedBomRows) {
        const invItem = bomRow.inventoryItem;
        if (!invItem) continue;

        const wasteMultiplier = 1 + (Number(bomRow.wasteFactor) || 0);
        const baseDeduction = Number(bomRow.qtyPerPiece) * orderQty * wasteMultiplier;
        const extraWaste = bomRow.unit === 'pcs' ? blanksWasted : 0;
        const totalDeduction = baseDeduction + extraWaste;

        const newStock = Math.max(0, Number(invItem.stockQuantity) - totalDeduction);
        await prisma.inventoryItem.update({
            where: { id: invItem.id },
            data: { stockQuantity: newStock },
        });

        await prisma.inventoryTransaction.create({
            data: {
                itemId: invItem.id,
                transactionType: 'out',
                quantity: totalDeduction,
                referenceId: orderId,
                notes: `BOM: Task ${taskId} | Qty ${orderQty} | Waste +${extraWaste}`,
            },
        });

        if (extraWaste > 0 && workerId) {
            await prisma.reworkLog.create({
                data: {
                    taskId,
                    orderId,
                    workerId,
                    reason: reworkReason,
                    quantityRuined: extraWaste,
                    estimatedCostLoss: extraWaste * Number(invItem.costPerUnit),
                },
            });
        }

        totalActionCost += totalDeduction * Number(invItem.costPerUnit);
    }

    // 4. Mark task as completed
    await prisma.task.update({
        where: { id: taskId },
        data: {
            status: 'completed',
            completedAt: new Date(),
            actualCost: totalActionCost,
        },
    });

    // 5. Update order material_cost and gross_margin
    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (order) {
        const newMaterialCost = Number(order.materialCost) + totalActionCost;
        const newGrossMargin = Number(order.total) - newMaterialCost - Number(order.shipping);
        await prisma.order.update({
            where: { id: orderId },
            data: { materialCost: newMaterialCost, grossMargin: newGrossMargin },
        });
    }

    return { success: true, newMaterialCostAdded: totalActionCost };
}
