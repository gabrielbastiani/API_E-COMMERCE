import prisma from "../../../prisma";

export type ProductListOptions = {
    page?: number;
    perPage?: number;
    q?: string;
    brand?: string;
    minPrice?: number;
    maxPrice?: number;
    sort?: "maisVendidos" | "nomeAsc" | "nomeDesc" | "menor" | "maior" | "maiorDesconto";
    filters?: Record<string, string[]>;
};

function normalizeKeys(raw: any): string[] {
    if (!raw) return [];
    if (Array.isArray(raw)) return raw.map(String);
    if (typeof raw === "string") {
        try {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) return parsed.map(String);
        } catch { /* ignore */ }
        return raw.split(",").map(s => s.trim()).filter(Boolean);
    }
    return [];
}

/** Busca categoria por slug */
export async function getCategoryBySlug(slug: string) {
    return prisma.category.findFirst({ where: { slug } });
}

/** Retorna SKUs das variantes (útil para endpoint/fallback) */
export async function getSkusForCategory(slug: string) {
    const values = await prisma.productVariant.findMany({
        where: { product: { categories: { some: { category: { slug } } } }, sku: { not: undefined } },
        distinct: ['sku'],
        select: { sku: true },
        orderBy: { sku: 'asc' },
        take: 5000
    });

    return values.map((v: any) => String(v.sku));
}

