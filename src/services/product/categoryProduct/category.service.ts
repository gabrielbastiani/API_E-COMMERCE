import prisma from "../../../prisma"

export type ProductListOptions = {
    page?: number
    perPage?: number
    q?: string
    brand?: string
    minPrice?: number
    maxPrice?: number
    sort?: 'maisVendidos' | 'nomeAsc' | 'nomeDesc' | 'menor' | 'maior' | 'maiorDesconto'
    filters?: Record<string, string[]>
}

/** Busca categoria por slug */
export async function getCategoryBySlug(slug: string) {
    return prisma.category.findFirst({
        where: { slug },
    })
}

/**
 * Helper: popula opções de filtro automaticamente, com base no fieldName e na categoria.
 * Retorna { options?: Array<{ id,label,value }>, minValue?, maxValue? }
 */
async function populateFilterOptionsForCategory(filter: any, slug: string) {
    const result: any = { options: [], minValue: null, maxValue: null }

    // fieldName pode ter formas:
    // - "variantAttribute" (usa filter.name como chave)
    // - "variantAttribute:Cor" (usa chave a seguir ao :)
    // - "brand"
    // - "price_per"
    // - "price_of"
    // - "variant.sku"
    // - "category"
    // - outros -> fallback sem opções

    const field = (filter.fieldName ?? '').trim()

    // variantAttribute (key either in filter.name or after colon)
    if (field.startsWith('variantAttribute')) {
        // determine attribute key
        let keyName: string | null = null
        if (field.includes(':')) keyName = field.split(':')[1]
        else if (filter.name) keyName = filter.name
        if (!keyName) return result

        // find distinct values of variantAttribute.value for that key within products of the category
        const values = await prisma.variantAttribute.findMany({
            where: {
                key: keyName,
                variant: {
                    product: {
                        categories: {
                            some: {
                                category: { slug },
                            },
                        },
                    },
                },
            },
            distinct: ['value'],
            select: { value: true },
            orderBy: { value: 'asc' },
        })

        result.options = values.map((v: any) => ({ id: String(v.value), label: String(v.value), value: String(v.value) }))
        return result
    }

    // brand
    if (field === 'brand' || field.toLowerCase() === 'marca') {
        const values = await prisma.product.findMany({
            where: {
                categories: { some: { category: { slug } } },
                NOT: { brand: null },
            },
            distinct: ['brand'],
            select: { brand: true },
            orderBy: { brand: 'asc' as const },
        })
        result.options = values.filter(v => v.brand).map((v: any) => ({ id: String(v.brand), label: String(v.brand), value: String(v.brand) }))
        return result
    }

    // price_per or price_of -> compute min/max across products in category
    if (field === 'price_per' || field === 'price_of') {
        const agg = await prisma.product.aggregate({
            where: { categories: { some: { category: { slug } } } },
            _min: { price_per: true, price_of: true },
            _max: { price_per: true, price_of: true },
        })
        result.minValue = field === 'price_per' ? (agg._min.price_per ?? 0) : (agg._min.price_of ?? 0)
        result.maxValue = field === 'price_per' ? (agg._max.price_per ?? 0) : (agg._max.price_of ?? 0)
        return result
    }

    // variant.sku
    if (field === 'variant.sku' || field === 'variant_sku') {
        const values = await prisma.productVariant.findMany({
            where: {
                product: { categories: { some: { category: { slug } } } },
            },
            distinct: ['sku'],
            select: { sku: true },
            orderBy: { sku: 'asc' as const },
        })
        result.options = values.map((v: any) => ({ id: v.sku, label: v.sku, value: v.sku }))
        return result
    }

    // category -> categorias relacionadas dos produtos dentro dessa categoria
    if (field === 'category') {
        // pegar todas categorias associadas aos produtos dessa categoria (p.ex. subcategorias)
        const products = await prisma.product.findMany({
            where: { categories: { some: { category: { slug } } } },
            include: { categories: { include: { category: true } } },
            take: 1000,
        })
        const map = new Map<string, string>()
        for (const p of products) {
            for (const pc of p.categories ?? []) {
                if (pc.category) map.set(pc.category.id, pc.category.name)
            }
        }
        result.options = Array.from(map.entries()).map(([id, name]) => ({ id, label: name, value: id }))
        return result
    }

    // fallback: tentar popular a partir de product fields (ex: skuMaster, ean, name suggestion)
    if (field === 'skuMaster' || field === 'sku' || field === 'ean') {
        // tenta coletar distincts simples de produtos (skuMaster ou ean)
        const fieldName = field
        const values = await prisma.product.findMany({
            where: { categories: { some: { category: { slug } } }, NOT: { [fieldName]: null } },
            distinct: [fieldName as any],
            select: { [fieldName]: true },
            orderBy: { [fieldName]: 'asc' as const },
            take: 1000,
        })
        result.options = values.map((v: any) => {
            const val = v[fieldName]
            return { id: String(val), label: String(val), value: String(val) }
        })
        return result
    }

    // se não reconhecido, retorna vazio
    return result
}

