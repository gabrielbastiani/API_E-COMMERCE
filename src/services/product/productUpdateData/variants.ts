import { IMAGES_DIR, removeFilesFromDisk } from "./utils";
/**
 * Remove variantes que existiam no banco mas não vieram no payload.
 * Isso inclui remoção de imagens (FS + DB), imagens de atributos, vídeos e os registros de variante/atributo.
 *
 * - prisma: transaction client
 * - productId: id do produto
 * - incomingVariantIds: string[] (ids presentes no payload; novos não presentes no DB não serão deletados)
 */
export async function handleVariantDeletions(
    prisma: any,
    productId: string,
    incomingVariantIds: string[]
) {
    // 1) busca variantes existentes no BD
    const existingVariants = await prisma.productVariant.findMany({
        where: { product_id: productId },
        select: { id: true }
    });
    const existingIds = existingVariants.map((v: { id: any; }) => v.id);

    // 2) decide quais ids serão removidos (existem no BD mas não vieram no payload)
    const idsToDelete = existingIds.filter((dbId: string) => !incomingVariantIds.includes(dbId));

    if (idsToDelete.length === 0) return;

    // 3) coleta todas as imagens de variante destas variantes
    const variantImgs = await prisma.productVariantImage.findMany({
        where: { productVariant_id: { in: idsToDelete } },
        select: { id: true, url: true }
    });

    // 4) coleta todos atributos destas variantes (para remover imagens de atributo)
    const attrs = await prisma.variantAttribute.findMany({
        where: { variant_id: { in: idsToDelete } },
        select: { id: true }
    });
    const attrIds = attrs.map((a: { id: any; }) => a.id);

    // 5) coleta imagens de atributo
    const attrImgs = attrIds.length
        ? await prisma.variantAttributeImage.findMany({
            where: { variantAttribute_id: { in: attrIds } },
            select: { id: true, url: true }
        })
        : [];

    // 6) remove arquivos do disco (defensivo — não quebra a transação)
    const filesToRemove = [
        ...variantImgs.map((i: { url: any; }) => `${IMAGES_DIR}/${i.url}`),
        ...attrImgs.map((i: { url: any; }) => `${IMAGES_DIR}/${i.url}`)
    ];
    removeFilesFromDisk(filesToRemove);

    // 7) deleta em ordem segura (imagens -> atributos -> vídeos -> variante)
    if (attrIds.length) {
        await prisma.variantAttributeImage.deleteMany({
            where: { variantAttribute_id: { in: attrIds } }
        });
        await prisma.variantAttribute.deleteMany({
            where: { id: { in: attrIds } }
        });
    }

    if (variantImgs.length) {
        const varImgIds = variantImgs.map((i: { id: any; }) => i.id);
        await prisma.productVariantImage.deleteMany({
            where: { id: { in: varImgIds } }
        });
    }

    // deleta vídeos de variante
    await prisma.productVariantVideo.deleteMany({
        where: { productVariant_id: { in: idsToDelete } }
    });

    // por fim remove as variantes
    await prisma.productVariant.deleteMany({
        where: { id: { in: idsToDelete } }
    });
}

/* ---------- restante do arquivo: funções para atualizar/criar variantes (mantive a lógica anterior) ---------- */

/**
 * Lida com variantes, imagens de variante e atributos.
 * - prisma: transaction client
 * - productId: id do produto
 * - variants: array vinda do payload
 * - filesVariantImages: Record<string, Express.Multer.File[]>
 * - filesAttributeImages: Record<string, Record<number, Express.Multer.File[]>>
 *
 * NOTE: este fluxo **assume** que handleVariantDeletions foi chamado *antes* e já removeu variantes que não devem mais existir.
 */
