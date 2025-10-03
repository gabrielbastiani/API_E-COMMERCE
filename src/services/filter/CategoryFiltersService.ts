// services/category/CategoryFiltersService.ts
import prismaClient from "../../prisma";

class CategoryFiltersService {
    async getFiltersByCategorySlug(slug: string) {
        // Primeiro, encontra a categoria pelo slug
        const category = await prismaClient.category.findFirst({
            where: {
                slug: slug,
                status: 'DISPONIVEL'
            },
            include: {
                filters: {
                    include: {
                        filter: {
                            include: {
                                group: true
                            }
                        }
                    }
                },
                directFilters: {
                    include: {
                        group: true
                    }
                }
            }
        });

        if (!category) {
            return { filters: [] };
        }

        // Combina filtros diretos e via CategoryFilter
        const allFilters = [
            ...category.directFilters,
            ...category.filters.map(cf => cf.filter)
        ];

        // Remove duplicatas
        const uniqueFilters = allFilters.filter((filter, index, self) =>
            index === self.findIndex(f => f.id === filter.id)
        );

        // Agrupa por grupo
        const groups: any[] = [];
        const groupMap = new Map();

        // Para cada filtro, populamos as opções se necessário
        for (const filter of uniqueFilters) {
            if (!filter.isActive) continue;

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
                options = await this.populateFilterOptions(filter, category.id);
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
        return { filters: groups };
    }

    // Método similar ao do FilterForSearchService para popular opções
    private async populateFilterOptions(filter: any, categoryId: string): Promise<any[]> {
        const fieldName = filter.fieldName;
        const attributeKeys = filter.attributeKeys ? (Array.isArray(filter.attributeKeys) ? filter.attributeKeys : []) : [];

        console.log(`Populating filter ${filter.name} for category ${categoryId} with fieldName: ${fieldName}`);

        try {
            // Filtro por preço
            if (fieldName === 'price_per' || fieldName === 'price_of') {
                return await this.populatePriceOptions(categoryId);
            }

            // Filtro por marca
            if (fieldName === 'brand') {
                return await this.populateBrandOptions(categoryId);
            }

            // Filtro por atributos de variante
            if (fieldName === 'variantAttribute' && attributeKeys.length > 0) {
                return await this.populateVariantAttributeOptions(attributeKeys, categoryId);
            }

            // Filtro por características do produto
            if (fieldName === 'productCharacteristic' && attributeKeys.length > 0) {
                return await this.populateProductCharacteristicOptions(attributeKeys, categoryId);
            }

            // Filtro por SKU da variante
            if (fieldName === 'variant.sku') {
                return await this.populateSkuOptions(categoryId);
            }

            return [];
        } catch (error) {
            console.error(`Error populating filter options for ${filter.name}:`, error);
            return [];
        }
    }

    private async populatePriceOptions(categoryId: string): Promise<any[]> {
        return [];
    }

    private async populateBrandOptions(categoryId: string): Promise<any[]> {
        const brands = await prismaClient.product.findMany({
            where: {
                status: 'DISPONIVEL',
                brand: { not: null },
                categories: {
                    some: {
                        category_id: categoryId
                    }
                }
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

    private async populateVariantAttributeOptions(attributeKeys: string[], categoryId: string): Promise<any[]> {
        const attributes = await prismaClient.variantAttribute.findMany({
            where: {
                key: { in: attributeKeys },
                variant: {
                    product: {
                        status: 'DISPONIVEL',
                        categories: {
                            some: {
                                category_id: categoryId
                            }
                        }
                    }
                }
            },
            include: {
                variantAttributeImage: {
                    take: 1
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

    private async populateProductCharacteristicOptions(attributeKeys: string[], categoryId: string): Promise<any[]> {
        const characteristics = await prismaClient.productCharacteristics.findMany({
            where: {
                key: { in: attributeKeys },
                product: {
                    status: 'DISPONIVEL',
                    categories: {
                        some: {
                            category_id: categoryId
                        }
                    }
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

    private async populateSkuOptions(categoryId: string): Promise<any[]> {
        const variants = await prismaClient.productVariant.findMany({
            where: {
                product: {
                    status: 'DISPONIVEL',
                    categories: {
                        some: {
                            category_id: categoryId
                        }
                    }
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
}

export { CategoryFiltersService };