/**
 * Retorna filtros configurados para a categoria (leva em conta CategoryFilter e DirectCategoryFilters).
 * Cada filtro vem com opções (FilterOption) quando existentes ou é auto-populado a partir do catálogo.
 */
export async function getFiltersForCategory(slug: string) {
    const category = await prisma.category.findFirst({
        where: { slug },
        include: {
            directFilters: {
                include: { options: true, group: true },
            },
            filters: {
                include: {
                    filter: {
                        include: { options: true, group: true },
                    },
                },
            },
        },
    })

    if (!category) return []

    // Compose raw filters from directFilters and category.filters
    const rawFilters: any[] = []

    if (Array.isArray(category.directFilters)) {
        for (const f of category.directFilters) rawFilters.push(f)
    }

    if (Array.isArray(category.filters)) {
        for (const cf of category.filters) {
            if (cf.filter) rawFilters.push(cf.filter)
        }
    }

    // group by group
    const groupsMap = new Map<string, { group: any | null; filters: any[] }>()
    for (const f of rawFilters) {
        const group = f.group ? { id: f.group.id, name: f.group.name } : null
        const groupKey = group ? group.id : 'ungrouped'
        if (!groupsMap.has(groupKey)) groupsMap.set(groupKey, { group, filters: [] })

        // prepare options from DB if already exist
        const options = (f.options ?? []).map((o: any) => ({ id: o.id, label: o.label, value: o.value, order: o.order }))

        groupsMap.get(groupKey)!.filters.push({
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
        })
    }

    // Auto-populate filters that requested it or have no options
    const groupsResult: any[] = []
    for (const [, groupEntry] of groupsMap) {
        const filtersFilled: any[] = []
        for (const fl of groupEntry.filters) {
            const needPopulate = fl.autoPopulate === true || !fl.options || fl.options.length === 0
            if (needPopulate) {
                try {
                    const populated = await populateFilterOptionsForCategory(fl, slug)
                    // merge results:
                    if (populated.options && populated.options.length > 0) {
                        // if there were options from DB, prefer them; otherwise use populated
                        fl.options = populated.options
                    }
                    if ((fl.minValue === null || fl.minValue === undefined) && populated.minValue !== null) fl.minValue = populated.minValue
                    if ((fl.maxValue === null || fl.maxValue === undefined) && populated.maxValue !== null) fl.maxValue = populated.maxValue
                } catch (err) {
                    console.error('populate filter error for', fl.id, err)
                }
            }
            filtersFilled.push(fl)
        }
        groupsResult.push({
            group: groupEntry.group,
            filters: filtersFilled.sort((a: any, b: any) => (a.order ?? 0) - (b.order ?? 0)),
        })
    }

    return groupsResult
}

/**
 * Busca produtos pela category.slug com paginação, ordenação e filtros.
 * filters: { [filterId]: string[] }
 */
