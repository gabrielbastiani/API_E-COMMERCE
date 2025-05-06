import prismaClient from "../../prisma";
import slugify from 'slugify';

interface VariantAttributeRequest {
    key: string;
    value: string;
    status?: 'DISPONIVEL' | 'INDISPONIVEL';
}

interface VariantRequest {
    sku: string;
    price_of?: number;
    price_per: number;
    stock?: number;
    allowBackorders?: boolean;
    sortOrder?: number;
    ean?: string;
    mainPromotionId?: string;
    variantAttributes?: VariantAttributeRequest[];
    images?: Array<{
        url: string;
        altText?: string;
        isPrimary?: boolean;
    }>;
    videos?: Array<{
        url: string;
        isPrimary?: boolean;
    }>;
}

interface ProductRelationRequest {
    childProductId: string;
    relationType?: 'VARIANT' | 'SIMPLE';
    isRequired?: boolean;
    sortOrder?: number;
}

interface ProductRequest {
    name: string;
    skuMaster?: string;
    status?: 'DISPONIVEL' | 'INDISPONIVEL';
    description: string;
    price_per: number;
    slug?: string;
    metaTitle?: string;
    metaDescription?: string;
    keywords?: any;
    brand?: string;
    ean?: string;
    price_of?: number;
    weight?: number;
    length?: number;
    width?: number;
    height?: number;
    mainPromotionId?: string;
    categories?: string[];
    images?: Array<{
        url: string;
        altText?: string;
        isPrimary?: boolean;
    }>;
    videos?: Array<{
        url: string;
        isPrimary?: boolean;
    }>;
    variants?: VariantRequest[];
    productDescriptions?: Array<{
        title: string;
        description: string;
        status?: 'DISPONIVEL' | 'INDISPONIVEL';
    }>;
    productRelations?: ProductRelationRequest[];
}

class CreateProductService {
    async execute(productData: ProductRequest) {
        const {
            name,
            description,
            price_per,
            slug,
            metaTitle,
            metaDescription,
            keywords,
            brand,
            ean,
            price_of,
            weight,
            length,
            width,
            height,
            mainPromotionId,
            categories = [],
            images = [],
            videos = [],
            variants = [],
            productDescriptions = [],
            productRelations = [],
        } = productData;

        // Validação básica
        if (!name || !description || price_per === undefined) {
            throw new Error('Campos obrigatórios faltando');
        }

        // Geração de slug
        let generatedSlug = slug || slugify(name, { lower: true, strict: true });
        const existingProduct = await prismaClient.product.findUnique({
            where: { slug: generatedSlug },
        });
        if (existingProduct) {
            generatedSlug += `-${Date.now()}`;
        }

        const product = await prismaClient.$transaction(async (prisma) => {
            // 1. Cria produto principal
            const newProduct = await prisma.product.create({
                data: {
                    name,
                    description,
                    price_per,
                    slug: generatedSlug,
                    metaTitle,
                    metaDescription,
                    keywords,
                    brand,
                    ean,
                    price_of,
                    weight,
                    length,
                    width,
                    height,
                    skuMaster: productData.skuMaster,
                    status: productData.status || 'DISPONIVEL',
                    mainPromotion: mainPromotionId ? { connect: { id: mainPromotionId } } : undefined,
                    categories: {
                        create: categories.map(categoryId => ({
                            category: { connect: { id: categoryId } }
                        }))
                    },
                    images: {
                        create: images.map(image => ({
                            url: image.url,
                            altText: image.altText,
                            isPrimary: image.isPrimary || false,
                        }))
                    },
                    videos: {
                        create: videos.map(video => ({
                            url: video.url,
                            isPrimary: video.isPrimary || false,
                        }))
                    },
                    productsDescriptions: {
                        create: productDescriptions.map(desc => ({
                            title: desc.title,
                            description: desc.description,
                            status: desc.status || 'DISPONIVEL',
                        }))
                    }
                },
            });

            // 2. Cria variantes
            if (variants.length > 0) {
                await Promise.all(
                    variants.map(async (variant) => {
                        await prisma.productVariant.create({
                            data: {
                                product_id: newProduct.id,
                                sku: variant.sku,
                                price_of: variant.price_of,
                                price_per: variant.price_per,
                                stock: variant.stock || 0,
                                allowBackorders: variant.allowBackorders || false,
                                sortOrder: variant.sortOrder || 0,
                                ean: variant.ean,
                                mainPromotion_id: variant.mainPromotionId,
                                variantAttribute: {
                                    create: (variant.variantAttributes || []).map(attr => ({
                                        key: attr.key,
                                        value: attr.value,
                                        status: attr.status || 'DISPONIVEL'
                                    }))
                                },
                                images: variant.images ? {
                                    create: variant.images.map(img => ({
                                        url: img.url,
                                        altText: img.altText,
                                        isPrimary: img.isPrimary || false,
                                        product_id: newProduct.id
                                    }))
                                } : undefined,
                                videos: variant.videos ? {
                                    create: variant.videos.map(video => ({
                                        url: video.url,
                                        isPrimary: video.isPrimary || false,
                                        product_id: newProduct.id
                                    }))
                                } : undefined
                            }
                        });
                    })
                );
            }

            // 3. Cria relações entre produtos
            if (productRelations.length > 0) {
                await Promise.all(
                    productRelations.map(async (relation) => {
                        await prisma.productRelation.create({
                            data: {
                                parentProduct_id: newProduct.id,
                                childProductId: relation.childProductId,
                                relationType: relation.relationType || 'VARIANT',
                                isRequired: relation.isRequired || false,
                                sortOrder: relation.sortOrder || 0
                            }
                        });
                    })
                );
            }

            return prisma.product.findUnique({
                where: { id: newProduct.id },
                include: {
                    categories: { include: { category: true } },
                    images: true,
                    videos: true,
                    variants: {
                        include: {
                            variantAttribute: true,
                            images: true,
                            videos: true,
                            mainPromotion: true
                        }
                    },
                    productsDescriptions: true,
                    mainPromotion: true,
                    productRelations: {
                        include: {
                            childProduct: true
                        }
                    }
                }
            });
        });

        return product;
    }
}

export { CreateProductService };