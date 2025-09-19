import prisma from "../../../prisma";
import * as stockService from "./stock.service";

const CANCEL_STATUS_SET = new Set([
    "CANCELLED",
    "CANCELED",
    "REFUSED",
    "REFUNDED",
    "FAILED",
    "ERROR",
    "DECLINED",
]);

export async function handleOrderStatusChange(orderId: string, newStatus: string) {
    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw new Error("Pedido não encontrado");

    const oldStatus = order.status;

    if (String(oldStatus) === String(newStatus)) return;

    // atualiza o status primeiro
    await prisma.order.update({ where: { id: orderId }, data: { status: newStatus as any } });

    if (String(newStatus) === "PAID") {
        await stockService.finalizeReservationForOrder(orderId);
        return;
    }

    if (CANCEL_STATUS_SET.has(String(newStatus))) {
        await stockService.releaseReservationBackToStock(orderId);
        return;
    }

    return;
}