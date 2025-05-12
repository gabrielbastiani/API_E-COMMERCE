// services/product/ProductUpdateDataService.ts
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

interface UpdateProductProps {
    id: string;
    name?: string;
    slug?: string;
    metaTitle?: string;
    metaDescription?: string;
    keywords?: any;
    brand?: string;
    ean?: string;
    description?: string;
    skuMaster?: string;
    price_per?: number;
    price_of?: number;
    weight?: number;
    length?: number;
    width?: number;
    height?: number;
    stock?: number;
    status?: "DISPONIVEL" | "INDISPONIVEL";
    mainPromotion_id?: string;
    categoryIds?: string[];
    descriptionBlocks?: { title: string; description: string }[];
    imageFiles?: Express.Multer.File[];
    videoUrls?: string[];
    variants?: VariantInput[];
    relations?: RelationInput[];
}

export class ProductUpdateDataService {
    async execute(data: UpdateProductProps) {
        const {
            id,
            relations,
            variants,
            categoryIds,
            descriptionBlocks,
            imageFiles,
            videoUrls,
            ...fields
        } = data;

        // 1) Monta dados principais, incluindo `status`
        const updateData: any = { ...fields };

        // promoção principal
        if (fields.mainPromotion_id !== undefined) {
            updateData.mainPromotion = fields.mainPromotion_id
                ? { connect: { id: fields.mainPromotion_id } }
                : { disconnect: true };
        }

        // 2) Categorias
        if (categoryIds) {
            updateData.categories = {
                deleteMany: {},
                create: categoryIds.map(cid => ({ category: { connect: { id: cid } } })),
            };
        }

        // 3) Descrições detalhadas
        if (descriptionBlocks) {
            updateData.productsDescriptions = {
                deleteMany: {},
                create: descriptionBlocks.map(b => ({
                    title: b.title,
                    description: b.description,
                })),
            };
        }

        // 4) Imagens e vídeos globais
        if (imageFiles) {
            updateData.images = {
                deleteMany: { product_id: id },
                create: imageFiles.map((file, idx) => ({
                    url: file.filename,
                    altText: file.originalname,
                    isPrimary: idx === 0,
                })),
            };
        }
        if (videoUrls) {
            updateData.videos = {
                deleteMany: { product_id: id },
                create: videoUrls.map((url, idx) => ({
                    url,
                    isPrimary: idx === 0,
                })),
            };
        }

        // 5) Aplica o update principal
        await prismaClient.product.update({
            where: { id },
            data: updateData,
        });

        // 6) Relações: limpa e recria
        if (relations) {
            await prismaClient.productRelation.deleteMany({
                where: {
                    OR: [
                        { parentProduct_id: id },
                        { childProduct_id: id },
                    ]
                }
            });
            for (const r of relations) {
                const parentConnect = r.parentId ? { id: r.parentId } : { id };
                const childConnect = r.childId ? { id: r.childId } : { id };
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

        // 7) Variantes: delete + create
        if (variants) {
            // remove todas as variantes do produto
            const existingVariants = await prismaClient.productVariant.findMany({
                where: { product_id: id },
                select: { id: true, sku: true }
            });
            const existingIds = existingVariants.map(v => v.id);
            await prismaClient.productVariant.deleteMany({
                where: { product_id: id }
            });
            // opcionalmente: limpe atributos, imagens e vídeos associados
            await prismaClient.variantAttribute.deleteMany({
                where: { variant_id: { in: existingIds } }
            });
            await prismaClient.productImage.deleteMany({
                where: { variant_id: { in: existingIds } }
            });
            await prismaClient.productVideo.deleteMany({
                where: { variant_id: { in: existingIds } }
            });

            // cria de novo
            for (const v of variants) {
                const created = await prismaClient.productVariant.create({
                    data: {
                        sku: v.sku,
                        price_per: v.price_per,
                        price_of: v.price_of,
                        stock: v.stock,
                        allowBackorders: v.allowBackorders,
                        sortOrder: v.sortOrder,
                        ean: v.ean,
                        product: { connect: { id } },
                        mainPromotion: v.mainPromotion_id
                            ? { connect: { id: v.mainPromotion_id } }
                            : undefined
                    }
                });

                // atributos
                if (v.attributes) {
                    await prismaClient.variantAttribute.createMany({
                        data: v.attributes.map(a => ({
                            key: a.key,
                            value: a.value,
                            variant_id: created.id
                        }))
                    });
                }
                // imagens
                if (v.imageFiles) {
                    await prismaClient.productImage.createMany({
                        data: v.imageFiles.map((file, idx) => ({
                            url: file.filename,
                            altText: file.originalname,
                            product_id: id,
                            variant_id: created.id,
                            isPrimary: idx === 0
                        }))
                    });
                }
                // vídeos
                if (v.videoUrls) {
                    await prismaClient.productVideo.createMany({
                        data: v.videoUrls.map((url, idx) => ({
                            url,
                            product_id: id,
                            variant_id: created.id,
                            isPrimary: idx === 0
                        }))
                    });
                }
            }
        }

        // 8) Retorna produto já atualizado
        return prismaClient.product.findUnique({
            where: { id },
            include: {
                categories: true,
                productsDescriptions: true,
                images: true,
                videos: true,
                variants: true,
                productRelations: true
            }
        });
    }
}