/** popula opções de filtro automaticamente, com base no fieldName e na categoria. */
export async function populateFilterOptionsForCategory(filter: any, slug: string) {
    const result: any = { options: [], minValue: null, maxValue: null, reviewSummary: null };

    const field = (filter.fieldName ?? "").trim();

    // 1) variantAttribute (com attributeKeys)
    if (field.startsWith("variantAttribute")) {
        let keys: string[] = [];
        if (filter.attributeKeys) keys = normalizeKeys(filter.attributeKeys);
        else if (field.includes(":")) keys = [field.split(":")[1]];
        else if (filter.name) keys = [filter.name];

        if (!keys || keys.length === 0) return result;

        const values = await prisma.variantAttribute.findMany({
            where: {
                key: { in: keys },
                variant: { product: { categories: { some: { category: { slug } } } } }
            },
            distinct: ["value"],
            select: { value: true },
            orderBy: { value: "asc" as const },
            take: 2000
        });

        const options = await Promise.all(values.map(async (v: any) => {
            const val = v.value == null ? "" : String(v.value);

            const attrImage = await prisma.variantAttributeImage.findFirst({
                where: {
                    variantAttribute: {
                        key: { in: keys },
                        value: val
                    }
                },
                orderBy: [{ isPrimary: 'desc' }, { created_at: 'asc' }],
                select: { url: true, altText: true }
            });

            const variantImage = !attrImage ? await prisma.productVariantImage.findFirst({
                where: {
                    productVariant: {
                        variantAttribute: {
                            some: {
                                key: { in: keys },
                                value: val
                            }
                        },
                        product: {
                            categories: {
                                some: { category: { slug } }
                            }
                        }
                    }
                },
                orderBy: [{ isPrimary: 'desc' }, { created_at: 'asc' }],
                select: { url: true, altText: true }
            }) : null;

            const image = attrImage ?? variantImage ?? null;

            return {
                id: val,
                label: val,
                value: val,
                image: image ? { url: image.url, altText: image.altText ?? null } : null
            };
        }));

        result.options = options.filter((x: any) => x.value !== "");
        return result;
    }

    // 2) productCharacteristic (NOVO)
    if (field.startsWith("productCharacteristic")) {
        let keys: string[] = [];
        if (filter.attributeKeys) keys = normalizeKeys(filter.attributeKeys);
        else if (field.includes(":")) keys = [field.split(":")[1]];
        else if (filter.name) keys = [filter.name];

        if (!keys || keys.length === 0) return result;

        // buscar valores distintos na tabela productCharacteristics
        const values = await prisma.productCharacteristics.findMany({
            where: {
                key: { in: keys },
                product: { categories: { some: { category: { slug } } } }
            },
            distinct: ["value"],
            select: { value: true, image: true },
            orderBy: { value: "asc" as const },
            take: 2000
        });

        const options = values.map((v: any) => {
            const val = v.value == null ? "" : String(v.value);
            return {
                id: val,
                label: val,
                value: val,
                image: v.image ? { url: v.image, altText: null } : null
            };
        });

        result.options = options.filter((x: any) => x.value !== "");
        return result;
    }

    // 3) brand
    if (field === "brand" || field.toLowerCase() === "marca") {
        const values = await prisma.product.findMany({
            where: { categories: { some: { category: { slug } } }, NOT: { brand: null } },
            distinct: ["brand"],
            select: { brand: true },
            orderBy: { brand: "asc" as const }
        });
        result.options = values.filter(v => v.brand).map((v: any) => ({ id: String(v.brand), label: String(v.brand), value: String(v.brand) }));
        return result;
    }

    // 4) price_per / price_of
    if (field === "price_per" || field === "price_of") {
        const agg = await prisma.product.aggregate({
            where: { categories: { some: { category: { slug } } } },
            _min: { price_per: true, price_of: true },
            _max: { price_per: true, price_of: true }
        });
        result.minValue = field === "price_per" ? (agg._min.price_per ?? 0) : (agg._min.price_of ?? 0);
        result.maxValue = field === "price_per" ? (agg._max.price_per ?? 0) : (agg._max.price_of ?? 0);
        return result;
    }

    // 5) variant.sku / sku
    if (field === "variant.sku" || field === "variant_sku" || field === "sku") {
        const values = await prisma.productVariant.findMany({
            where: { product: { categories: { some: { category: { slug } } } }, sku: { not: undefined } },
            distinct: ["sku"],
            select: { sku: true },
            orderBy: { sku: "asc" as const },
            take: 2000
        });

        result.options = values.map((v: any) => ({ id: String(v.sku), label: String(v.sku), value: String(v.sku) }));
        return result;
    }

    // 6) category (categorias associadas aos produtos desta categoria)
    if (field === "category") {
        const products = await prisma.product.findMany({
            where: { categories: { some: { category: { slug } } } },
            include: { categories: { include: { category: true } } },
            take: 2000
        });
        const map = new Map<string, string>();
        for (const p of products) {
            for (const pc of p.categories ?? []) {
                if (pc.category) map.set(pc.category.id, pc.category.name);
            }
        }
        result.options = Array.from(map.entries()).map(([id, name]) => ({ id, label: name, value: id }));
        return result;
    }

    // 7) fallback para campos simples (skuMaster, ean, name)
    if (["skuMaster", "sku", "ean", "name"].includes(field)) {
        const values = await prisma.product.findMany({
            where: { categories: { some: { category: { slug } } }, NOT: { [field]: null } },
            distinct: [field as any],
            select: { [field]: true },
            orderBy: { [field]: "asc" as const },
            take: 2000
        });
        result.options = values.map((v: any) => {
            const val = v[field];
            return { id: String(val), label: String(val), value: String(val) };
        });
        return result;
    }

    // 8) rating / reviews
    if (field === "rating" || field.toLowerCase() === "rating" || field.toLowerCase() === "avaliacao") {
        try {
            const reviews = await prisma.review.findMany({
                where: { product: { categories: { some: { category: { slug } } } } },
                select: { product_id: true, rating: true }
            });

            const mapAvg = new Map<string, { sum: number, count: number }>();
            for (const r of reviews) {
                const pid = String((r as any).product_id ?? (r as any).productId ?? '');
                const rt = Number((r as any).rating ?? 0);
                const cur = mapAvg.get(pid) ?? { sum: 0, count: 0 };
                cur.sum += rt;
                cur.count += 1;
                mapAvg.set(pid, cur);
            }

            let sum = 0, cnt = 0;
            for (const [, v] of mapAvg) {
                sum += v.sum;
                cnt += v.count;
            }
            const avg = cnt ? (sum / cnt) : 0;
            const counts = reviews.reduce((acc: Record<string, number>, r: any) => {
                const k = String(r.rating ?? 0);
                acc[k] = (acc[k] ?? 0) + 1;
                return acc;
            }, {});
            result.reviewSummary = { avgRating: avg, countsByRating: counts };
        } catch (err) {
            console.warn('rating populate error', err);
        }
        return result;
    }

    // não reconhecido -> vazio
    return result;
}

/**
 * Retorna filtros configurados para a categoria.
 * Busca associações via categoryFilter (tabela de ligação).
 */
