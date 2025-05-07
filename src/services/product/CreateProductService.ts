import prismaClient from "../../prisma";
import { ProductRelationType } from "@prisma/client";

interface VariantInput {
    sku: string;
    price_per: number;
    price_of?: number;
    stock?: number;
    allowBackorders?: boolean;
    sortOrder?: number;
    ean?: string;
    mainPromotionId?: string;
    attributes?: { key: string; value: string }[];
    imageFiles?: Express.Multer.File[];
    videoUrls?: string[];
}

interface RelationInput {
    parentId: string;
    childId: string;
    relationType?: ProductRelationType;
    sortOrder?: number;
    isRequired?: boolean;
}

interface CreateProductProps {
    name: string;
    slug?: string;
    metaTitle?: string;
    metaDescription?: string;
    keywords?: any;
    brand?: string;
    ean?: string;
    description: string;
    skuMaster?: string;
    price_per: number;
    price_of?: number;
    weight?: number;
    length?: number;
    width?: number;
    height?: number;
    mainPromotionId?: string;
    categoryIds?: string[];
    descriptionBlocks?: { title: string; description: string }[];
    imageFiles?: Express.Multer.File[];
    videoUrls?: string[];
    variants?: VariantInput[];
    relations?: RelationInput[];
}

class CreateProductService {
    async execute(data: CreateProductProps) {
        // Cria produto principal
        const product = await prismaClient.product.create({
            data: {
                name: data.name,
                slug: data.slug,
                metaTitle: data.metaTitle,
                metaDescription: data.metaDescription,
                keywords: data.keywords,
                brand: data.brand,
                ean: data.ean,
                description: data.description,
                skuMaster: data.skuMaster,
                price_per: data.price_per,
                price_of: data.price_of,
                weight: data.weight,
                length: data.length,
                width: data.width,
                height: data.height,
                mainPromotion: data.mainPromotionId ? { connect: { id: data.mainPromotionId } } : undefined,
                categories: data.categoryIds
                    ? { create: data.categoryIds.map(id => ({ category: { connect: { id } } })) }
                    : undefined,
                productsDescriptions: data.descriptionBlocks
                    ? { create: data.descriptionBlocks.map(b => ({ title: b.title, description: b.description })) }
                    : undefined,
                images: data.imageFiles
                    ? {
                        create: data.imageFiles.map((file, idx) => ({
                            url: `${file.filename}`,
                            altText: file.originalname,
                            isPrimary: idx === 0,
                        }))
                    }
                    : undefined,
                videos: data.videoUrls
                    ? { create: data.videoUrls.map((url, idx) => ({ url, isPrimary: idx === 0 })) }
                    : undefined,
                variants: data.variants
                    ? {
                        create: data.variants.map(v => ({
                            sku: v.sku,
                            price_per: v.price_per,
                            price_of: v.price_of,
                            stock: v.stock,
                            allowBackorders: v.allowBackorders,
                            sortOrder: v.sortOrder,
                            ean: v.ean,
                            mainPromotion: v.mainPromotionId ? { connect: { id: v.mainPromotionId } } : undefined,
                        }))
                    }
                    : undefined,
                productRelations: data.relations
                    ? {
                        create: data.relations.map(r => ({
                            parentProduct: { connect: { id: r.parentId } },
                            childProduct: { connect: { id: r.childId } },
                            relationType: r.relationType,
                            sortOrder: r.sortOrder,
                            isRequired: r.isRequired,
                        }))
                    }
                    : undefined,
            }
        });

        // Processa variantes: atributos, imagens e vídeos
        if (data.variants && data.variants.length) {
            for (const variant of data.variants) {
                const createdVariant = await prismaClient.productVariant.findUnique({ where: { sku: variant.sku } });
                if (!createdVariant) continue;

                // Atributos
                if (variant.attributes) {
                    await prismaClient.variantAttribute.createMany({
                        data: variant.attributes.map(a => ({
                            key: a.key,
                            value: a.value,
                            variant_id: createdVariant.id,
                        }))
                    });
                }

                // Imagens da variante (precisa informar product_id também)
                if (variant.imageFiles) {
                    await prismaClient.productImage.createMany({
                        data: variant.imageFiles.map((file, idx) => ({
                            url: file.filename,
                            altText: file.originalname,
                            variant_id: createdVariant.id,
                            product_id: createdVariant.product_id,
                            isPrimary: idx === 0,
                        }))
                    });
                }

                // Vídeos da variante (precisa informar product_id também)
                if (variant.videoUrls) {
                    await prismaClient.productVideo.createMany({
                        data: variant.videoUrls.map((url, idx) => ({
                            url,
                            variant_id: createdVariant.id,
                            product_id: createdVariant.product_id,
                            isPrimary: idx === 0,
                        }))
                    });
                }
            }
        }

        return product;
    }
}

export { CreateProductService };