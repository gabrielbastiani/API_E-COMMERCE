import prismaClient from "../../prisma";
import { ProductRelationType } from "@prisma/client";
import fs from 'fs/promises';
import path from 'path';

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
    imageUrls?: string[];
    imageFiles?: Express.Multer.File[];
    videoUrls?: string[];
    variants?: VariantInput[];
    relations?: RelationInput[];
}

export class ProductUpdateDataService {
    async execute(data: UpdateProductProps) {
        const {
            id,
            relations = [],
            variants = [],
            categoryIds = [],
            descriptionBlocks = [],
            imageFiles = [],
            videoUrls = [],
            mainPromotion_id,
            ...fields
        } = data;

        const updateData: any = { ...fields };

        // 1. Process Main Promotion
        if (mainPromotion_id !== undefined) {
            updateData.mainPromotion = mainPromotion_id
                ? { connect: { id: mainPromotion_id } }
                : { disconnect: true };
        }

        // 2. Process Categories (Corrigido)
        if (categoryIds.length > 0) {
            updateData.categories = {
                deleteMany: {},
                create: categoryIds.map(cid => ({
                    category: {
                        connect: { id: cid }
                    }
                })),
            };
        }

        // 3. Process Descriptions
        if (descriptionBlocks.length > 0) {
            updateData.productsDescriptions = {
                deleteMany: { product_id: id },
                create: descriptionBlocks,
            };
        }

        // 4. Processamento de Imagens (Corrigido)
        const existingImages = await prismaClient.productImage.findMany({
            where: { product_id: id, variant_id: null }
        });

        // URLs existentes que devem ser mantidas
        const keepUrls = data.imageUrls || [];

        // Encontra imagens para deletar
        const toDelete = existingImages.filter(img => !keepUrls.includes(img.url));

        // Deleta arquivos físicos
        const uploadsPath = path.join(process.cwd(), 'images');
        for (const img of toDelete) {
            try {
                await fs.unlink(path.join(uploadsPath, img.url));
            } catch (err) {
                console.error(`Erro ao deletar ${img.url}:`, err);
            }
        }

        // Atualiza imagens apenas se houver mudanças
        if ((data.imageFiles?.length || 0) > 0 || keepUrls.length > 0) {
            updateData.images = {
                deleteMany: { product_id: id },
                create: [
                    ...keepUrls.map(url => ({
                        url,
                        altText: existingImages.find(img => img.url === url)?.altText || "",
                        isPrimary: existingImages.find(img => img.url === url)?.isPrimary || false
                    })),
                    ...(data.imageFiles ? data.imageFiles.map((file, idx) => ({
                        url: file.filename,
                        altText: file.originalname,
                        isPrimary: idx === 0
                    })) : [])
                ]
            };
        }

        // 5. Processamento de Vídeos (Corrigido)
        if (data.videoUrls && data.videoUrls.length > 0) {
            const existingVideos = await prismaClient.productVideo.findMany({
                where: { product_id: id }
            });

            const videosToDelete = existingVideos.filter(v => !data.videoUrls!.includes(v.url));

            if (videosToDelete.length > 0) {
                await prismaClient.productVideo.deleteMany({
                    where: { id: { in: videosToDelete.map(v => v.id) } }
                });
            }

            // Adiciona novos vídeos
            const newVideos = data.videoUrls.filter(url =>
                !existingVideos.some(v => v.url === url)
            );

            if (newVideos.length > 0) {
                await prismaClient.productVideo.createMany({
                    data: newVideos.map((url, idx) => ({
                        url,
                        product_id: id,
                        isPrimary: idx === 0
                    }))
                });
            }
        }

        // 6. Main product update
        await prismaClient.product.update({
            where: { id },
            data: updateData,
        });

        // 7. Process Relations
        if (relations.length > 0) {
            await prismaClient.productRelation.deleteMany({
                where: { OR: [{ parentProduct_id: id }, { childProduct_id: id }] }
            });

            for (const r of relations) {
                await prismaClient.productRelation.create({
                    data: {
                        parentProduct: { connect: { id: r.parentId || id } },
                        childProduct: { connect: { id: r.childId || id } },
                        relationType: r.relationType!,
                        sortOrder: r.sortOrder!,
                        isRequired: r.isRequired!,
                    }
                });
            }
        }

        // 8. Process Variants (Corrigido)
        if (variants.length > 0) {
            const existingVariants = await prismaClient.productVariant.findMany({
                where: { product_id: id }
            });

            const variantIds = existingVariants.map(v => v.id);

            await Promise.all([
                prismaClient.variantAttribute.deleteMany({ where: { variant_id: { in: variantIds } } }),
                prismaClient.productImage.deleteMany({ where: { variant_id: { in: variantIds } } }),
                prismaClient.productVideo.deleteMany({ where: { variant_id: { in: variantIds } } }),
                prismaClient.productVariant.deleteMany({ where: { product_id: id } })
            ]);

            for (const v of variants) {
                const variantData = {
                    sku: v.sku,
                    price_per: v.price_per,
                    price_of: v.price_of,
                    stock: v.stock,
                    allowBackorders: v.allowBackorders,
                    sortOrder: v.sortOrder,
                    ean: v.ean,
                    mainPromotion_id: v.mainPromotion_id,
                    product_id: id
                };

                const createdVariant = await prismaClient.productVariant.create({
                    data: variantData
                });

                if (v.attributes?.length) {
                    await prismaClient.variantAttribute.createMany({
                        data: v.attributes.map(attr => ({
                            ...attr,
                            variant_id: createdVariant.id
                        }))
                    });
                }

                if (v.imageFiles?.length) {
                    await prismaClient.productImage.createMany({
                        data: v.imageFiles.map((file, idx) => ({
                            url: file.filename,
                            altText: file.originalname,
                            product_id: id,
                            variant_id: createdVariant.id,
                            isPrimary: idx === 0
                        }))
                    });
                }

                if (v.videoUrls?.length) {
                    await prismaClient.productVideo.createMany({
                        data: v.videoUrls.map((url, idx) => ({
                            url,
                            product_id: id,
                            variant_id: createdVariant.id,
                            isPrimary: idx === 0
                        }))
                    });
                }
            }
        }

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