export async function getFiltersForCategory(slug: string) {
    const category = await prisma.category.findFirst({ where: { slug }, select: { id: true } });
    if (!category) return [];

    const catFilters = await prisma.categoryFilter.findMany({
        where: { category_id: category.id },
        include: { filter: { include: { group: true } } }
    });

    const rawFilters: any[] = catFilters.map(cf => cf.filter).filter(Boolean);

    const groupsMap = new Map<string, { group: any | null, filters: any[] }>();
    for (const f of rawFilters) {
        const group = f.group ? { id: f.group.id, name: f.group.name } : null;
        const key = group ? group.id : 'ungrouped';
        if (!groupsMap.has(key)) groupsMap.set(key, { group, filters: [] });

        const options = (f.options ?? []).map((o: any) => ({
            id: o.id,
            label: o.label,
            value: o.value,
            order: o.order,
            image: o.image ?? null
        }));

        groupsMap.get(key)!.filters.push({
            id: f.id,
            name: f.name,
            fieldName: f.fieldName,
            type: f.type,
            dataType: f.dataType,
            displayStyle: f.displayStyle,
            isActive: f.isActive,
            order: f.order,
            autoPopulate: f.autoPopulate,
            minValue: f.minValue,
            maxValue: f.maxValue,
            options,
            attributeKeys: f.attributeKeys ?? null
        });
    }

    const groupsResult: any[] = [];
    for (const [, groupEntry] of groupsMap) {
        const filtersFilled: any[] = [];
        for (const fl of groupEntry.filters) {
            const needPopulate = fl.autoPopulate === true || !fl.options || fl.options.length === 0;
            if (needPopulate) {
                try {
                    const populated = await populateFilterOptionsForCategory(fl, slug);
                    if ((!fl.options || fl.options.length === 0) && populated.options && populated.options.length > 0) {
                        fl.options = populated.options;
                    }
                    if ((fl.minValue === null || fl.minValue === undefined) && populated.minValue !== null) fl.minValue = populated.minValue;
                    if ((fl.maxValue === null || fl.maxValue === undefined) && populated.maxValue !== null) fl.maxValue = populated.maxValue;
                    if (populated.reviewSummary) fl.reviewSummary = populated.reviewSummary;
                } catch (err) {
                    console.error('populate filter error for', fl.id, err);
                }
            }
            filtersFilled.push(fl);
        }
        groupsResult.push({
            group: groupEntry.group,
            filters: filtersFilled.sort((a: any, b: any) => (a.order ?? 0) - (b.order ?? 0))
        });
    }

    return groupsResult;
}

/**
 * Retorna produtos pela category.slug com paginação, ordenação e filtros.
 * Inclui productCharacteristics no payload (útil para CMS fallback).
 */
