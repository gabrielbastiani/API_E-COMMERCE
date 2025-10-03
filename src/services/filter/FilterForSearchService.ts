import prismaClient from "../../prisma";

class FilterForSearchService {
    async getFiltersForSearch() {
        // Busca filtros marcados como forSearch = true e ativos
        const filters = await prismaClient.filter.findMany({
            where: {
                forSearch: true,
                isActive: true
            },
            include: {
                group: true
            },
            orderBy: [
                { group: { order: 'asc' } },
                { order: 'asc' }
            ]
        });

        // Agrupa por grupo
        const groups: any[] = [];

        if (filters.length > 0) {
            const groupMap = new Map();

            // Para cada filtro, populamos as opções se necessário
            for (const filter of filters) {
                const groupKey = filter.groupId || 'ungrouped';

                if (!groupMap.has(groupKey)) {
                    groupMap.set(groupKey, {
                        group: filter.group || { id: 'ungrouped', name: 'Geral', order: 0 },
                        filters: []
                    });
                }

                // Popula as opções do filtro
                let options: any[] = [];
                if (filter.autoPopulate) {
                    options = await this.populateFilterOptions(filter);
                } else {
                    // Usa as opções salvas em attributeKeys
                    options = filter.attributeKeys ? (Array.isArray(filter.attributeKeys) ? filter.attributeKeys : []) : [];
                }

                const formattedFilter = {
                    id: filter.id,
                    name: filter.name,
                    fieldName: filter.fieldName,
                    type: filter.type,
                    dataType: filter.dataType,
                    displayStyle: filter.displayStyle,
                    minValue: filter.minValue,
                    maxValue: filter.maxValue,
                    options: options,
                    reviewSummary: null
                };

                groupMap.get(groupKey).filters.push(formattedFilter);
            }

            groups.push(...Array.from(groupMap.values()));
        }

        return { filters: groups };
    }

    // NOVO MÉTODO: Popula automaticamente as opções do filtro
    private async populateFilterOptions(filter: any): Promise<any[]> {
        const fieldName = filter.fieldName;
        const attributeKeys = filter.attributeKeys ? (Array.isArray(filter.attributeKeys) ? filter.attributeKeys : []) : [];

        console.log(`Populating filter ${filter.name} with fieldName: ${fieldName}, keys:`, attributeKeys);

        try {
            // Filtro por preço
            if (fieldName === 'price_per' || fieldName === 'price_of') {
                return await this.populatePriceOptions();
            }

            // Filtro por marca
            if (fieldName === 'brand') {
                return await this.populateBrandOptions();
            }

            // Filtro por atributos de variante
            if (fieldName === 'variantAttribute' && attributeKeys.length > 0) {
                return await this.populateVariantAttributeOptions(attributeKeys);
            }

            // Filtro por características do produto
            if (fieldName === 'productCharacteristic' && attributeKeys.length > 0) {
                return await this.populateProductCharacteristicOptions(attributeKeys);
            }

            // Filtro por SKU da variante
            if (fieldName === 'variant.sku') {
                return await this.populateSkuOptions();
            }

            // Para outros campos, retorna array vazio ou implemente conforme necessário
            return [];
        } catch (error) {
            console.error(`Error populating filter options for ${filter.name}:`, error);
            return [];
        }
    }

    // Popula opções de preço
    private async populatePriceOptions(): Promise<any[]> {
        // Para filtros de preço, geralmente são range filters, então não precisa de opções
        return [];
    }

    // Popula opções de marca
    private async populateBrandOptions(): Promise<any[]> {
        const brands = await prismaClient.product.findMany({
            where: {
                status: 'DISPONIVEL',
                brand: { not: null }
            },
            select: {
                brand: true
            },
            distinct: ['brand']
        });

        return brands
            .filter(b => b.brand)
            .map(brand => ({
                id: brand.brand,
                label: brand.brand,
                value: brand.brand
            }));
    }

