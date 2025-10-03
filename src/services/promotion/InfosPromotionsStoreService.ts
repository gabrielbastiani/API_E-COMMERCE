import prismaClient from "../../prisma";

type ExecuteInput = {
    productId?: string;
    variantId?: string;
    variantSku?: string;
    variantIds?: string[];
};

type PromotionResult = {
    all: any[];
    productPromotions: any[];
    productMainPromotion?: any | null;
    variantPromotions: Record<string, any[]>;
    variantMainPromotions: Record<string, any | null>;
};

class InfosPromotionsStoreService {
    private tryParse(value: any) {
        if (value === undefined || value === null) return value;
        if (typeof value === "object") return value;
        if (typeof value === "string") {
            try {
                return JSON.parse(value);
            } catch {
                return value;
            }
        }
        return value;
    }

    private promotionAppliesToVariant(promo: any, vId?: string, vSku?: string) {
        if (!promo) return false;

        if (vId) {
            if (Array.isArray(promo.mainVariants) && promo.mainVariants.some((mv: any) => mv.id === vId)) return true;
            if (Array.isArray(promo.variantPromotions) && promo.variantPromotions.some((vp: any) => vp.id === vId)) return true;
        }
        if (vSku) {
            if (Array.isArray(promo.mainVariants) && promo.mainVariants.some((mv: any) => mv.sku === vSku)) return true;
            if (Array.isArray(promo.variantPromotions) && promo.variantPromotions.some((vp: any) => vp.sku === vSku)) return true;
        }

        if (Array.isArray(promo.conditions)) {
            for (const c of promo.conditions) {
                const v = this.tryParse(c.value ?? c.params ?? c);
                if (!v) continue;
                const candidateIds = Array.isArray(v.variantIds) ? v.variantIds : (v.variantIds ? [v.variantIds] : []);
                const candidateSkus = Array.isArray(v.skus) ? v.skus : (v.skus ? [v.skus] : []);
                if (vId && candidateIds.includes(vId)) return true;
                if (vSku && candidateSkus.includes(vSku)) return true;
                if (typeof v === "string") {
                    if (vId && v.includes(vId)) return true;
                    if (vSku && v.includes(vSku)) return true;
                }
            }
        }

        if (Array.isArray(promo.actions)) {
            for (const a of promo.actions) {
                const p = this.tryParse(a.params ?? a.value ?? a);
                if (!p) continue;
                const candidateIds = Array.isArray(p.variantIds) ? p.variantIds : (p.variantIds ? [p.variantIds] : []);
                const candidateSkus = Array.isArray(p.skus) ? p.skus : (p.skus ? [p.skus] : []);
                if (vId && candidateIds.includes(vId)) return true;
                if (vSku && candidateSkus.includes(vSku)) return true;
                if (typeof p === "string") {
                    if (vId && p.includes(vId)) return true;
                    if (vSku && p.includes(vSku)) return true;
                }
            }
        }

        return false;
    }

    private promotionAppliesToProduct(promo: any, productId?: string, productCategoryIds: string[] = []) {
        if (!promo) return false;

        if (productId) {
            if (Array.isArray(promo.products) && promo.products.some((p: any) => p.id === productId)) return true;
            if (Array.isArray(promo.featuredProducts) && promo.featuredProducts.some((p: any) => p.id === productId)) return true;
        }

        if (Array.isArray(promo.categories) && promo.categories.length && productCategoryIds.length) {
            const promoCatIds = promo.categories.map((c: any) => c.id);
            if (promoCatIds.some((id: string) => productCategoryIds.includes(id))) return true;
        }

        if (Array.isArray(promo.conditions)) {
            for (const c of promo.conditions) {
                const v = this.tryParse(c.value ?? c.params ?? c);
                if (!v) continue;
                const pIds = Array.isArray(v.productIds) ? v.productIds : (v.productIds ? [v.productIds] : []);
                if (productId && pIds.includes(productId)) return true;
                if (typeof v === "string" && productId && v.includes(productId)) return true;
            }
        }
        if (Array.isArray(promo.actions)) {
            for (const a of promo.actions) {
                const p = this.tryParse(a.params ?? a.value ?? a);
                if (!p) continue;
                const pIds = Array.isArray(p.productIds) ? p.productIds : (p.productIds ? [p.productIds] : []);
                if (productId && pIds.includes(productId)) return true;
                if (typeof p === "string" && productId && p.includes(productId)) return true;
            }
        }

        return false;
    }

