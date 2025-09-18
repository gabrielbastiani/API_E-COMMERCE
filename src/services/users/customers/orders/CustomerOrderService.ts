import prismaClient from "../../../../prisma";

interface UserRequest {
    customer_id: string;
    page?: number;
    per_page?: number;
    q?: string; // busca genérica (nome do produto, parte do id_order_store)
    sku?: string;
    paymentMethod?: string;
    status?: string; // pode ser order.status ou payment.status
    orderNumber?: string; // id_order_store
    date_from?: string; // YYYY-MM-DD
    date_to?: string;   // YYYY-MM-DD
}

type PromotionWithIncludes = any; // mantenho genérico como antes

class CustomerOrderService {
    async execute({
        customer_id,
        page = 1,
        per_page = 10,
        q,
        sku,
        paymentMethod,
        status,
        orderNumber,
        date_from,
        date_to,
    }: UserRequest) {
        // normaliza paginação
        if (page < 1) page = 1;
        if (per_page < 1) per_page = 1;
        const take = per_page;
        const skip = (page - 1) * take;

        // ################################
        // Monta where principal com filtros
        // ################################
        const where: any = {
            customer_id,
        };

        // busca genérica: procura por nome do produto, skuMaster do produto, id_order_store
        if (q && q.trim().length > 0) {
            const qClean = q.trim();
            where.OR = [
                { id_order_store: { contains: qClean, mode: "insensitive" } },
                // items -> product -> name
                {
                    items: {
                        some: {
                            product: {
                                name: { contains: qClean, mode: "insensitive" },
                            },
                        },
                    },
                },
                // items -> product -> skuMaster
                {
                    items: {
                        some: {
                            product: {
                                skuMaster: { contains: qClean, mode: "insensitive" },
                            },
                        },
                    },
                },
            ];
        }

        // filtro por SKU específico (produto relacionado ao item)
        if (sku && sku.trim().length > 0) {
            const skuClean = sku.trim();
            where.items = where.items ?? {};
            if (!where.AND) where.AND = [];
            where.AND.push({
                items: {
                    some: {
                        product: {
                            skuMaster: { contains: skuClean, mode: "insensitive" },
                        },
                    },
                },
            });
        }

        // filtro por forma de pagamento (payment.method)
        if (paymentMethod && paymentMethod.trim().length > 0) {
            const pm = paymentMethod.trim();
            where.AND = where.AND ?? [];
            where.AND.push({
                payment: { is: { method: pm } },
            });
        }

        // filtro por status (pode ser order.status ou payment.status) -> fazemos OR entre ambos
        if (status && status.trim().length > 0) {
            const st = status.trim();
            where.AND = where.AND ?? [];
            where.AND.push({
                OR: [
                    { status: { equals: st } },
                    { payment: { is: { status: st } } },
                ],
            });
        }

        // filtro por numero do pedido (id_order_store)
        if (orderNumber && orderNumber.trim().length > 0) {
            const no = orderNumber.trim();
            where.AND = where.AND ?? [];
            where.AND.push({ id_order_store: { contains: no, mode: "insensitive" } });
        }

        // filtro por intervalo de datas (created_at)
        if (date_from || date_to) {
            const dateWhere: any = {};
            if (date_from) {
                const d = new Date(date_from + "T00:00:00.000Z");
                dateWhere.gte = d;
            }
            if (date_to) {
                const d = new Date(date_to + "T23:59:59.999Z");
                dateWhere.lte = d;
            }
            where.AND = where.AND ?? [];
            where.AND.push({ created_at: dateWhere });
        }

        // ################################
        // Conta total de registros que batem com filtros (para meta)
        // ################################
        const total = await prismaClient.order.count({ where });

        // ################################
        // Busca os pedidos com includes (ajustado para ter promotionUsage dentro de promotion)
        // ################################
        const ordersData: any[] = await prismaClient.order.findMany({
            where,
            include: {
                _count: true,
                appliedPromotions: {
                    include: {
                        order: true,
                        promotion: {
                            include: {
                                promotionUsage: {
                                    include: {
                                        promotion: true,
                                        order: true,
                                    },
                                },
                                actions: true,
                                conditions: true,
                                displays: true,
                                coupons: true,
                                badges: true,
                            },
                        },
                    },
                },
                commentOrder: {
                    include: { order: true, userEcommerce: true },
                },
                items: {
                    include: {
                        order: true,
                        product: {
                            include: {
                                images: true,
                                mainPromotion: {
                                    include: { coupons: true, displays: true },
                                },
                                promotions: true,
                                variants: {
                                    include: {
                                        variantAttribute: {
                                            include: { variant: true, variantAttributeImage: true },
                                        },
                                    },
                                },
                            },
                        },
                    },
                },
                payment: { include: { customer: true, order: true } },
                address: { include: { order: true } },
            },
            orderBy: {
                created_at: "desc",
            },
            skip,
            take,
        });

        // ###########################
        // Reuso do seu código original para coletar promotion ids, buscar promotions e computar descontos
        // ###########################
        const allPromotionIds = new Set<string>();
        for (const ord of ordersData) {
            if (Array.isArray(ord.promotion_id)) {
                ord.promotion_id.forEach((pId: string) => allPromotionIds.add(pId));
            }
            if (Array.isArray(ord.appliedPromotions) && ord.appliedPromotions.length > 0) {
                ord.appliedPromotions.forEach((ap: any) => {
                    if (ap.promotion && ap.promotion.id) allPromotionIds.add(ap.promotion.id);
                });
            }
        }

        const promotionIds = Array.from(allPromotionIds);
        let promotionsById: Record<string, PromotionWithIncludes> = {};

        if (promotionIds.length > 0) {
            const promotions = await prismaClient.promotion.findMany({
                where: { id: { in: promotionIds } },
                include: {
                    actions: true,
                    conditions: true,
                    displays: true,
                    coupons: true,
                    badges: true,
                },
            });

            promotionsById = promotions.reduce((acc, p) => {
                acc[p.id] = p;
                return acc;
            }, {} as Record<string, PromotionWithIncludes>);
        }

        const computePromotionDiscount = (order: any, promotion: any) => {
            let discountTotal = 0;
            const breakdownItems: Array<{ itemId?: string; label: string; amount: number }> = [];
            let shippingDiscount = 0;

            const subtotal = (order.items ?? []).reduce((s: number, it: any) => s + (it.price ?? 0) * (it.quantity ?? 1), 0);
            const shippingCost = typeof order.shippingCost === "number" ? order.shippingCost : 0;

            const actions: any[] = Array.isArray(promotion?.actions) ? promotion.actions : [];

            for (const action of actions) {
                const type = String(action.type ?? "").toUpperCase();
                const params = action.params ?? {};

                if (type.includes("PERCENT") || type.includes("PERC")) {
                    const pct = Number(params.percentage ?? params.value ?? params.percent ?? 0);
                    if (pct > 0) {
                        const amt = +(subtotal * (pct / 100));
                        discountTotal += amt;
                        breakdownItems.push({ label: `Desconto ${pct}% (${promotion.name})`, amount: amt });
                        continue;
                    }
                }

                if (type.includes("FIXED") || type.includes("AMOUNT") || type.includes("VALUE")) {
                    const amt = Number(params.amount ?? params.value ?? 0);
                    if (amt > 0) {
                        discountTotal += amt;
                        breakdownItems.push({ label: `Desconto fixo (${promotion.name})`, amount: amt });
                        continue;
                    }
                }

                if (type.includes("SHIPPING") || params.freeShipping === true || params.free_shipping === true) {
                    shippingDiscount = shippingCost;
                    discountTotal += shippingDiscount;
                    breakdownItems.push({ label: `Frete grátis (${promotion.name})`, amount: shippingDiscount });
                    continue;
                }

                if (Array.isArray(params.productIds) && params.productIds.length > 0) {
                    const productIds: string[] = params.productIds;
                    if (params.percentage) {
                        const pct = Number(params.percentage);
                        for (const it of order.items ?? []) {
                            if (productIds.includes(it.product_id ?? it.productId)) {
                                const itAmt = (it.price ?? it.unitPrice ?? 0) * (it.quantity ?? 1);
                                const amt = +(itAmt * (pct / 100));
                                discountTotal += amt;
                                breakdownItems.push({ itemId: it.id, label: `Desconto ${pct}% (${promotion.name}) - ${it.product?.name ?? it.name ?? "item"}`, amount: amt });
                            }
                        }
                        continue;
                    }
                    if (params.amount) {
                        const matchedItems = (order.items ?? []).filter((it: any) => productIds.includes(it.product_id ?? it.productId));
                        const fullPriceMatched = matchedItems.reduce((s: number, it: any) => s + (it.price ?? it.unitPrice ?? 0) * (it.quantity ?? 1), 0);
                        if (fullPriceMatched > 0) {
                            const fixed = Number(params.amount);
                            for (const it of matchedItems) {
                                const itPrice = (it.price ?? it.unitPrice ?? 0) * (it.quantity ?? 1);
                                const amt = +(fixed * (itPrice / fullPriceMatched));
                                discountTotal += amt;
                                breakdownItems.push({ itemId: it.id, label: `Desconto (${promotion.name}) em ${it.product?.name ?? it.name}`, amount: amt });
                            }
                        }
                        continue;
                    }
                }

                if (params && (params.value || params.amount)) {
                    const amt = Number(params.value ?? params.amount ?? 0);
                    if (amt > 0) {
                        discountTotal += amt;
                        breakdownItems.push({ label: `Desconto (${promotion.name})`, amount: amt });
                        continue;
                    }
                }

                breakdownItems.push({ label: `Promoção aplicada: ${promotion.name} (tipo ${type}) — ver detalhes`, amount: 0 });
            }

            discountTotal = Math.round(discountTotal * 100) / 100;

            return {
                discountTotal,
                breakdown: { items: breakdownItems, shippingDiscount },
            };
        };

        // ###########################
        // Montagem dos pedidos enriquecidos
        // - Prioriza promotionUsage (discountApplied) quando encontrar registros
        // - Senão mantém comportamento antigo (recalcula)
        // ###########################
        const enrichedOrders = await Promise.all(
            ordersData.map(async (order: any) => {
                const promotionIdsForOrder: string[] = Array.isArray(order.promotion_id) ? order.promotion_id : [];

                const appliedPromsFromRelation = Array.isArray(order.appliedPromotions) && order.appliedPromotions.length > 0
                    ? order.appliedPromotions.map((ap: any) => ap.promotion).filter(Boolean)
                    : [];

                // COLETAR promotionUsage vinculados a este pedido a partir de appliedPromotions[*].promotion.promotionUsage
                const promotionUsagesForOrder: any[] = [];
                if (Array.isArray(order.appliedPromotions)) {
                    for (const ap of order.appliedPromotions) {
                        const prom = ap.promotion;
                        if (!prom) continue;
                        const usages = Array.isArray(prom.promotionUsage) ? prom.promotionUsage : [];
                        for (const pu of usages) {
                            // validar vínculo com o pedido (fallbacks possíveis)
                            if (!pu) continue;
                            const puOrderId = pu.order_id ?? pu.order?.id ?? null;
                            if (puOrderId && puOrderId === order.id) {
                                // anexar referência à promoção para exibir nome/ações se disponível
                                promotionUsagesForOrder.push({ ...pu, promotion: prom });
                            }
                        }
                    }
                }

                // Se houver promotionUsages explícitos, usamos o discountApplied deles como fonte de verdade
                if (promotionUsagesForOrder.length > 0) {
                    const promotionsAppliedDetailed = promotionUsagesForOrder.map((pu: any) => {
                        const prom = pu.promotion ?? promotionsById[pu.promotion_id];
                        const name = prom?.name ?? pu.promotion_id ?? "Promoção";
                        // construir um objeto no shape esperado pelo frontend (mantendo computed)
                        return {
                            id: prom?.id ?? pu.promotion_id,
                            name,
                            displays: prom?.displays ?? [],
                            coupons: prom?.coupons ?? [],
                            rawActions: prom?.actions ?? [],
                            computed: {
                                discountTotal: Number(pu.discountApplied ?? 0),
                                breakdown: { items: [], shippingDiscount: 0 },
                            },
                            rawUsage: pu,
                        };
                    });

                    const totalDiscount = Math.round(
                        promotionsAppliedDetailed.reduce((s, p) => s + (Number(p.computed?.discountTotal ?? 0)), 0) * 100
                    ) / 100;

                    return {
                        ...order,
                        promotionsApplied: promotionsAppliedDetailed,
                        promotionSummary: {
                            discountTotal: totalDiscount,
                            breakdown: promotionsAppliedDetailed.map((p) => ({
                                id: p.id,
                                name: p.name,
                                discountTotal: p.computed.discountTotal,
                                breakdown: p.computed.breakdown,
                            })),
                        },
                    };
                }

                // Fallback: comportamento antigo (recalcular a partir da definition da promoção)
                const promotionsForOrder: any[] = appliedPromsFromRelation.length > 0
                    ? appliedPromsFromRelation
                    : promotionIdsForOrder.map((id: string) => promotionsById[id]).filter(Boolean);

                let totalDiscount = 0;
                const promotionsAppliedDetailed: any[] = [];
                for (const prom of promotionsForOrder) {
                    try {
                        const computed = computePromotionDiscount(order, prom);
                        promotionsAppliedDetailed.push({
                            id: prom.id,
                            name: prom.name,
                            displays: prom.displays ?? [],
                            coupons: prom.coupons ?? [],
                            rawActions: prom.actions ?? [],
                            computed,
                        });
                        totalDiscount += computed.discountTotal;
                    } catch (err) {
                        promotionsAppliedDetailed.push({
                            id: prom.id,
                            name: prom.name,
                            displays: prom.displays ?? [],
                            coupons: prom.coupons ?? [],
                            rawActions: prom.actions ?? [],
                            computed: { discountTotal: 0, breakdown: { items: [], shippingDiscount: 0 } },
                        });
                    }
                }
                totalDiscount = Math.round(totalDiscount * 100) / 100;

                return {
                    ...order,
                    promotionsApplied: promotionsAppliedDetailed,
                    promotionSummary: {
                        discountTotal: totalDiscount,
                        breakdown: promotionsAppliedDetailed.map((p) => ({ id: p.id, name: p.name, discountTotal: p.computed.discountTotal, breakdown: p.computed.breakdown })),
                    },
                };
            })
        );

        const totalPages = Math.max(1, Math.ceil(total / per_page));

        return {
            data: enrichedOrders,
            meta: {
                total,
                page,
                per_page,
                total_pages: totalPages,
            },
        };
    }
}

export { CustomerOrderService };