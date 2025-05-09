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
    mainPromotion_id?: string;
    attributes?: { key: string; value: string }[];
    imageFiles?: Express.Multer.File[];
    videoUrls?: string[];
}

interface RelationInput {
    parentId?: string;
    childId?: string;
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
    stock?: number;
    mainPromotion_id?: string;
    categoryIds?: string[];
    descriptionBlocks?: { title: string; description: string }[];
    imageFiles?: Express.Multer.File[];
    videoUrls?: string[];
    variants?: VariantInput[];
    relations?: RelationInput[];
}

class CreateProductService {
    async execute(data: CreateProductProps & { relations?: RelationInput[] }) {
        // 1) Cria produto
        function removerAcentos(s: any) {
            return s.normalize('NFD')
                .replace(/[\u0300-\u036f]/g, "")
                .toLowerCase()
                .replace(/ +/g, "-")
                .replace(/-{2,}/g, "-")
                .replace(/[/]/g, "-");
        }

        const product = await prismaClient.product.create({
            data: {
                name: data.name,
                slug: removerAcentos(data.slug),
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
                stock: data.stock,
                mainPromotion: data.mainPromotion_id
                    ? { connect: { id: data.mainPromotion_id } }
                    : undefined,
                categories: data.categoryIds
                    ? {
                        create: data.categoryIds.map((id) => ({
                            category: { connect: { id } },
                        })),
                    }
                    : undefined,
                productsDescriptions: data.descriptionBlocks
                    ? {
                        create: data.descriptionBlocks.map((b) => ({
                            title: b.title,
                            description: b.description,
                        })),
                    }
                    : undefined,
                images: data.imageFiles
                    ? {
                        create: data.imageFiles.map((file, idx) => ({
                            url: file.filename,
                            altText: file.originalname,
                            isPrimary: idx === 0,
                        })),
                    }
                    : undefined,
                videos: data.videoUrls
                    ? {
                        create: data.videoUrls.map((url, idx) => ({
                            url,
                            isPrimary: idx === 0,
                        })),
                    }
                    : undefined,
                variants: data.variants
                    ? {
                        create: data.variants.map((v) => ({
                            sku: v.sku,
                            price_per: v.price_per,
                            price_of: v.price_of,
                            stock: v.stock,
                            allowBackorders: v.allowBackorders,
                            sortOrder: v.sortOrder,
                            ean: v.ean,
                            mainPromotion: v.mainPromotion_id
                                ? { connect: { id: v.mainPromotion_id } }
                                : undefined,
                        })),
                    }
                    : undefined,
            },
        });

        // 2) Cria as relações, agora **depois** de termos o `product.id`
        if (data.relations?.length) {
            for (const r of data.relations) {
                // se veio apenas childId => novo produto é pai
                const parentConnect = r.parentId
                    ? { id: r.parentId }
                    : { id: product.id };

                // se veio apenas parentId => novo produto é filho
                const childConnect = r.childId
                    ? { id: r.childId }
                    : { id: product.id };

                await prismaClient.productRelation.create({
                    data: {
                        parentProduct: { connect: parentConnect },
                        childProduct: { connect: childConnect },
                        relationType: r.relationType,
                        sortOrder: r.sortOrder,
                        isRequired: r.isRequired,
                    }
                });
            }
        }

        // 3) Processa variantes (atributos, imagens e vídeos)
        if (data.variants?.length) {
            for (const variant of data.variants) {
                const createdVariant = await prismaClient.productVariant.findUnique({
                    where: { sku: variant.sku },
                });
                if (!createdVariant) continue;

                if (variant.attributes) {
                    await prismaClient.variantAttribute.createMany({
                        data: variant.attributes.map((a) => ({
                            key: a.key,
                            value: a.value,
                            variant_id: createdVariant.id,
                        })),
                    });
                }
                if (variant.imageFiles) {
                    await prismaClient.productImage.createMany({
                        data: variant.imageFiles.map((file, idx) => ({
                            url: file.filename,
                            altText: file.originalname,
                            variant_id: createdVariant.id,
                            product_id: createdVariant.product_id,
                            isPrimary: idx === 0,
                        })),
                    });
                }
                if (variant.videoUrls) {
                    await prismaClient.productVideo.createMany({
                        data: variant.videoUrls.map((url, idx) => ({
                            url,
                            variant_id: createdVariant.id,
                            product_id: createdVariant.product_id,
                            isPrimary: idx === 0,
                        })),
                    });
                }
            }
        }

        return product;
    }
}

export { CreateProductService };