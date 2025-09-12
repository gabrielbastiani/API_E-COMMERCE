import prisma from "../../../prisma";

export async function createOrderTransaction(params: {
    cartId?: string | null;
    items: Array<any>;
    subtotal: number;
    shippingCost: number;
    finalGrandTotal: number;
    addressId?: string | null;
    address?: any | null;
    shippingRaw?: any | null;
    shippingId: string;
    customer: any;
    promotion_id?: any;
}) {
    const { cartId, items, subtotal, shippingCost, finalGrandTotal, addressId, address, shippingRaw, customer, promotion_id } = params;

    const createdOrder = await prisma.$transaction(async (tx) => {

        console.log(addressId)

        const id_address = await address.findUnique({
            where: {
                id: addressId
            }
        })

        // gerar número sequencial (Postgres SEQUENCE)
        let idOrderStore: string | null = null;
        try {
            const seqRows = (await tx.$queryRaw`SELECT nextval('order_store_seq') as val`) as Array<{ val: number | string }>;
            const seqNum = Number(seqRows?.[0]?.val ?? 0);
            const year = new Date().getFullYear();
            idOrderStore = `${year}-${String(seqNum).padStart(6, '0')}`;
        } catch (err: any) {
            throw new Error("Falha ao gerar número sequencial 'order_store_seq'. Execute a migration que cria a sequence (CREATE SEQUENCE order_store_seq) e tente novamente. Detalhe: " + (err?.message ?? String(err)));
        }

        console.log(promotion_id)

        const created = await tx.order.create({
            data: {
                total: subtotal,
                shippingCost: shippingCost ?? 0,
                grandTotal: finalGrandTotal,
                address_id: id_address,
                shippingMethod: shippingRaw?.name,
                estimatedDelivery: shippingRaw?.deliveryTime,
                customer: { connect: { id: customer.id } },
                cart_id: cartId ?? undefined,
                id_order_store: idOrderStore,
                promotion_id: promotion_id
            },
        });

        for (const it of items) {
            await tx.orderItem.create({
                data: {
                    order_id: created.id,
                    product_id: it.product_id,
                    price: it.price ?? 0,
                    quantity: it.quantity ?? 1,
                },
            });

            try {
                await tx.product.update({ where: { id: it.product_id }, data: { stock: { decrement: it.quantity ?? 0 } } });
            } catch {
                // ignore stock errors
            }
        }

        return created;
    });

    return createdOrder;
}