    // Popula opções de atributos de variante
    private async populateVariantAttributeOptions(attributeKeys: string[]): Promise<any[]> {
        const attributes = await prismaClient.variantAttribute.findMany({
            where: {
                key: { in: attributeKeys },
                variant: {
                    product: {
                        status: 'DISPONIVEL'
                    }
                }
            },
            include: {
                variantAttributeImage: {
                    take: 1 // Pega apenas a primeira imagem para thumbnail
                }
            },
            distinct: ['key', 'value']
        });

        const optionsMap = new Map();

        attributes.forEach(attr => {
            const key = `${attr.key}:${attr.value}`;
            if (!optionsMap.has(key)) {
                optionsMap.set(key, {
                    id: key,
                    label: attr.value,
                    value: attr.value,
                    iconUrl: attr.variantAttributeImage[0]?.url || null,
                    altText: attr.variantAttributeImage[0]?.altText || attr.value
                });
            }
        });

        return Array.from(optionsMap.values());
    }

    // Popula opções de características do produto
    private async populateProductCharacteristicOptions(attributeKeys: string[]): Promise<any[]> {
        const characteristics = await prismaClient.productCharacteristics.findMany({
            where: {
                key: { in: attributeKeys },
                product: {
                    status: 'DISPONIVEL'
                }
            },
            distinct: ['key', 'value']
        });

        const optionsMap = new Map();

        characteristics.forEach(char => {
            const key = `${char.key}:${char.value}`;
            if (!optionsMap.has(key)) {
                optionsMap.set(key, {
                    id: key,
                    label: char.value,
                    value: char.value,
                    iconUrl: char.image || null,
                    altText: char.value
                });
            }
        });

        return Array.from(optionsMap.values());
    }

    // Popula opções de SKU
    private async populateSkuOptions(): Promise<any[]> {
        const variants = await prismaClient.productVariant.findMany({
            where: {
                product: {
                    status: 'DISPONIVEL'
                },
                sku: { not: null }
            },
            include: {
                productVariantImage: {
                    take: 1
                }
            },
            distinct: ['sku']
        });

        return variants
            .filter(v => v.sku)
            .map(variant => ({
                id: variant.sku,
                label: variant.sku,
                value: variant.sku,
                iconUrl: variant.productVariantImage[0]?.url || null,
                altText: variant.productVariantImage[0]?.altText || variant.sku
            }));
    }

    async detectAttributeKeysForSearch() {
        try {
            const products = await prismaClient.product.findMany({
                where: {
                    status: 'DISPONIVEL'
                },
                include: {
                    variants: {
                        include: {
                            variantAttribute: {
                                include: {
                                    variantAttributeImage: true
                                }
                            },
                            productVariantImage: true
                        }
                    },
                    productCharacteristics: true,
                    categories: {
                        include: {
                            category: true
                        }
                    }
                },
                take: 1000
            });

            const attributeKeysMap = new Map<string, Set<string>>();
            const characteristicKeysMap = new Map<string, Set<string>>();

            products.forEach(product => {
                // Variant attributes
                product.variants.forEach(variant => {
                    variant.variantAttribute.forEach(attr => {
                        if (attr.key && attr.value) {
                            if (!attributeKeysMap.has(attr.key)) {
                                attributeKeysMap.set(attr.key, new Set());
                            }
                            attributeKeysMap.get(attr.key)!.add(String(attr.value));
                        }
                    });
                });

                // Product characteristics
                product.productCharacteristics.forEach(pc => {
                    if (pc.key && pc.value) {
                        if (!characteristicKeysMap.has(pc.key)) {
                            characteristicKeysMap.set(pc.key, new Set());
                        }
                        characteristicKeysMap.get(pc.key)!.add(String(pc.value));
                    }
                });
            });

            const result: any[] = [];

            attributeKeysMap.forEach((values, key) => {
                result.push({
                    key,
                    samples: Array.from(values).slice(0, 10),
                    source: 'variant'
                });
            });

            characteristicKeysMap.forEach((values, key) => {
                result.push({
                    key,
                    samples: Array.from(values).slice(0, 10),
                    source: 'productCharacteristic'
                });
            });

            return { keys: result };
        } catch (error) {
            console.error('Error detecting attribute keys for search:', error);
            return { keys: [] };
        }
    }

    async updateFilterForSearch(filterId: string, forSearch: boolean) {
        return await prismaClient.filter.update({
            where: { id: filterId },
            data: { forSearch }
        });
    }

    async getAllFiltersForCMS() {
        return await prismaClient.filter.findMany({
            include: {
                group: true,
                categoryFilter: {
                    include: {
                        category: true
                    }
                }
            },
            orderBy: { order: "asc" }
        });
    }
}

export { FilterForSearchService };