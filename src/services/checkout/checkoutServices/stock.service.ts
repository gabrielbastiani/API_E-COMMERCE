import prisma from "../../../prisma";
/**
 * Finaliza reservas (quando order -> PAID):
 * - reservedStock -= qty (em variant ou product)
 * Nota: não ajusta product.stock aqui porque stock já foi decrementado no momento da reserva.
 */
export async function finalizeReservationForOrder(orderId: string) {
    const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: { items: true },
    });
    if (!order) throw new Error("Order not found");

    await prisma.$transaction(async (tx: any) => {
        for (const it of order.items) {
            const qty = Number((it as any).quantity ?? 0);
            if (!qty || qty <= 0) continue;

            if ((it as any).variant_id) {
                await tx.productVariant.updateMany({
                    where: { id: (it as any).variant_id, reservedStock: { gte: qty } },
                    data: { reservedStock: { decrement: qty } },
                });
                // manter agregado consistente:
                await tx.product.updateMany({
                    where: { id: it.product_id, reservedStock: { gte: qty } },
                    data: { reservedStock: { decrement: qty } },
                });
            } else {
                await tx.product.updateMany({
                    where: { id: it.product_id, reservedStock: { gte: qty } },
                    data: { reservedStock: { decrement: qty } },
                });
            }
        }
    });
}

/**
 * Release reservation => devolve ao estoque (quando order cancelada/refund)
 * Faz: reservedStock -= qty ; stock += qty
 */
export async function releaseReservationBackToStock(orderId: string) {
    const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: { items: true },
    });
    if (!order) throw new Error("Order not found");

    await prisma.$transaction(async (tx: any) => {
        for (const it of order.items) {
            const qty = Number((it as any).quantity ?? 0);
            if (!qty || qty <= 0) continue;

            if ((it as any).variant_id) {
                await tx.productVariant.updateMany({
                    where: { id: (it as any).variant_id, reservedStock: { gte: qty } },
                    data: { reservedStock: { decrement: qty }, stock: { increment: qty } },
                });
                await tx.product.updateMany({
                    where: { id: it.product_id, reservedStock: { gte: qty } },
                    data: { reservedStock: { decrement: qty }, stock: { increment: qty } },
                });
            } else {
                await tx.product.updateMany({
                    where: { id: it.product_id, reservedStock: { gte: qty } },
                    data: { reservedStock: { decrement: qty }, stock: { increment: qty } },
                });
            }
        }
    });
}
