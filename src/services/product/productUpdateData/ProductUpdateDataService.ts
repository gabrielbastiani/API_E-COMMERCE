import prismaClient from "../../../prisma";
import { updateBasicProduct } from "./basic";
import { handleProductVideos } from "./videos";
import { handleCategories } from "./categories";
import { handleDescriptions } from "./descriptions";
import { handleProductImages } from "./images";
import { handleVariants, handleVariantDeletions } from "./variants";
import { handleRelations } from "./relations";

export class ProductUpdateDataService {
    async execute(productData: any, files: { images?: Express.Multer.File[]; variantImages: Record<string, Express.Multer.File[]>; attributeImages: Record<string, Record<number, Express.Multer.File[]>>; }) {
        return prismaClient.$transaction(async (prisma) => {
            const {
                id,
                videoLinks,
                categories,
                existingImages,
                descriptions,
                variants,
                relations,
                primaryMainImageId,
                primaryMainImageName,
                // campos básicos...
                name, metaTitle, metaDescription, keywords, brand, ean, description, skuMaster, price_of, price_per,
                weight, length, width, height, stock, status, mainPromotion_id, buyTogether_id
            } = productData;

            // 1) Atualiza dados básicos
            await updateBasicProduct(prisma, id, { name, metaTitle, metaDescription, keywords, brand, ean, description, skuMaster, price_of, price_per, weight, length, width, height, stock, status, mainPromotion_id, buyTogether_id });

            // 2) Vídeos do produto
            await handleProductVideos(prisma, id, videoLinks);

            // 3) Categorias
            await handleCategories(prisma, id, categories);

            // 4) Descrições
            await handleDescriptions(prisma, id, descriptions);

            // 5) Imagens principais
            await handleProductImages(prisma, id, files.images ?? [], existingImages, primaryMainImageId, primaryMainImageName);

            // --- NOVO: DELETA VARIANTES REMOVIDAS PELO CMS ---
            const incomingVariantIds: string[] = Array.isArray(variants) ? variants.filter((v: any) => typeof v.id === "string" && v.id.trim() !== "").map((v: any) => v.id) : [];
            await handleVariantDeletions(prisma, id, incomingVariantIds);

            // 6) VARIANTES (create/update) — após deleção
            await handleVariants(prisma, id, variants ?? [], files.variantImages ?? {}, files.attributeImages ?? {});

            // 7) Relações
            await handleRelations(prisma, id, relations ?? []);

            // 8) Retorna produto completo
            return prisma.product.findUnique({
                where: { id },
                include: {
                    categories: true,
                    productsDescriptions: true,
                    images: true,
                    videos: true,
                    variants: {
                        include: {
                            productVariantVideo: true,
                            productVariantImage: true,
                            variantAttribute: { include: { variantAttributeImage: true } }
                        }
                    },
                    productRelations: true,
                    childRelations: true,
                    parentRelations: true
                }
            });
        });
    }
}