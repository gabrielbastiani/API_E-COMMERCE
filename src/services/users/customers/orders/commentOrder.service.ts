import { PrismaClient, StatusCommentOrder } from "@prisma/client";

const prisma = new PrismaClient();

export type CommentCreateInput = {
    orderId: string;
    customerId?: string;
    userEcommerceId?: string;
    message: string;
    status?: StatusCommentOrder;
};

export async function getCommentsByOrderForCustomer(orderId: string, customerId: string) {
    const order = await prisma.order.findUnique({
        where: { id: orderId },
        select: { id: true, customer_id: true },
    });
    if (!order) throw { status: 404, message: "Pedido não encontrado" };
    if (order.customer_id !== customerId) throw { status: 403, message: "Acesso negado a comentários deste pedido" };

    const comments = await prisma.commentOrder.findMany({
        where: {
            order_id: orderId,
            OR: [{ customer_id: customerId }, { status: StatusCommentOrder.VISIBLE }],
        },
        orderBy: { created_at: "asc" },
        include: {
            customer: { select: { id: true, name: true, email: true, photo: true } },
            userEcommerce: { select: { id: true, name: true, email: true, photo: true } },
            commentAttachment: true,
        },
    });

    return comments;
}

export async function createCommentByCustomer(orderId: string, customerId: string, message: string) {
    const order = await prisma.order.findUnique({ where: { id: orderId }, select: { id: true, customer_id: true } });
    if (!order) throw { status: 404, message: "Pedido não encontrado" };
    if (order.customer_id !== customerId) throw { status: 403, message: "Você não é o proprietário deste pedido" };

    const created = await prisma.commentOrder.create({
        data: { order: { connect: { id: orderId } }, customer: { connect: { id: customerId } }, message, status: StatusCommentOrder.PRIVATE },
        include: { customer: { select: { id: true, name: true, email: true, photo: true } }, userEcommerce: { select: { id: true, name: true, email: true, photo: true } }, commentAttachment: true },
    });

    return created;
}

export async function createCommentByStaff(orderId: string, userEcommerceId: string, message: string, visible = true, assignToOrder = false) {
    const orderFull = await prisma.order.findUnique({ where: { id: orderId }, select: { id: true, customer_id: true } });
    if (!orderFull) throw { status: 404, message: "Pedido não encontrado" };

    const created = await prisma.commentOrder.create({
        data: {
            order: { connect: { id: orderId } },
            customer: { connect: { id: orderFull.customer_id } },
            userEcommerce: { connect: { id: userEcommerceId } },
            message,
            status: visible ? StatusCommentOrder.VISIBLE : StatusCommentOrder.PRIVATE,
        },
        include: {
            customer: { select: { id: true, name: true, email: true, photo: true } },
            userEcommerce: { select: { id: true, name: true, email: true, photo: true } },
            commentAttachment: true,
        },
    });

    if (assignToOrder) {
        await prisma.order.update({ where: { id: orderId }, data: { assigned_userEcommerce_id: userEcommerceId } });
    }

    return created;
}

export async function addAttachmentsToComment(commentId: string, files: Array<{ url: string; filename: string; mimetype: string; size: number }>) {
    if (!files || files.length === 0) return [];
    const created = await prisma.commentAttachment.createMany({
        data: files.map((f) => ({ comment_id: commentId, url: f.url, filename: f.filename, mimetype: f.mimetype, size: f.size })),
    });
    return created;
}

export async function setCommentVisibility(commentId: string, userEcommerceId: string, visible: boolean) {
    const staff = await prisma.userEcommerce.findUnique({ where: { id: userEcommerceId }, select: { id: true } });
    if (!staff) throw { status: 404, message: "Usuário do CMS não encontrado" };

    const updated = await prisma.commentOrder.update({
        where: { id: commentId },
        data: {
            status: visible ? StatusCommentOrder.VISIBLE : StatusCommentOrder.PRIVATE,
            userEcommerce: { connect: { id: userEcommerceId } }, // quem alterou vira autor se não houver
        },
        include: {
            customer: { select: { id: true, name: true, email: true, photo: true } },
            userEcommerce: { select: { id: true, name: true, email: true, photo: true } },
            commentAttachment: true,
        },
    });

    return updated;
}

export async function assignOrderToStaff(orderId: string, userEcommerceId: string | null) {
    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw { status: 404, message: "Pedido não encontrado" };
    const updated = await prisma.order.update({ where: { id: orderId }, data: { assigned_userEcommerce_id: userEcommerceId } });
    return updated;
}

export async function getCommentsByOrderForAdmin(orderId: string) {
    const order = await prisma.order.findUnique({ where: { id: orderId }, select: { id: true } });
    if (!order) throw { status: 404, message: "Pedido não encontrado" };

    const comments = await prisma.commentOrder.findMany({
        where: { order_id: orderId },
        orderBy: { created_at: "asc" },
        include: {
            customer: { select: { id: true, name: true, email: true, photo: true } },
            userEcommerce: { select: { id: true, name: true, email: true, photo: true } },
            commentAttachment: true
        },
    });

    return comments;
}