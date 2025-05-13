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

        // 1) Campos principais (inclui status, se presente)
        const updateData: any = { ...fields };

        if (fields.mainPromotion_id !== undefined) {
            updateData.mainPromotion = fields.mainPromotion_id
                ? { connect: { id: fields.mainPromotion_id } }
                : { disconnect: true };
        }

        // 2) Categorias (só se vier categoryIds)
        if (categoryIds !== undefined) {
            updateData.categories = {
                deleteMany: {},
                create: categoryIds.map(cid => ({ category: { connect: { id: cid } } })),
            };
        }

        // 3) Descrições detalhadas (só se vier descriptionBlocks)
        if (descriptionBlocks !== undefined) {
            updateData.productsDescriptions = {
                deleteMany: {},
                create: descriptionBlocks.map(b => ({
                    title: b.title,
                    description: b.description,
                })),
            };
        }

        // 4) Imagens globais (só se tiver feito upload)
        if (imageFiles && imageFiles.length > 0) {
            updateData.images = {
                deleteMany: { product_id: id },
                create: imageFiles.map((file, idx) => ({
                    url: file.filename,
                    altText: file.originalname,
                    isPrimary: idx === 0,
                })),
            };
        }
        // 5) Vídeos globais (só se tiver vídeo enviado)
        if (videoUrls && videoUrls.length > 0) {
            updateData.videos = {
                deleteMany: { product_id: id },
                create: videoUrls.map((url, idx) => ({
                    url,
                    isPrimary: idx === 0,
                })),
            };
        }

        // 6) Atualiza o produto principal
        await prismaClient.product.update({
            where: { id },
            data: updateData,
        });

        // 7) Relações (só se vier relations)
        if (relations !== undefined) {
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

        // 8) Variantes (só se vier variants) — delete + create completo
        if (variants !== undefined) {
            // Remove todas as variantes e seus dados relacionados
            const existing = await prismaClient.productVariant.findMany({
                where: { product_id: id },
                select: { id: true }
            });
            const ids = existing.map(v => v.id);

            await prismaClient.variantAttribute.deleteMany({ where: { variant_id: { in: ids } } });
            await prismaClient.productImage.deleteMany({ where: { variant_id: { in: ids } } });
            await prismaClient.productVideo.deleteMany({ where: { variant_id: { in: ids } } });
            await prismaClient.productVariant.deleteMany({ where: { product_id: id } });

            // Recria
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
                if (v.attributes) {
                    await prismaClient.variantAttribute.createMany({
                        data: v.attributes.map(a => ({
                            key: a.key,
                            value: a.value,
                            variant_id: created.id
                        }))
                    });
                }
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
                if (v.videoUrls) {
                    await prismaClient.productVideo.createMany({
                        data: v.videoUrls.map((url, idx) => ({
                            url: url,
                            product_id: id,
                            variant_id: created.id,
                            isPrimary: idx === 0
                        }))
                    });
                }
            }
        }

        // 9) Retorna o produto com tudo já carregado
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