export async function handleVariants(
    prisma: any,
    productId: string,
    variants: any[],
    filesVariantImages: Record<string, Express.Multer.File[]>,
    filesAttributeImages: Record<string, Record<number, Express.Multer.File[]>>
) {
    if (!Array.isArray(variants)) return;

    for (const vard of variants) {
        let vid = vard.id!

        // 6.1) Se variante já existe, atualiza; senão cria...
        const existingVariant = await prisma.productVariant.findUnique({ where: { id: vid } })

        let promoIdToUse: string | null | undefined
        if (typeof vard.mainPromotion_id === "string") {
            const trimmed = vard.mainPromotion_id.trim()
            promoIdToUse = trimmed === "" ? null : trimmed
        } else {
            promoIdToUse = undefined
        }

        if (existingVariant) {
            await prisma.productVariant.update({
                where: { id: vid },
                data: {
                    sku: vard.sku,
                    price_of: vard.price_of,
                    price_per: vard.price_per!,
                    stock: vard.stock,
                    allowBackorders: vard.allowBackorders ?? false,
                    sortOrder: vard.sortOrder ?? 0,
                    ean: vard.ean,
                    ...(promoIdToUse === null ? { mainPromotion_id: null } : typeof promoIdToUse === "string" ? { mainPromotion_id: promoIdToUse } : {})
                }
            })
        } else {
            const nv = await prisma.productVariant.create({
                data: {
                    product_id: productId,
                    sku: vard.sku,
                    price_of: Number(vard.price_of),
                    price_per: Number(vard.price_per!),
                    stock: vard.stock,
                    allowBackorders: vard.allowBackorders ?? false,
                    sortOrder: vard.sortOrder ?? 0,
                    ean: vard.ean,
                    ...(promoIdToUse === null ? { mainPromotion_id: null } : typeof promoIdToUse === "string" ? { mainPromotion_id: promoIdToUse } : {})
                }
            })
            const oldVid = vard.id!
            vid = nv.id

            // move arquivos para novo vid (mesma lógica anterior)
            if (filesVariantImages[oldVid]) {
                filesVariantImages[vid] = filesVariantImages[oldVid]
                delete filesVariantImages[oldVid]
            }
            if (filesAttributeImages[oldVid]) {
                filesAttributeImages[vid] = filesAttributeImages[oldVid]
                delete filesAttributeImages[oldVid]
            }
        }

        // 6.2) vídeos de variante
        const variantVideosArray: string[] = Array.isArray(vard.videoLinks)
            ? vard.videoLinks!
            : Array.isArray((vard as any).videos)
                ? (vard as any).videos
                : []

        await prisma.productVariantVideo.deleteMany({ where: { productVariant_id: vid } })
        if (variantVideosArray.length) {
            await prisma.productVariantVideo.createMany({
                data: variantVideosArray.map((url: string, i: number) => ({ productVariant_id: vid, url, isPrimary: i === 0 }))
            })
        }

        // 6.3) imagens de variante
        await handleVariantImages(prisma, vid, vard, filesVariantImages[vid] || [])

        // 6.4) atributos de variante + imagens
        await handleVariantAttributes(prisma, vid, vard, filesAttributeImages[vid] || {})
    }
}

/* ---- helpers (idéia idêntica ao código que você já tinha) ---- */
async function handleVariantImages(prisma: any, vid: string, vard: any, incomingFilesForVariant: Express.Multer.File[]) {
    const allVarImgs = await prisma.productVariantImage.findMany({ where: { productVariant_id: vid } })
    const keepVarImgs = Array.isArray(vard.existingImages) ? vard.existingImages! : allVarImgs.map((i: { id: any; }) => i.id)
    const toDel = allVarImgs.filter((i: { id: any; }) => !keepVarImgs.includes(i.id))
    const delIds = toDel.map((i: { id: any; }) => i.id)

    removeFilesFromDisk(toDel.map((i: { url: any; }) => `${IMAGES_DIR}/${i.url}`))

    if (delIds.length) {
        await prisma.productVariantImage.deleteMany({ where: { id: { in: delIds } } })
    }

    const toCreateVarImgs = incomingFilesForVariant.map(f => ({
        productVariant_id: vid,
        url: pathBasename(f.path),
        altText: f.originalname,
        isPrimary: false
    }))
    if (toCreateVarImgs.length) {
        await prisma.productVariantImage.createMany({ data: toCreateVarImgs })
    }

    const updatedAllVarImgs = await prisma.productVariantImage.findMany({ where: { productVariant_id: vid } })
    await prisma.productVariantImage.updateMany({ where: { productVariant_id: vid }, data: { isPrimary: false } })

    if (vard.primaryImageId) {
        await prisma.productVariantImage.updateMany({ where: { id: vard.primaryImageId, productVariant_id: vid }, data: { isPrimary: true } })
    } else if (vard.primaryImageName) {
        const match = updatedAllVarImgs.find((img: { altText: any; }) => img.altText === vard.primaryImageName)
        if (match) {
            await prisma.productVariantImage.updateMany({ where: { id: match.id, productVariant_id: vid }, data: { isPrimary: true } })
        }
    }
}