export async function getProductsByCategorySlug(slug: string, opts: ProductListOptions = {}) {
    const page = opts.page && opts.page > 0 ? opts.page : 1
    const perPage = opts.perPage && opts.perPage > 0 ? opts.perPage : 12
    const skip = (page - 1) * perPage

    const where: any = {
        status: 'DISPONIVEL',
        categories: { some: { category: { slug } } },
    }

    if (opts.q) {
        const q = opts.q
        where.AND = where.AND ?? []
        where.AND.push({
            OR: [
                { name: { contains: q, mode: 'insensitive' } },
                { description: { contains: q, mode: 'insensitive' } },
            ],
        })
    }

    if (opts.brand) where.brand = opts.brand

    // price range via minPrice/maxPrice
    if (typeof opts.minPrice === 'number' || typeof opts.maxPrice === 'number') {
        if (typeof opts.minPrice === 'number' && typeof opts.maxPrice === 'number') {
            where.price_per = { gte: opts.minPrice, lte: opts.maxPrice }
        } else if (typeof opts.minPrice === 'number') {
            where.price_per = { gte: opts.minPrice }
        } else if (typeof opts.maxPrice === 'number') {
            where.price_per = { lte: opts.maxPrice }
        }
    }

    // apply filters (by filter id)
    if (opts.filters && Object.keys(opts.filters).length > 0) {
        const filterIds = Object.keys(opts.filters)
        const dbFilters = await prisma.filter.findMany({ where: { id: { in: filterIds } } })

        where.AND = where.AND ?? []
        for (const dbf of dbFilters) {
            const selectedValues = opts.filters![dbf.id] ?? []
            if (!selectedValues || selectedValues.length === 0) continue

            const field = (dbf.fieldName ?? '').trim()

            // variantAttribute (either use dbf.name as key or support fieldName like 'variantAttribute:Key')
            if (field.startsWith('variantAttribute')) {
                let keyName: string | null = null
                if (field.includes(':')) keyName = field.split(':')[1]
                else keyName = dbf.name
                if (!keyName) continue

                where.AND.push({
                    variants: {
                        some: {
                            variantAttribute: {
                                some: {
                                    key: keyName,
                                    value: { in: selectedValues },
                                },
                            },
                        },
                    },
                })
                continue
            }

            // brand
            if (field === 'brand') {
                where.AND.push({ brand: { in: selectedValues } })
                continue
            }

            // price range expressed by filter - if selectedValues contain two numbers, interpret as range
            if (field === 'price_per' || field === 'price_of') {
                const nums = selectedValues.map(Number).filter(n => !Number.isNaN(n))
                if (nums.length >= 2) {
                    const [min, max] = [Math.min(...nums), Math.max(...nums)]
                    where.AND.push({ price_per: { gte: min, lte: max } })
                } else if (nums.length === 1) {
                    // single value: treat as exact or minimum
                    where.AND.push({ price_per: { gte: nums[0] } })
                }
                continue
            }

            // variant.sku
            if (field === 'variant.sku' || field === 'variant_sku') {
                where.AND.push({
                    variants: { some: { sku: { in: selectedValues } } },
                })
                continue
            }

            // category by id
            if (field === 'category') {
                where.AND.push({
                    categories: { some: { category: { id: { in: selectedValues } } } },
                })
                continue
            }

            // fallback: product field in (ex: skuMaster, ean)
            where.AND.push({ [field]: { in: selectedValues } })
        }
    }

    // orderBy
    let orderBy: any = undefined
    if (opts.sort === 'maisVendidos') orderBy = { view: 'desc' }
    else if (opts.sort === 'nomeAsc') orderBy = { name: 'asc' }
    else if (opts.sort === 'nomeDesc') orderBy = { name: 'desc' }
    else if (opts.sort === 'menor') orderBy = { price_per: 'asc' }
    else if (opts.sort === 'maior') orderBy = { price_per: 'desc' }

    const total = await prisma.product.count({ where })

    const products = await prisma.product.findMany({
        where,
        include: {
            images: { orderBy: [{ isPrimary: 'desc' }, { created_at: 'asc' }] },
            variants: {
                include: {
                    variantAttribute: true,
                    productVariantImage: { orderBy: [{ isPrimary: 'desc' }, { created_at: 'asc' }] },
                },
            },
            categories: { include: { category: true } },
        },
        orderBy: orderBy ? orderBy : undefined,
        skip,
        take: perPage,
    })

    let sortedProducts = products
    if ((opts.sort as any) === 'maiorDesconto') {
        sortedProducts = products.sort((a: any, b: any) => {
            const aDiff = (a.price_of ?? a.price_per) - a.price_per
            const bDiff = (b.price_of ?? b.price_per) - b.price_per
            return bDiff - aDiff
        })
    }

    const formatted = sortedProducts.map((p: any) => {
        const primaryImage = p.images && p.images.length > 0 ? p.images[0].url : null
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
                attributes: v.variantAttribute.map((a: any) => ({ key: a.key, value: a.value })),
                images: v.productVariantImage?.map((iv: any) => ({ url: iv.url, altText: iv.altText, isPrimary: iv.isPrimary })),
            })),
        }
    })

    return { total, page, perPage, products: formatted }
}