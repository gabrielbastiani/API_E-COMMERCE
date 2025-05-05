import prismaClient from "../../prisma";
import slugify from 'slugify';

interface VariantImageRequest {
    url: string;
    altText?: string;
    isPrimary?: boolean;
}

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
    images?: VariantImageRequest[];
}

interface ProductDescriptionRequest {
    title: string;
    description: string;
    status?: 'DISPONIVEL' | 'INDISPONIVEL';
}

interface ProductRequest {
    name: string;
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
    images?: {
        url: string;
        altText?: string;
        isPrimary?: boolean;
    }[];
    variants?: VariantRequest[];
    productDescriptions?: ProductDescriptionRequest[];
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
            variants = [],
            productDescriptions = [],
        } = productData;

        // Geração e validação do slug
        let generatedSlug = slug || slugify(name, { lower: true, strict: true });
        const existingProduct = await prismaClient.product.findUnique({
            where: { slug: generatedSlug },
        });
        if (existingProduct) {
            generatedSlug += `-${Date.now()}`;
        }

        // Criação usando transação
        const product = await prismaClient.$transaction(async (prisma) => {
            // 1. Cria o produto principal
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
                    mainPromotion: mainPromotionId ? {
                        connect: { id: mainPromotionId }
                    } : undefined,
                    categories: {
                        create: categories.map(categoryId => ({
                            category: {
                                connect: { id: categoryId }
                            } // Correção da sintaxe aqui
                        }))
                    },
                    images: {
                        create: images.map(image => ({
                            url: image.url,
                            altText: image.altText,
                            isPrimary: image.isPrimary || false,
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

            // 2. Cria as variantes
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
                                mainPromotion_id: variant.mainPromotionId, // Corrigido aqui
                                variantAttribute: {
                                    create: variant.variantAttributes?.map(attr => ({
                                        key: attr.key,
                                        value: attr.value,
                                        status: attr.status || 'DISPONIVEL'
                                    })) || []
                                },
                                images: variant.images ? {
                                    create: variant.images.map(img => ({
                                        url: img.url,
                                        altText: img.altText,
                                        isPrimary: img.isPrimary || false,
                                        product_id: newProduct.id
                                    }))
                                } : undefined
                            }
                        });
                    })
                );
            }

            // 3. Retorna o produto completo
            return prisma.product.findUnique({
                where: { id: newProduct.id },
                include: {
                    categories: { include: { category: true } },
                    images: true,
                    variants: {
                        include: {
                            variantAttribute: true,
                            images: true,
                            mainPromotion: true
                        }
                    },
                    productsDescriptions: true,
                    mainPromotion: true
                }
            });
        });

        return product;
    }
}

export { CreateProductService };