export async function getProductsByCategorySlug(slug: string, opts: ProductListOptions = {}) {
    const page = opts.page && opts.page > 0 ? opts.page : 1;
    const perPage = opts.perPage && opts.perPage > 0 ? opts.perPage : 12;
    const skip = (page - 1) * perPage;

    const where: any = {
        status: 'DISPONIVEL',
        categories: { some: { category: { slug } } }
    };

    if (opts.q) {
        const q = opts.q;
        where.AND = where.AND ?? [];
        where.AND.push({
            OR: [
                { name: { contains: q, mode: 'insensitive' } },
                { description: { contains: q, mode: 'insensitive' } }
            ]
        });
    }

    if (opts.brand) where.brand = opts.brand;

    if (typeof opts.minPrice === 'number' || typeof opts.maxPrice === 'number') {
        if (typeof opts.minPrice === 'number' && typeof opts.maxPrice === 'number') {
            where.price_per = { gte: opts.minPrice, lte: opts.maxPrice };
        } else if (typeof opts.minPrice === 'number') {
            where.price_per = { gte: opts.minPrice };
        } else if (typeof opts.maxPrice === 'number') {
            where.price_per = { lte: opts.maxPrice };
        }
    }

    // apply filters (by filter id)
    if (opts.filters && Object.keys(opts.filters).length > 0) {
        const filterIds = Object.keys(opts.filters);
        const dbFilters = await prisma.filter.findMany({ where: { id: { in: filterIds } } });

        where.AND = where.AND ?? [];

        for (const dbf of dbFilters) {
            const selectedValues = opts.filters![dbf.id] ?? [];
            if (!selectedValues || selectedValues.length === 0) continue;

            const field = (dbf.fieldName ?? "").trim();

            // variantAttribute
            if (field.startsWith("variantAttribute")) {
                const keys = dbf.attributeKeys ? normalizeKeys(dbf.attributeKeys) : (field.includes(":") ? [field.split(":")[1]] : (dbf.name ? [dbf.name] : []));
                if (keys.length === 0) continue;

                where.AND.push({
                    variants: {
                        some: {
                            variantAttribute: {
                                some: {
                                    key: { in: keys },
                                    value: { in: selectedValues }
                                }
                            }
                        }
                    }
                });
                continue;
            }

            // productCharacteristic (NOVO)
            if (field.startsWith("productCharacteristic")) {
                const keys = dbf.attributeKeys ? normalizeKeys(dbf.attributeKeys) : (field.includes(":") ? [field.split(":")[1]] : (dbf.name ? [dbf.name] : []));
                if (keys.length === 0) continue;

                where.AND.push({
                    productCharacteristics: {
                        some: {
                            key: { in: keys },
                            value: { in: selectedValues }
                        }
                    }
                });
                continue;
            }

            // brand
            if (field === "brand") {
                where.AND.push({ brand: { in: selectedValues } });
                continue;
            }

            // price range
            if (field === "price_per" || field === "price_of") {
                const nums = selectedValues.map(Number).filter(n => !Number.isNaN(n));
                if (nums.length >= 2) {
                    const [min, max] = [Math.min(...nums), Math.max(...nums)];
                    where.AND.push({ price_per: { gte: min, lte: max } });
                } else if (nums.length === 1) {
                    where.AND.push({ price_per: { gte: nums[0] } });
                }
                continue;
            }

            // variant.sku
            if (field === "variant.sku" || field === "variant_sku" || field === "sku") {
                where.AND.push({ variants: { some: { sku: { in: selectedValues } } } });
                continue;
            }

            // rating -> filtrar por produtos com avg rating no range
            if (field === "rating") {
                const nums = selectedValues.map(Number).filter(n => !isNaN(n));
                if (nums.length === 0) continue;
                const min = Math.min(...nums), max = Math.max(...nums);

                const reviews = await prisma.review.findMany({
                    where: { product: { categories: { some: { category: { slug } } } } },
                    select: { product_id: true, rating: true }
                });

                const mapAvg = new Map<string, { sum: number, count: number }>();
                for (const r of reviews) {
                    const pid = String((r as any).product_id ?? (r as any).productId ?? '');
                    const rt = Number((r as any).rating ?? 0);
                    const cur = mapAvg.get(pid) ?? { sum: 0, count: 0 };
                    cur.sum += rt;
                    cur.count += 1;
                    mapAvg.set(pid, cur);
                }

                const matchedIds = Array.from(mapAvg.entries())
                    .filter(([, v]) => {
                        const avg = v.count ? v.sum / v.count : 0;
                        return avg >= min && avg <= max;
                    })
                    .map(([pid]) => pid);

                if (matchedIds.length === 0) {
                    where.AND.push({ id: { in: ['__no_match__'] } });
                } else {
                    where.AND.push({ id: { in: matchedIds } });
                }
                continue;
            }

            // category by id
            if (field === "category") {
                where.AND.push({ categories: { some: { category: { id: { in: selectedValues } } } } });
                continue;
            }

            // fallback: product field in (ex: skuMaster, ean, name)
            where.AND.push({ [field]: { in: selectedValues } });
        }
    }

    // orderBy
    let orderBy: any = undefined;
    if (opts.sort === 'maisVendidos') orderBy = { view: 'desc' };
    else if (opts.sort === 'nomeAsc') orderBy = { name: 'asc' };
    else if (opts.sort === 'nomeDesc') orderBy = { name: 'desc' };
    else if (opts.sort === 'menor') orderBy = { price_per: 'desc' };
    else if (opts.sort === 'maior') orderBy = { price_per: 'asc' };

    const total = await prisma.product.count({ where });

    const products = await prisma.product.findMany({
        where,
        include: {
            images: { orderBy: [{ isPrimary: 'desc' }, { created_at: 'asc' }] },
            variants: {
                include: {
                    variantAttribute: true,
                    productVariantImage: { orderBy: [{ isPrimary: 'desc' }, { created_at: 'asc' }] }
                }
            },
            categories: { include: { category: true } },
            productCharacteristics: true,
            mainPromotion: {
                include: {
                    actions: true,
                    badges: true,
                    categories: true,
                    conditions: true,
                    coupons: true,
                    displays: true,
                    variantPromotions: {
                        include: {
                            mainPromotion: {
                                include: {
                                    actions: true,
                    badges: true,
                    categories: true,
                    conditions: true,
                    coupons: true,
                    displays: true,
                                }
                            }
                        }
                    },

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
                }
            }
        },
        orderBy: orderBy ? orderBy : undefined,
        skip,
        take: perPage
    });

    let sortedProducts = products;
    if ((opts.sort as any) === 'maiorDesconto') {
        sortedProducts = products.sort((a: any, b: any) => {
            const aDiff = (a.price_of ?? a.price_per) - a.price_per;
            const bDiff = (b.price_of ?? b.price_per) - b.price_per;
            return bDiff - aDiff;
        });
    }

    const formatted = sortedProducts.map((p: any) => {
        const primaryImage = p.images && p.images.length > 0 ? p.images[0].url : null;
        return {
            id: p.id,
            name: p.name,
            slug: p.slug,
            brand: p.brand,
            price_per: p.price_per,
            price_of: p.price_of ?? null,
            stock: p.stock,
            images: p.images.map((img: any) => ({ url: img.url, altText: img.altText, isPrimary: img.isPrimary })),
            primaryImage,
            view: p.view,
            categories: p.categories.map((pc: any) => ({ id: pc.category.id, name: pc.category.name, slug: pc.category.slug })),
            variants: p.variants.map((v: any) => ({
                id: v.id,
                sku: v.sku,
                price_per: v.price_per,
                price_of: v.price_of,
                stock: v.stock,
                attributes: (v.variantAttribute ?? []).map((a: any) => ({ key: a.key, value: a.value })),
                images: v.productVariantImage?.map((iv: any) => ({ url: iv.url, altText: iv.altText, isPrimary: iv.isPrimary }))
            })),
            productCharacteristics: (p.productCharacteristics ?? []).map((pc: any) => ({ key: pc.key, value: pc.value, image: pc.image ?? null }))
        };
    });

    return { total, page, perPage, products: formatted };
}