async function handleVariantAttributes(prisma: any, vid: string, vard: any, incomingAttrFilesMap: Record<number, Express.Multer.File[]>) {
    const allAttrsCurrent = await prisma.variantAttribute.findMany({ where: { variant_id: vid } })
    const keepAttrIds = Array.isArray(vard.attributes) ? vard.attributes.filter((a: any) => a.id).map((a: any) => a.id!) : []
    const idsToRemoveAttrs = allAttrsCurrent.map((a: { id: any; }) => a.id).filter((idA: any) => !keepAttrIds.includes(idA))

    if (idsToRemoveAttrs.length) {
        const imgsToRemove = await prisma.variantAttributeImage.findMany({ where: { variantAttribute_id: { in: idsToRemoveAttrs } } })
        removeFilesFromDisk(imgsToRemove.map((x: { url: any; }) => `${IMAGES_DIR}/${x.url}`))
        await prisma.variantAttributeImage.deleteMany({ where: { variantAttribute_id: { in: idsToRemoveAttrs } } })
        await prisma.variantAttribute.deleteMany({ where: { id: { in: idsToRemoveAttrs } } })
    }

    for (let ai = 0; ai < (vard.attributes || []).length; ai++) {
        const a = vard.attributes[ai]
        let aid: string

        if (a.id) {
            aid = a.id
            await prisma.variantAttribute.update({ where: { id: aid }, data: { key: a.key, value: a.value, status: a.status ?? undefined } })
        } else {
            const na = await prisma.variantAttribute.create({ data: { variant_id: vid, key: a.key, value: a.value, status: a.status ?? undefined } })
            aid = na.id
        }

        const currentImages = await prisma.variantAttributeImage.findMany({ where: { variantAttribute_id: aid } })
        const keepAttrImgs = Array.isArray(a.existingImages) ? a.existingImages! : currentImages.map((imgRec: { id: any; }) => imgRec.id)
        const toDeleteAttrImgs = currentImages.filter((imgRec: { id: any; }) => !keepAttrImgs.includes(imgRec.id))

        removeFilesFromDisk(toDeleteAttrImgs.map((imgRec: { url: any; }) => `${IMAGES_DIR}/${imgRec.url}`))
        if (toDeleteAttrImgs.length) {
            await prisma.variantAttributeImage.deleteMany({ where: { id: { in: toDeleteAttrImgs.map((i: { id: any; }) => i.id) } } })
        }

        const incomingAttrImgs = (incomingAttrFilesMap[ai] || []).map(f => ({
            variantAttribute_id: aid,
            url: pathBasename(f.path),
            altText: f.originalname,
            isPrimary: false
        }))
        if (incomingAttrImgs.length > 0) {
            await prisma.variantAttributeImage.createMany({ data: incomingAttrImgs })
        }

        const updatedAttrImgs = await prisma.variantAttributeImage.findMany({ where: { variantAttribute_id: aid } })
        await prisma.variantAttributeImage.updateMany({ where: { variantAttribute_id: aid }, data: { isPrimary: false } })

        if (a.primaryAttributeImageId) {
            await prisma.variantAttributeImage.updateMany({ where: { id: a.primaryAttributeImageId, variantAttribute_id: aid }, data: { isPrimary: true } })
        } else if (a.primaryAttributeImageName) {
            const match = updatedAttrImgs.find((imgRec: { altText: any; }) => imgRec.altText === a.primaryAttributeImageName)
            if (match) {
                await prisma.variantAttributeImage.updateMany({ where: { id: match.id, variantAttribute_id: aid }, data: { isPrimary: true } })
            }
        }
    }
}

function pathBasename(p: string) {
    return p.split(/[\\/]/).pop() ?? p
}