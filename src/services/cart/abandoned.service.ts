// src/services/cart/abandoned.service.ts
import prisma from '../../prisma';

type AbandonedCartPayload = {
    cart_id: string;
    customer_id?: string | null;
    items: Array<{ product_id: string; quantity?: number; price?: number }>;
    total?: number | null;
    discountCode?: string | null;
};

export async function upsertAbandonedCart(payload: AbandonedCartPayload) {
    const { cart_id, customer_id, items, total, discountCode } = payload;
    if (!cart_id) throw new Error('cart_id obrigatório');

    // tenta obter customer_id a partir do cart se não foi enviado
    let resolvedCustomerId = customer_id ?? null;
    if (!resolvedCustomerId) {
        const cart = await prisma.cart.findUnique({ where: { id: cart_id }, include: { customer: true } as any });
        if (cart?.customer_id) resolvedCustomerId = cart.customer_id;
    }

    if (!resolvedCustomerId) {
        // se não foi possível resolver, retornamos erro (model exige customer relation não-nula)
        throw new Error('customer_id não informado e não foi possível determinar a partir do cart.');
    }

    // Upsert baseado em cart_id (cart_id é UNIQUE no schema)
    const exists = await prisma.abandonedCart.findUnique({ where: { cart_id } });

    if (exists) {
        const updated = await prisma.abandonedCart.update({
            where: { cart_id },
            data: {
                items: items as any,
                total: typeof total === 'number' ? total : exists.total,
                abandonedAt: new Date(),
                discountCode: discountCode ?? exists.discountCode ?? null,
            },
        });
        return updated;
    } else {
        const created = await prisma.abandonedCart.create({/* @ts-ignore */
            data: {
                cart: { connect: { id: cart_id } },
                cart_id,
                customer: { connect: { id: resolvedCustomerId } },
                items: items as any,
                total: typeof total === 'number' ? total : 0,
                discountCode: discountCode ?? null,
            },
        });
        return created;
    }
}

export async function getAbandonedCartByCartId(cartId: string) {
    if (!cartId) throw new Error('cartId obrigatório');
    return prisma.abandonedCart.findUnique({
        where: { cart_id: cartId },
        include: { reminders: true, cart: true, customer: true } as any,
    });
}

export async function deleteAbandonedCartByCartId(cartId: string) {
    if (!cartId) throw new Error('cartId obrigatório');
    return prisma.abandonedCart.deleteMany({ where: { cart_id: cartId } });
}