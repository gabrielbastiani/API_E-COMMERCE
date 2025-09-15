import prisma from "../../../prisma";

export async function createOrderTransaction(params: {
    cartId?: string | null;
    items: Array<any>;
    subtotal: number;
    shippingCost: number;
    finalGrandTotal: number;
    addressId?: string | null;
    address?: any | null; // objeto com os campos do Address, se quiser criar
    shippingRaw?: any | null;
    shippingId: string;
    customer: any;
    promotion_id?: any;
}) {
    const {
        cartId,
        items,
        subtotal,
        shippingCost,
        finalGrandTotal,
        addressId,
        address,
        shippingRaw,
        customer,
        promotion_id,
    } = params;

    const createdOrder = await prisma.$transaction(async (tx) => {
        // --- validar / preparar address para o create do Order ---
        let addressRelation:
            | { connect: { id: string } }
            | {
                create: {
                    recipient_name?: string | null;
                    street: string;
                    city: string;
                    state: string;
                    zipCode: string;
                    number?: string | null;
                    neighborhood?: string | null;
                    country: string;
                    complement?: string | null;
                    reference?: string | null;
                    customer: { connect: { id: string } };
                };
            };

        if (addressId) {
            // valida se existe
            const existing = await tx.address.findUnique({ where: { id: addressId } });
            if (!existing) throw new Error(`Endereço não encontrado para id ${addressId}`);
            addressRelation = { connect: { id: addressId } };
        } else if (address) {
            // cria a address usando os campos mínimos esperados (adapte se necessário)
            if (!address.street || !address.city || !address.state || !address.zipCode || !address.country) {
                throw new Error("Quando informando 'address' é obrigatório street, city, state, zipCode e country.");
            }
            addressRelation = {
                create: {
                    recipient_name: address.recipient_name ?? null,
                    street: address.street,
                    city: address.city,
                    state: address.state,
                    zipCode: address.zipCode,
                    number: address.number ?? null,
                    neighborhood: address.neighborhood ?? null,
                    country: address.country,
                    complement: address.complement ?? null,
                    reference: address.reference ?? null,
                    customer: { connect: { id: customer.id } },
                },
            };
        } else {
            // seu schema exige address_id (não nulo), então forçamos erro se não veio nada
            throw new Error("É necessário informar 'addressId' ou o objeto 'address' para criar o pedido.");
        }

        // --- gerar número sequencial (Postgres SEQUENCE) ---
        let idOrderStore: string | null = null;
        try {
            const seqRows = (await tx.$queryRaw`SELECT nextval('order_store_seq') as val`) as Array<{ val: number | string }>;
            const seqNum = Number(seqRows?.[0]?.val ?? 0);
            const year = new Date().getFullYear();
            idOrderStore = `${year}-${String(seqNum).padStart(6, "0")}`;
        } catch (err: any) {
            throw new Error(
                "Falha ao gerar número sequencial 'order_store_seq'. Execute a migration que cria a sequence (CREATE SEQUENCE order_store_seq) e tente novamente. Detalhe: " +
                (err?.message ?? String(err))
            );
        }

        // --- criar order usando a relação 'address' (connect ou create) ---
        const created = await tx.order.create({
            data: {
                total: subtotal,
                shippingCost: shippingCost ?? 0,
                grandTotal: finalGrandTotal,
                // aqui está a correção: usamos a propriedade `address` (nested create/connect)
                address: addressRelation,
                // shippingMethod / estimatedDelivery como string | null
                shippingMethod: shippingRaw?.name ?? null,
                estimatedDelivery: shippingRaw?.deliveryTime ?? null,
                customer: { connect: { id: customer.id } },
                cart_id: cartId ?? undefined,
                id_order_store: idOrderStore,
                promotion_id: promotion_id ?? undefined, // campo Json? aceita undefined ou valor json
            },
        });

        // --- criar order items e decrementar estoque ---
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
                await tx.product.update({
                    where: { id: it.product_id },
                    data: { stock: { decrement: it.quantity ?? 0 } },
                });
            } catch {
                // ignore stock errors
            }
        }

        return created;
    });

    return createdOrder;
}