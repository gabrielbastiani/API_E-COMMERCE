import prisma from '../../prisma'

export type CartItemPayload = {
    id?: string
    product_id: string
    quantity: number
    price?: number
    variant_id?: string | null
    weight?: number
    length?: number
    height?: number
    width?: number
}

export type AbandonedPayload = {
    cart_id?: string | null
    customer_id: string
    items: CartItemPayload[]
    subtotal?: number
    shippingCost?: number | null
    total?: number
}

export async function upsertCartAndAbandoned(payload: AbandonedPayload) {
    if (!payload?.customer_id) throw new Error('customer_id obrigatório')

    const customer_id = payload.customer_id
    const incomingItems = Array.isArray(payload.items) ? payload.items : []

    // antes de criar/atualizar o cart, compute:
    const subtotal = typeof payload.subtotal === 'number'
        ? payload.subtotal
        : incomingItems.reduce((s, it) => s + (Number(it.price ?? 0) * Number(it.quantity ?? 0)), 0)

    const shippingCost = typeof payload.shippingCost === 'number' ? payload.shippingCost : (payload.shippingCost ?? 0)
    const total = typeof payload.total === 'number' ? payload.total : subtotal + (shippingCost ?? 0)

    return await prisma.$transaction(async (tx) => {
        // 1) localizar cart (por cart_id preferencialmente)
        let cart = null
        if (payload.cart_id) {
            cart = await tx.cart.findUnique({ where: { id: payload.cart_id } })
            // se cart foi encontrado mas pertence a outro customer -> ignorar cart_id e procurar por customer_id
            if (cart && cart.customer_id !== customer_id) {
                cart = null
            }
        }

        // 2) se não encontrou por id, procurar por customer_id (campo unique na model Cart)
        if (!cart) {
            cart = await tx.cart.findUnique({ where: { customer_id: customer_id } })
        }

        // 3) criar cart se necessário
        if (!cart) {
            cart = await tx.cart.create({
                data: {
                    customer_id: customer_id,
                    subtotal,
                    shippingCost,
                    total,
                },
            })
        } else {
            cart = await tx.cart.update({
                where: { id: cart.id },
                data: {
                    subtotal,
                    shippingCost,
                    total,
                },
            })
            await tx.cartItem.deleteMany({ where: { cart_id: cart.id } })
        }

        // 4) criar items novos (cada item respeita unique composto)
        for (const it of incomingItems) {
            // normalizar variant_id para undefined quando nulo
            const variantId = it.variant_id ?? undefined
            await tx.cartItem.create({
                data: {
                    quantity: it.quantity ?? 1,
                    product_id: it.product_id,
                    variant_id: variantId,
                    cart_id: cart.id,
                },
            })
        }

        // 5) upsert AbandonedCart (cart_id é unique na model)
        const abandoned = await tx.abandonedCart.findUnique({ where: { cart_id: cart.id } })
        const itemsJson = incomingItems.map(i => ({
            product_id: i.product_id,
            variant_id: i.variant_id ?? null,
            price: i.price ?? null,
            quantity: i.quantity ?? 1,
        }))

        if (abandoned) {
            await tx.abandonedCart.update({
                where: { cart_id: cart.id },
                data: {
                    items: itemsJson as any,
                    total,
                    abandonedAt: new Date(),
                },
            })
        } else {
            await tx.abandonedCart.create({
                data: {
                    cart_id: cart.id,
                    customer_id: customer_id,
                    items: itemsJson as any,
                    total,
                },
            })
        }

        // 6) retornar cart atualizado com items
        const result = await tx.cart.findUnique({
            where: { id: cart.id },
            include: { items: true, AbandonedCart: true },
        })

        return result
    })
}

/** Deleta AbandonedCart por cart id (id string) */
export async function deleteAbandonedCartByCartId(cartId: string) {
    if (!cartId) throw new Error('cartId obrigatório')
    // deleteMany evita erro se constraint diferente
    return prisma.abandonedCart.deleteMany({ where: { cart_id: cartId } })
}

/** Retorna o cart do customer (se existir) */
export async function getCartByCustomer(customer_id?: string | null) {
  if (!customer_id) return null
  return prisma.cart.findUnique({ where: { customer_id: customer_id }, include: { items: true, AbandonedCart: true } })
}