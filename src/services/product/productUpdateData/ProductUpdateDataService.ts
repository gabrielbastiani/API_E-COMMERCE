import prismaClient from "../../../prisma";
import { updateBasicProduct } from "./basic";
import { handleProductVideos } from "./videos";
import { handleCategories } from "./categories";
import { handleDescriptions } from "./descriptions";
import { handleProductImages } from "./images";
import { handleVariants, handleVariantDeletions } from "./variants";
import { handleRelations } from "./relations";
import fs from "fs";
import path from "path";

export class ProductUpdateDataService {
    /**
     * productData: (see caller) includes `characteristics?: { id?, key, value, imageName? }[]`
     * files: {
     *   images?: Express.Multer.File[],
     *   variantImages: Record<string, Express.Multer.File[]>,
     *   attributeImages: Record<string, Record<number, Express.Multer.File[]>>,
     *   characteristicImages?: Express.Multer.File[]
     * }
     */
    async execute(productData: any, files: { images?: Express.Multer.File[]; variantImages: Record<string, Express.Multer.File[]>; attributeImages: Record<string, Record<number, Express.Multer.File[]>>; characteristicImages?: Express.Multer.File[] }) {
        // filesToDelete coletará nomes de arquivos que devem ser excluídos do disco
        const filesToDelete: string[] = [];

        // executa a transação e retorna o produto atualizado (sem deletar arquivos do disco ainda)
        const updatedProduct = await prismaClient.$transaction(async (prisma) => {
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
                weight, length, width, height, stock, status, mainPromotion_id, buyTogether_id,
                characteristics // incoming characteristics (may be undefined)
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

            // 8) Características — create / update / delete
            if (Array.isArray(characteristics)) {
                await this.handleCharacteristics(prisma, id, characteristics, files.characteristicImages ?? [], filesToDelete);
            }

            // 9) Retorna produto completo
            const product = await prisma.product.findUnique({
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
                    parentRelations: true,
                    productCharacteristics: true
                }
            });

            return product;
        });

        // Fora da transação: exclui arquivos marcados (para não apagar arquivos se a transação falhar)
        for (const filename of filesToDelete) {
            try {
                // caminho assumido: pasta 'images' na raiz do projeto backend (consistente com uploadConfig.upload('./images'))
                const filePath = path.join(process.cwd(), 'images', filename);
                if (fs.existsSync(filePath)) {
                    await fs.promises.unlink(filePath);
                }
            } catch (err) {
                // loga e continua — exclusão de arquivo é "best-effort"
                console.warn('ProductUpdateDataService: falha ao apagar arquivo agendado:', filename, err);
            }
        }

        return updatedProduct;
    }

    /**
     * handleCharacteristics:
     * - recebe lista `incoming` com itens { id?, key, value, imageName? }
     * - usa `uploadedFiles` (array de multer file objects) para casar uploads nov@s
     * - cria novos, atualiza existentes, deleta removidos; agenda exclusão de arquivos antigos em filesToDelete
     */
    private async handleCharacteristics(prisma: any, product_id: string, incoming: any[], uploadedFiles: Express.Multer.File[], filesToDelete: string[]) {
        // Busca existentes
        const existing = await prisma.productCharacteristics.findMany({ where: { product_id } });

        // Mapas rápidos
        const existingById = new Map<string, any>();
        for (const e of existing) existingById.set(e.id, e);

        const incomingIds = new Set<string>();
        for (const item of incoming) {
            if (item && typeof item.id === 'string' && item.id.trim() !== '') incomingIds.add(item.id);
        }

        // 1) Deletar características removidas (existentes que não estão no incomingIds)
        for (const e of existing) {
            if (!incomingIds.has(e.id)) {
                try {
                    await prisma.productCharacteristics.delete({ where: { id: e.id } });
                    // agenda remoção do arquivo (se existir)
                    if (e.image) filesToDelete.push(e.image);
                } catch (err) {
                    console.error('handleCharacteristics: erro ao deletar característica', e.id, err);
                }
            }
        }

        // 2) Iterar incoming: update (se id) ou create (se não)
        for (const item of incoming) {
            const key = typeof item?.key === 'string' ? String(item.key).trim() : null;
            const value = typeof item?.value === 'string' ? String(item.value).trim() : null;
            const imageName = item?.imageName ?? null;
            const id = item?.id ?? null;

            if (!key || !value) {
                console.warn('handleCharacteristics: ignorando item inválido (key/value ausente):', item);
                continue;
            }

            // função util para localizar uploaded file by imageName
            const resolveUploaded = (name: string | null) => {
                if (!name) return null;
                // match originalname or filename
                const match = uploadedFiles.find(f => f.originalname === name || f.filename === name);
                if (!match) return null;
                // resolve basename similar ao create flow
                const resolved = match.path ? path.basename(match.path) :
                    (match.destination && match.filename ? path.basename(path.join(match.destination, match.filename)) : (match.filename || match.originalname));
                return resolved;
            };

            if (id && existingById.has(id)) {
                // update
                const existingRec = existingById.get(id);
                const updateData: any = { key, value };

                // Cases for image handling:
                // - incoming.imageName provided AND matches an uploaded file -> replace image (schedule old for deletion if different)
                // - incoming.imageName provided but no uploaded file -> if equals existingRec.image -> keep as-is; else do nothing
                // - incoming.imageName === null -> means user removed the image -> set image to null and schedule delete old if exists
                if (imageName === null) {
                    if (existingRec.image) {
                        // clear image
                        updateData.image = null;
                        filesToDelete.push(existingRec.image);
                    }
                } else if (typeof imageName === 'string' && imageName.trim() !== '') {
                    const resolved = resolveUploaded(imageName);
                    if (resolved) {
                        // if different from existing, schedule deletion of existing
                        if (existingRec.image && existingRec.image !== resolved) {
                            filesToDelete.push(existingRec.image);
                        }
                        updateData.image = resolved;
                    } else {
                        // no uploaded file found for this name — maybe client kept existing name (no change)
                        // if incoming imageName equals existingRec.image, do nothing; else, keep existing image
                        if (existingRec.image && existingRec.image === imageName) {
                            // nothing
                        } else {
                            // no file uploaded and imageName different: don't change image (safer) — or optionally set null
                            // we choose to not alter image in this ambiguous case
                        }
                    }
                }

                try {
                    await prisma.productCharacteristics.update({
                        where: { id },
                        data: updateData
                    });
                } catch (err) {
                    console.error('handleCharacteristics: erro ao atualizar característica', id, err);
                }
            } else {
                // create new
                let imageResolved: string | null = null;
                if (imageName) {
                    const resolved = resolveUploaded(imageName);
                    if (resolved) imageResolved = resolved;
                    else {
                        // if no uploaded file matches, maybe imageName corresponds to an existing file in images folder
                        imageResolved = imageName;
                    }
                }

                try {
                    await prisma.productCharacteristics.create({
                        data: {
                            product_id,
                            key,
                            value,
                            image: imageResolved
                        }
                    });
                } catch (err) {
                    console.error('handleCharacteristics: erro ao criar característica', { product_id, key, value, image: imageResolved }, err);
                }
            }
        }
    }
}