export async function detectAttributeKeysForCategories(
    categoryIdsOrSlugs: string[] = [],
    opts: { source?: 'variant' | 'productCharacteristic' | 'both' } = { source: 'both' }
) {
    if (!categoryIdsOrSlugs || categoryIdsOrSlugs.length === 0) return { keys: [] };

    const source = opts.source ?? 'both';

    let categoryIds: string[] = [];
    let categorySlugs: string[] = [];

    const maybeIds = categoryIdsOrSlugs.filter(x => typeof x === 'string' && x.includes('-') && x.length > 8);
    if (maybeIds.length === categoryIdsOrSlugs.length) {
        categoryIds = maybeIds;
    } else {
        categorySlugs = categoryIdsOrSlugs;
    }

    if (categoryIds.length > 0) {
        const cats = await prisma.category.findMany({ where: { id: { in: categoryIds } }, select: { slug: true } });
        categorySlugs = cats.map(c => c.slug).filter(Boolean);
    }

    // maps para coletar amostras
    const variantMap = new Map<string, Set<string>>();
    const pcMap = new Map<string, Set<string>>();

    // buscar variant attributes apenas se source !== 'productCharacteristic'
    if (source === 'variant' || source === 'both') {
        const variantKeysRaw = await prisma.variantAttribute.findMany({
            where: {
                variant: { product: { categories: { some: { category: { slug: { in: categorySlugs } } } } } }
            },
            distinct: ["key", "value"],
            select: { key: true, value: true },
            take: 5000
        });

        for (const v of variantKeysRaw) {
            if (!v.key) continue;
            if (!variantMap.has(v.key)) variantMap.set(v.key, new Set());
            if (v.value !== undefined && v.value !== null) variantMap.get(v.key)!.add(String(v.value));
        }
    }

    // buscar productCharacteristics apenas se source !== 'variant'
    if (source === 'productCharacteristic' || source === 'both') {
        const pcRaw = await prisma.productCharacteristics.findMany({
            where: {
                product: { categories: { some: { category: { slug: { in: categorySlugs } } } } }
            },
            distinct: ["key", "value"],
            select: { key: true, value: true },
            take: 5000
        });

        for (const p of pcRaw) {
            if (!p.key) continue;
            if (!pcMap.has(p.key)) pcMap.set(p.key, new Set());
            if (p.value !== undefined && p.value !== null) pcMap.get(p.key)!.add(String(p.value));
        }
    }

    // combine keys depending on source
    const combinedKeys = new Map<string, Set<string>>();
    if (source === 'variant' || source === 'both') {
        for (const [k, s] of variantMap) {
            if (!combinedKeys.has(k)) combinedKeys.set(k, new Set());
            for (const v of s) combinedKeys.get(k)!.add(v);
        }
    }
    if (source === 'productCharacteristic' || source === 'both') {
        for (const [k, s] of pcMap) {
            if (!combinedKeys.has(k)) combinedKeys.set(k, new Set());
            for (const v of s) combinedKeys.get(k)!.add(v);
        }
    }

    const keys = Array.from(combinedKeys.entries()).map(([key, set]) => ({ key, samples: Array.from(set).slice(0, 10) }));

    return { keys };
}