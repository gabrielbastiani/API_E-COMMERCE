// src/services/checkout/checkoutServices/createOrderTransaction.ts
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
    shippingId?: string;
    customer: { id: string }; // esperamos um objeto com id
    promotion_id?: any;
    promotionDetails?: Array<{ id: string; discountApplied: number }>;
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
        promotionDetails,
    } = params;

    if (!customer || !customer.id) throw new Error("customer.id obrigatório");

    const createdOrder = await prisma.$transaction(async (tx) => {
        // ---------------- address handling (mantive sua lógica) ----------------
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
            const existing = await tx.address.findUnique({ where: { id: addressId } });
            if (!existing) throw new Error(`Endereço não encontrado para id ${addressId}`);
            addressRelation = { connect: { id: addressId } };
        } else if (address) {
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
            throw new Error("É necessário informar 'addressId' ou o objeto 'address' para criar o pedido.");
        }

        // ---------------- gerar id_order_store (mantive) ----------------
        let idOrderStore: string | null = null;
        try {
            const seqRows = (await tx.$queryRaw`SELECT nextval('order_store_seq') as val`) as Array<{ val: number | string }>;
            const seqNum = Number(seqRows?.[0]?.val ?? 0);
            const year = new Date().getFullYear();
            idOrderStore = `${year}-${String(seqNum).padStart(6, "0")}`;
        } catch (err: any) {
            throw new Error(
                "Falha ao gerar número sequencial 'order_store_seq'. Execute a migration que cria a sequence e tente novamente. Detalhe: " +
                (err?.message ?? String(err))
            );
        }

        // ---------------- criar order ----------------
        const created = await tx.order.create({
            data: {
                total: subtotal,
                shippingCost: shippingCost ?? 0,
                grandTotal: finalGrandTotal,
                address: addressRelation,
                shippingMethod: shippingRaw?.name ?? null,
                estimatedDelivery: shippingRaw?.deliveryTime ?? null,
                customer: { connect: { id: customer.id } },
                cart_id: cartId ?? undefined,
                id_order_store: idOrderStore,
                promotion_id: promotion_id ?? undefined,
            },
        });

        // ---------------- criar orderItems e decrementar estoque ----------------
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
                // mantive comportamento original (não quebrar por erro de estoque)
            }
        }

        // ---------------- PROCESSAR PROMOÇÕES (atomicamente) ----------------
        // Comportamento:
        // - promotionDetails esperado: [{ id: string, discountApplied: number }, ...]
        // - Valida perUserCouponLimit e totalCouponCount (atomically).
        // - Resolve conflitos non-cumulative: escolhe 1 vencedor (maior priority, empate -> último enviado).
        // - Se frontend enviou promotionDetails mas **nenhuma** promo foi aplicada -> THROW com reasons.
        // - Retorna arrays appliedPromotions/skippedPromotions para serem propagados.
        let appliedPromotionsResult: Array<{ id: string; discountApplied: number }> = [];
        let skippedPromotionsResult: Array<{ id: string; reason: string }> = [];

        if (Array.isArray(promotionDetails) && promotionDetails.length > 0) {
            // console debug (ajuda a rastrear)
            // eslint-disable-next-line no-console
            console.log('createOrderTransaction -> received promotionDetails:', promotionDetails);

            // 1) normalizar e preservar índice (último envio vence no desempate)
            const normalized = promotionDetails.map((p: any, idx: number) => ({
                id: String(p?.id ?? '').trim(),
                discountApplied: Number(p?.discountApplied ?? p?.discount ?? 0),
                idx,
            })).filter((p: any) => p.id);

            if (normalized.length === 0) {
                // não havia ids válidos -> tratar como ausência de promo
            } else {
                // dedupe mantendo a ÚLTIMA ocorrência
                const lastMap = new Map<string, { id: string; discountApplied: number; idx: number }>();
                for (const p of normalized) lastMap.set(p.id, p);
                const unique = Array.from(lastMap.values());

                const ids = unique.map((u) => u.id);

                // buscar metadados das promos necessárias
                const promos = await tx.promotion.findMany({
                    where: { id: { in: ids } },
                    select: {
                        id: true,
                        perUserCouponLimit: true,
                        totalCouponCount: true,
                        cumulative: true,
                        priority: true,
                        name: true,
                    },
                });
                const promoMap = new Map(promos.map((p) => [p.id, p]));

                // buscar titles/displays opcionais (melhora mensagem)
                const displays = await tx.promotionDisplay.findMany({
                    where: { promotion_id: { in: ids } },
                    orderBy: { created_at: 'desc' },
                    select: { promotion_id: true, title: true },
                });
                const titleMap = new Map<string, string>();
                for (const d of displays) if (!titleMap.has(d.promotion_id)) titleMap.set(d.promotion_id, d.title);

                // separar non-cumulatives entre os requested
                const nonCumulatives = unique.filter((u) => {
                    const meta = promoMap.get(u.id);
                    return meta ? meta.cumulative === false : false;
                });

                // escolher vencedor entre non-cumulatives (se >1)
                let winnerId: string | null = null;
                if (nonCumulatives.length === 1) winnerId = nonCumulatives[0].id;
                else if (nonCumulatives.length > 1) {
                    let winner = nonCumulatives[0];
                    for (const cand of nonCumulatives.slice(1)) {
                        const candMeta = promoMap.get(cand.id)!;
                        const winMeta = promoMap.get(winner.id)!;
                        if ((candMeta.priority ?? 0) > (winMeta.priority ?? 0)) winner = cand;
                        else if ((candMeta.priority ?? 0) === (winMeta.priority ?? 0) && cand.idx > winner.idx) winner = cand;
                    }
                    winnerId = winner.id;
                }

                // construir candidatos finais a aplicar
                const candidates = unique.filter((u) => {
                    const meta = promoMap.get(u.id);
                    if (!meta) {
                        skippedPromotionsResult.push({ id: u.id, reason: `Promoção não encontrada` });
                        return false;
                    }
                    if (meta.cumulative === true) return true;
                    // non-cumulative -> só se for a vencedora
                    if (winnerId && u.id === winnerId) return true;
                    // se chegou aqui e não é winner -> será pulada (anulada)
                    skippedPromotionsResult.push({ id: u.id, reason: `Promoção anulada por conflito com outra não-cumulativa` });
                    return false;
                });

                // valida per-user e prepara lista para decremento
                const willTryToApply: Array<{ id: string; discountApplied: number }> = [];
                for (const c of candidates) {
                    const meta = promoMap.get(c.id)!;
                    const title = titleMap.get(c.id) ?? meta.name ?? c.id;
                    if (typeof meta.perUserCouponLimit === 'number') {
                        const usedByUser = await tx.promotionUsage.count({
                            where: { promotion_id: c.id, customer_id: customer.id },
                        });
                        if (usedByUser >= meta.perUserCouponLimit) {
                            skippedPromotionsResult.push({ id: c.id, reason: `Limite por usuário atingido para "${title}"` });
                            continue;
                        }
                    }
                    willTryToApply.push({ id: c.id, discountApplied: c.discountApplied });
                }

                // decrementar totalCouponCount atomicamente quando aplicável
                for (const w of willTryToApply) {
                    const meta = promoMap.get(w.id)!;
                    const title = titleMap.get(w.id) ?? meta.name ?? w.id;
                    if (typeof meta.totalCouponCount === 'number') {
                        const batch = await tx.promotion.updateMany({
                            where: { id: w.id, totalCouponCount: { gt: 0 } },
                            data: { totalCouponCount: { decrement: 1 } },
                        });
                        if ((batch as any).count === 0) {
                            skippedPromotionsResult.push({ id: w.id, reason: `Promoção "${title}" esgotada.` });
                            continue;
                        }
                    }
                    // se passou em ambos, cria usage e marca applied
                    await tx.promotionUsage.create({
                        data: {
                            promotion: { connect: { id: w.id } },
                            titlePromotion: title,
                            customer: { connect: { id: customer.id } },
                            order: { connect: { id: created.id } },
                            discountApplied: Number(w.discountApplied ?? 0),
                        },
                    });
                    appliedPromotionsResult.push({ id: w.id, discountApplied: Number(w.discountApplied ?? 0) });
                }

                // se frontend solicitou promos e NENHUMA foi aplicada -> falha para notificar usuário
                if (normalized.length > 0 && appliedPromotionsResult.length === 0) {
                    // construir mensagem agregada
                    const reasons = skippedPromotionsResult.map(s => `${s.reason}`).join('; ');
                    throw new Error(`Nenhuma promoção aplicada: ${reasons}`);
                }

                // atualizar order.promotion_id com a primeira aplicada (se houver)
                if (appliedPromotionsResult.length > 0) {
                    await tx.order.update({
                        where: { id: created.id },
                        data: { promotion_id: appliedPromotionsResult[0].id },
                    });
                }
            }
        } // fim if promotionDetails

        // anexar resultados ao objeto criado que será retornado
        // (assumimos que createdOrder será retornado mais acima; aqui ajustamos o objeto retornado da transaction)
        const createdWithPromoInfo = {
            ...created,
            appliedPromotions: appliedPromotionsResult,
            skippedPromotions: skippedPromotionsResult,
        };

        return createdWithPromoInfo;

    }); // fim transaction

    return createdOrder;
}