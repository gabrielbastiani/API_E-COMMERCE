import prismaClient from "../../prisma";

type ExecuteInput = {
    productId?: string;
    variantId?: string;
    variantSku?: string;
    variantIds?: string[];
};

type PromotionResult = {
    all: any[]; // todas as promoções candidatas filtradas por data/status
    productPromotions: any[]; // promoções aplicáveis ao produto (por relação/conditions/actions)
    productMainPromotion?: any | null; // mainPromotion diretamente vinculada ao produto (se existir)
    variantPromotions: Record<string, any[]>; // map variantId -> promos
    variantMainPromotions: Record<string, any | null>; // variantId -> mainPromotion (se houver)
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

    // Detecta se uma promoção aplica-se a uma variante (checa relações e inspeciona conditions/actions)
    private promotionAppliesToVariant(promo: any, vId?: string, vSku?: string) {
        if (!promo) return false;

        // Relações diretas
        if (vId) {
            if (Array.isArray(promo.mainVariants) && promo.mainVariants.some((mv: any) => mv.id === vId)) return true;
            if (Array.isArray(promo.variantPromotions) && promo.variantPromotions.some((vp: any) => vp.id === vId)) return true;
        }
        if (vSku) {
            if (Array.isArray(promo.mainVariants) && promo.mainVariants.some((mv: any) => mv.sku === vSku)) return true;
            if (Array.isArray(promo.variantPromotions) && promo.variantPromotions.some((vp: any) => vp.sku === vSku)) return true;
        }

        // Inspect conditions (JSON)
        if (Array.isArray(promo.conditions)) {
            for (const c of promo.conditions) {
                const v = this.tryParse(c.value ?? c.params ?? c);
                if (!v) continue;
                const candidateIds = Array.isArray(v.variantIds) ? v.variantIds : (v.variantIds ? [v.variantIds] : []);
                const candidateSkus = Array.isArray(v.skus) ? v.skus : (v.skus ? [v.skus] : []);
                if (vId && candidateIds.includes(vId)) return true;
                if (vSku && candidateSkus.includes(vSku)) return true;
                // also check if raw string contains id/sku (fallback)
                if (typeof v === "string") {
                    if (vId && v.includes(vId)) return true;
                    if (vSku && v.includes(vSku)) return true;
                }
            }
        }

        // Inspect actions.params
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

    // Detecta se uma promoção aplica-se a um produto
    private promotionAppliesToProduct(promo: any, productId?: string, productCategoryIds: string[] = []) {
        if (!promo) return false;

        if (productId) {
            if (Array.isArray(promo.products) && promo.products.some((p: any) => p.id === productId)) return true;
            if (Array.isArray(promo.featuredProducts) && promo.featuredProducts.some((p: any) => p.id === productId)) return true;
        }

        // categories relation
        if (Array.isArray(promo.categories) && promo.categories.length && productCategoryIds.length) {
            const promoCatIds = promo.categories.map((c: any) => c.id);
            if (promoCatIds.some((id: string) => productCategoryIds.includes(id))) return true;
        }

        // conditions and actions referencing productIds
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

    // Normalize: garante arrays/objetos seguros no retorno (evita strings JSON cru)
    private normalizePromotion(p: any) {
        const safe = { ...p } as any;
        const arrFields = ["actions", "badges", "categories", "conditions", "coupons", "displays", "featuredProducts", "mainVariants", "products", "variantPromotions"];
        for (const k of arrFields) {
            if (!safe[k]) safe[k] = [];
            else if (typeof safe[k] === "string") {
                try { safe[k] = JSON.parse(safe[k]); } catch { /* leave as-is if not parseable */ }
            }
        }
        return safe;
    }

    public async execute({ productId, variantId, variantSku, variantIds = [] }: ExecuteInput = {}): Promise<PromotionResult> {
        if (!productId && !variantId && !variantSku && (!variantIds || variantIds.length === 0)) {
            return { all: [], productPromotions: [], variantPromotions: {}, variantMainPromotions: {}, productMainPromotion: null };
        }

        // Carregar produto (se aplicável) com variantes e mainPromotion
        const product = productId ? await prismaClient.product.findUnique({
            where: { id: productId },
            include: {
                variants: { include: { mainPromotion: true } },
                categories: true,
                mainPromotion: true
            }
        }) : null;

        const now = new Date();
        const productCategoryIds = Array.isArray(product?.categories) ? product!.categories.map((c: any) => c.category_id).filter(Boolean) : [];

        // Buscar todas promoções ativas (status e datas) -> vamos filtrar em código
        const visibleStatuses = ['Disponivel', 'Disponivel_programado'];

        // montagem where para datas: promoção sem datas OR que envolvem 'now' (start<=now<=end or start<=now and end null or end>=now and start null)
        const dateFilter = {
            OR: [
                { AND: [{ startDate: null }, { endDate: null }] },
                { AND: [{ startDate: { not: null, lte: now } }, { endDate: null }] },
                { AND: [{ startDate: null }, { endDate: { not: null, gte: now } }] },
                { AND: [{ startDate: { not: null, lte: now } }, { endDate: { not: null, gte: now } }] }
            ]
        };

        // Query: todas promoções com status visível e janela de tempo OK
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

        // collect variant IDs to check: passed variant(s) + product variants
        const variantsToCheck = new Set<string>();
        if (variantId) variantsToCheck.add(variantId);
        if (variantIds && variantIds.length) variantIds.forEach(v => variantsToCheck.add(v));
        if (product?.variants && product.variants.length) product.variants.forEach((v: any) => variantsToCheck.add(v.id));

        // Prepare variant SKU map for product variants
        const variantSkuMap: Record<string, string | undefined> = {};
        if (product?.variants && product.variants.length) {
            for (const v of product.variants) {
                variantSkuMap[v.id] = v.sku;
                // if variant has mainPromotion include in map
                if (v.mainPromotion) {
                    variantMainMap[v.id] = this.normalizePromotion(v.mainPromotion);
                } else {
                    variantMainMap[v.id] = null;
                }
            }
        }

        // Product main promotion (if product.mainPromotion exists)
        const productMainPromotionSafe = product?.mainPromotion ? this.normalizePromotion(product.mainPromotion) : null;

        // Iterate promotions and test aplicabilidade
        for (const rawPromo of promotions) {
            const promo = this.normalizePromotion(rawPromo);

            // Skip promos that are processing/completed
            if (promo.is_processing || promo.is_completed) continue;

            // Add to allFiltered (we'll only surface those that actually relate to product/variant later)
            allFiltered.push(promo);

            // Check product-level applicability
            const appliesProd = productId ? this.promotionAppliesToProduct(promo, productId, productCategoryIds) : false;
            if (appliesProd) productPromotions.push(promo);

            // Check variant-level applicability
            for (const vId of Array.from(variantsToCheck)) {
                const vSkuLocal = variantSkuMap[vId] ?? undefined;
                if (this.promotionAppliesToVariant(promo, vId, vSkuLocal)) {
                    variantPromotionsMap[vId] = variantPromotionsMap[vId] || [];
                    variantPromotionsMap[vId].push(promo);
                }
            }
        }

        // Deduplicate arrays by id
        const dedup = (arr: any[]) => Array.from(new Map((arr || []).map((p: any) => [p.id, p])).values());

        Object.keys(variantPromotionsMap).forEach(k => {
            variantPromotionsMap[k] = dedup(variantPromotionsMap[k]);
        });

        const ret: PromotionResult = {
            all: dedup(allFiltered),
            productPromotions: dedup(productPromotions),
            productMainPromotion: productMainPromotionSafe ?? null,
            variantPromotions: variantPromotionsMap,
            variantMainPromotions: variantMainMap
        };

        return ret;
    }
}

export { InfosPromotionsStoreService };
export type { PromotionResult, ExecuteInput };