    private normalizePromotion(p: any) {
        const safe = { ...p } as any;
        const arrFields = ["actions", "badges", "categories", "conditions", "coupons", "displays", "featuredProducts", "mainVariants", "products", "variantPromotions", "promotionUsage"];
        for (const k of arrFields) {
            if (!safe[k]) safe[k] = [];
            else if (typeof safe[k] === "string") {
                try { safe[k] = JSON.parse(safe[k]); } catch { /* leave as-is */ }
            }
        }
        return safe;
    }

    public async execute({ productId, variantId, variantSku, variantIds = [] }: ExecuteInput = {}): Promise<PromotionResult> {
        if (!productId && !variantId && !variantSku && (!variantIds || variantIds.length === 0)) {
            return { all: [], productPromotions: [], variantPromotions: {}, variantMainPromotions: {}, productMainPromotion: null };
        }

        // Carregar produto (se aplicável) com variantes e trazer PROMOÇÕES COMPLETAS
        const product = productId ? await prismaClient.product.findUnique({
            where: { id: productId },
            include: {
                variants: {
                    include: {
                        // aqui vamos incluir o mainPromotion completo com todas suas relações
                        mainPromotion: {
                            include: {
                                actions: true,
                                badges: true,
                                categories: true,
                                conditions: true,
                                coupons: true,
                                displays: true,
                                featuredProducts: true,
                                mainVariants: true,
                                products: true,
                                promotionUsage: true,
                                variantPromotions: true
                            }
                        }
                    }
                },
                categories: true,
                mainPromotion: {
                    include: {
                        actions: true,
                        badges: true,
                        categories: true,
                        conditions: true,
                        coupons: true,
                        displays: true,
                        featuredProducts: true,
                        mainVariants: true,
                        products: true,
                        promotionUsage: true,
                        variantPromotions: true
                    }
                },
                promotions: {
                    include: {
                        actions: true,
                        badges: true,
                        categories: true,
                        conditions: true,
                        coupons: true,
                        displays: true,
                        featuredProducts: true,
                        mainVariants: true,
                        products: true,
                        promotionUsage: true,
                        variantPromotions: true
                    }
                }
            }
        }) : null;

        const now = new Date();
        const productCategoryIds = Array.isArray(product?.categories) ? product!.categories.map((c: any) => c.category_id).filter(Boolean) : [];

        const visibleStatuses = ['Disponivel', 'Disponivel_programado'];

        const dateFilter = {
            OR: [
                { AND: [{ startDate: null }, { endDate: null }] },
                { AND: [{ startDate: { not: null, lte: now } }, { endDate: null }] },
                { AND: [{ startDate: null }, { endDate: { not: null, gte: now } }] },
                { AND: [{ startDate: { not: null, lte: now } }, { endDate: { not: null, gte: now } }] }
            ]
        };

        // Buscar todas promoções ativas com relações completas
        const promotions = await prismaClient.promotion.findMany({
            where: {
                AND: [
                    { status: { in: visibleStatuses as any } },
                    dateFilter
                ]
            },
            include: {
                actions: true,
                badges: true,
                categories: true,
                conditions: true,
                coupons: true,
                displays: true,
                featuredProducts: true,
                mainVariants: true,
                products: true,
                promotionUsage: true,
                variantPromotions: true
            },
            orderBy: [{ priority: 'desc' }, { created_at: 'desc' }]
        });

        const allFiltered: any[] = [];
        const productPromotions: any[] = [];
        const variantPromotionsMap: Record<string, any[]> = {};
        const variantMainMap: Record<string, any | null> = {};

        // build variantsToCheck
        const variantsToCheck = new Set<string>();
        if (variantId) variantsToCheck.add(variantId);
        if (variantIds && variantIds.length) variantIds.forEach(v => variantsToCheck.add(v));
        if (product?.variants && product.variants.length) product.variants.forEach((v: any) => variantsToCheck.add(v.id));

        // build sku map & init variantMainMap from loaded product.variants mainPromotion (if present)
        const variantSkuMap: Record<string, string | undefined> = {};
        if (product?.variants && product.variants.length) {
            for (const v of product.variants) {
                variantSkuMap[v.id] = v.sku;
                if (v.mainPromotion) {
                    variantMainMap[v.id] = this.normalizePromotion(v.mainPromotion);
                } else {
                    variantMainMap[v.id] = null;
                }
            }
        }

        const productMainPromotionSafe = product?.mainPromotion ? this.normalizePromotion(product.mainPromotion) : null;

        // Iterate promotions and test aplicabilidade
        for (const rawPromo of promotions) {
            const promo = this.normalizePromotion(rawPromo);

            if (promo.is_processing || promo.is_completed) continue;

            allFiltered.push(promo);

            const appliesProd = productId ? this.promotionAppliesToProduct(promo, productId, productCategoryIds) : false;
            if (appliesProd) productPromotions.push(promo);

            for (const vId of Array.from(variantsToCheck)) {
                const vSkuLocal = variantSkuMap[vId] ?? undefined;
                if (this.promotionAppliesToVariant(promo, vId, vSkuLocal)) {
                    variantPromotionsMap[vId] = variantPromotionsMap[vId] || [];
                    variantPromotionsMap[vId].push(promo);
                }
            }
        }

        // dedup helper
        const dedup = (arr: any[]) => Array.from(new Map((arr || []).map((p: any) => [p.id, p])).values());

        Object.keys(variantPromotionsMap).forEach(k => {
            variantPromotionsMap[k] = dedup(variantPromotionsMap[k]);
        });

        const allDeduped = dedup(allFiltered);
        const productPromotionsDeduped = dedup(productPromotions);

        // --- ENRICH variantMainMap: if we had a minimal object, try to find full object by id in variantPromotionsMap or allDeduped
        for (const vId of Array.from(variantsToCheck)) {
            const current = variantMainMap[vId];
            // if current already useful (has displays/actions/badges or id+content) keep it
            const isUseful = (obj: any) => obj && (obj.id || (Array.isArray(obj.displays) && obj.displays.length) || (Array.isArray(obj.actions) && obj.actions.length) || (Array.isArray(obj.badges) && obj.badges.length));
            if (isUseful(current)) continue;

            const candidates = variantPromotionsMap[vId] || [];

            // first try: find a promotion in candidates whose mainVariants includes this vId (explicit declaration)
            let mainCandidate = candidates.find((p: any) =>
                Array.isArray(p.mainVariants) && p.mainVariants.some((mv: any) => (mv && (mv.id === vId || mv.sku === variantSkuMap[vId])))
            );

            // second: find in allDeduped
            if (!mainCandidate && allDeduped && allDeduped.length) {
                mainCandidate = allDeduped.find((p: any) =>
                    Array.isArray(p.mainVariants) && p.mainVariants.some((mv: any) => (mv && (mv.id === vId || mv.sku === variantSkuMap[vId])))
                );
            }

            // fallback: pick first candidate that looks useful
            if (!mainCandidate && candidates.length > 0) {
                mainCandidate = candidates.find(c => isUseful(c)) ?? candidates[0];
            }

            // assign normalized or keep null
            if (mainCandidate) {
                variantMainMap[vId] = mainCandidate;
            } else {
                variantMainMap[vId] = variantMainMap[vId] ?? null;
            }
        }

        const ret: PromotionResult = {
            all: allDeduped,
            productPromotions: productPromotionsDeduped,
            productMainPromotion: productMainPromotionSafe ?? null,
            variantPromotions: variantPromotionsMap,
            variantMainPromotions: variantMainMap
        };

        return ret;
    }
}

export { InfosPromotionsStoreService };
export type { PromotionResult, ExecuteInput };