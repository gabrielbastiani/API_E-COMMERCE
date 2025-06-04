// src/services/product/ProductUpdateDataService.ts

import prismaClient from "../../prisma"
import {
    StatusProduct,
    StatusDescriptionProduct,
    StatusVariant,
    ProductRelationType
} from "@prisma/client"
import fs from "fs"
import path from "path"

interface ProductRequest {
    id: string
    name?: string
    slug?: string
    metaTitle?: string
    metaDescription?: string
    keywords?: string[]
    brand?: string
    ean?: string
    description?: string
    skuMaster?: string
    price_of?: number
    price_per?: number
    weight?: number
    length?: number
    width?: number
    height?: number
    stock?: number
    status?: StatusProduct
    mainPromotion_id?: string | null
    videoLinks?: string[]
    categories?: string[]
    existingImages?: string[]
    descriptions?: {
        title: string
        description: string
        status?: StatusDescriptionProduct
    }[]
    variants?: Array<{
        id?: string
        sku: string
        price_of?: number
        price_per?: number
        stock: number
        allowBackorders?: boolean
        sortOrder?: number
        ean?: string
        mainPromotion_id?: string | null
        videoLinks?: string[]
        videos?: string[]
        existingImages?: string[]
        attributes: Array<{
            id?: string
            key: string
            value: string
            status?: StatusVariant
            existingImages?: string[]
        }>
    }>
    relations?: Array<{
        id?: string
        relationDirection: "child" | "parent"
        relatedProductId: string
        relationType: ProductRelationType
        sortOrder?: number
        isRequired?: boolean
    }>
}

export class ProductUpdateDataService {
    async execute(
        productData: ProductRequest,
        files: {
            images?: Express.Multer.File[]
            variantImages: Record<string, Express.Multer.File[]>
            attributeImages: Record<string, Record<number, Express.Multer.File[]>>
        }
    ) {
        const slugify = (s: string) =>
            s
                .normalize("NFD")
                .replace(/[\u0300-\u036f]/g, "")
                .toLowerCase()
                .replace(/ +/g, "-")
                .replace(/-{2,}/g, "-")
                .replace(/\//g, "-")

        return prismaClient.$transaction(async (prisma) => {
            const {
                id,
                name,
                metaTitle,
                metaDescription,
                keywords,
                brand,
                ean,
                description,
                skuMaster,
                price_of,
                price_per,
                weight,
                length,
                width,
                height,
                stock,
                status,
                mainPromotion_id
            } = productData

            //
            // 1) Atualiza dados básicos do produto
            //
            const dataToUpdate: Record<string, any> = {
                name,
                slug: name ? slugify(name) : undefined,
                metaTitle,
                metaDescription,
                keywords,
                brand,
                ean,
                description,
                skuMaster,
                price_of,
                price_per,
                weight,
                length,
                width,
                height,
                stock,
                status
            }

            // ——— Ajuste: inclui mainPromotion_id só se for UUID ou null ———
            if (mainPromotion_id === null) {
                dataToUpdate.mainPromotion_id = null
            } else if (
                typeof mainPromotion_id === "string" &&
                mainPromotion_id.trim() !== ""
            ) {
                dataToUpdate.mainPromotion_id = mainPromotion_id.trim()
            }

            await prisma.product.update({
                where: { id },
                data: dataToUpdate
            })

            //
            // 2) Vídeos de PRODUTO (remove todos e recria)
            //
            if (productData.videoLinks) {
                await prisma.productVideo.deleteMany({ where: { product_id: id } })
                const vids = productData.videoLinks.filter((u) => u.startsWith("http"))
                if (vids.length) {
                    await prisma.productVideo.createMany({
                        data: vids.map((url, i) => ({
                            product_id: id,
                            url,
                            isPrimary: i === 0
                        }))
                    })
                }
            }

            //
            // 3) Categorias de PRODUTO (remove todas e recria)
            //
            if (productData.categories) {
                await prisma.productCategory.deleteMany({ where: { product_id: id } })
                if (productData.categories.length) {
                    await prisma.productCategory.createMany({
                        data: productData.categories.map((catId) => ({
                            product_id: id,
                            category_id: catId
                        }))
                    })
                }
            }

            //
            // 4) Descrições de PRODUTO (remove e recria)
            //
            if (productData.descriptions) {
                await prisma.productDescription.deleteMany({ where: { product_id: id } })
                await prisma.productDescription.createMany({
                    data: productData.descriptions.map((d) => ({
                        product_id: id,
                        title: d.title,
                        description: d.description,
                        status: d.status ?? StatusDescriptionProduct.DISPONIVEL
                    }))
                })
            }

            //
            // 5) IMAGENS PRINCIPAIS (apaga as removidas e insere novas)
            //
            {
                const allMain = await prisma.productImage.findMany({
                    where: { product_id: id }
                })
                const keepMain = productData.existingImages ?? []
                const keepIdsMain = Array.isArray(productData.existingImages)
                    ? keepMain
                    : allMain.map((i) => i.id)

                const toDelete = allMain.filter((img) => !keepIdsMain.includes(img.id))
                const deleteIds = toDelete.map((i) => i.id)

                const imagesDir = path.join(process.cwd(), "images")
                toDelete.forEach((img) => {
                    const filePath = path.join(imagesDir, img.url)
                    if (fs.existsSync(filePath)) fs.unlinkSync(filePath)
                })

                if (deleteIds.length) {
                    await prisma.productImage.deleteMany({
                        where: { id: { in: deleteIds } }
                    })
                }

                const newMain = (files.images ?? []).map((f) => ({
                    product_id: id,
                    url: path.basename(f.path),
                    altText: f.originalname,
                    isPrimary: false
                }))
                if (newMain.length) {
                    await prisma.productImage.createMany({ data: newMain })
                }
            }

            // 6) VARIANTES + IMAGENS DE VARIANTE + ATRIBUTOS E IMAGENS DE ATRIBUTO

            if (productData.variants) {

                //
                // 6.2) Agora, cria/atualiza cada variante do payload
                //
                for (const vard of productData.variants) {
                    let vid = vard.id!

                    const existingVariant = await prisma.productVariant.findUnique({
                        where: { id: vid }
                    })

                    let promoIdToUse: string | null | undefined
                    if (typeof vard.mainPromotion_id === "string") {
                        const trimmed = vard.mainPromotion_id.trim()
                        promoIdToUse = trimmed === "" ? null : trimmed
                    } else {
                        // se vier undefined, deixamos undefined para não alterar o campo
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
                                ...(promoIdToUse === null
                                    ? { mainPromotion_id: null }
                                    : typeof promoIdToUse === "string"
                                        ? { mainPromotion_id: promoIdToUse }
                                        : {}),
                            }
                        })

                    } else {

                        const nv = await prisma.productVariant.create({
                            data: {
                                product_id: id,
                                sku: vard.sku,
                                price_of: Number(vard.price_of),
                                price_per: Number(vard.price_per!),
                                stock: vard.stock,
                                allowBackorders: vard.allowBackorders ?? false,
                                sortOrder: vard.sortOrder ?? 0,
                                ean: vard.ean,
                                ...(promoIdToUse === null
                                    ? { mainPromotion_id: null }
                                    : typeof promoIdToUse === "string"
                                        ? { mainPromotion_id: promoIdToUse }
                                        : {}),
                            }
                        })

                        // Ajustamos “vid” para usar o ID gerado pelo Prisma
                        const oldVid = vard.id!
                        vid = nv.id

                        // Se havia arquivos de imagem em files.variantImages[oldVid], transferimos para files.variantImages[vid]
                        if (files.variantImages[oldVid]) {
                            files.variantImages[vid] = files.variantImages[oldVid]
                            delete files.variantImages[oldVid]
                        }
                        // Mesmo para attributeImages:
                        if (files.attributeImages[oldVid]) {
                            files.attributeImages[vid] = files.attributeImages[oldVid]
                            delete files.attributeImages[oldVid]
                        }
                    }

                    //
                    // 6.3) VÍDEOS de VARIANTE (remove antigos e recria)
                    //
                    const variantVideosArray: string[] = Array.isArray(vard.videoLinks)
                        ? vard.videoLinks!
                        : Array.isArray((vard as any).videos)
                            ? (vard as any).videos
                            : []

                    await prisma.productVariantVideo.deleteMany({
                        where: { productVariant_id: vid }
                    })

                    if (variantVideosArray.length) {
                        await prisma.productVariantVideo.createMany({
                            data: variantVideosArray.map((url, i) => ({
                                productVariant_id: vid,
                                url,
                                isPrimary: i === 0
                            }))
                        })
                    }

                    //
                    // 6.4) IMAGENS de VARIANTE (remove removidas e insere novas)
                    //
                    const allVarImgs = await prisma.productVariantImage.findMany({
                        where: { productVariant_id: vid }
                    })

                    const keepVarImgs = Array.isArray(vard.existingImages)
                        ? vard.existingImages!
                        : allVarImgs.map((i) => i.id)

                    const toDel = allVarImgs.filter((i) => !keepVarImgs.includes(i.id))
                    const delIds = toDel.map((i) => i.id)

                    const imgDir = path.join(process.cwd(), "images")
                    toDel.forEach((i) => {
                        const filePath = path.join(imgDir, i.url)
                        if (fs.existsSync(filePath)) fs.unlinkSync(filePath)
                    })

                    if (delIds.length) {
                        await prisma.productVariantImage.deleteMany({
                            where: { id: { in: delIds } }
                        })
                    }

                    const incomingVarImgs = files.variantImages[vid] || []
                    const toCreateVarImgs = incomingVarImgs.map((f) => ({
                        productVariant_id: vid,
                        url: path.basename(f.path),
                        altText: f.originalname,
                        isPrimary: false
                    }))
                    if (toCreateVarImgs.length) {
                        await prisma.productVariantImage.createMany({ data: toCreateVarImgs })
                    }

                    //
                    // 6.5) ATRIBUTOS de VARIANTE + IMAGENS de ATRIBUTO
                    //
                    const allAttrsCurrent = await prisma.variantAttribute.findMany({
                        where: { variant_id: vid }
                    })
                    const keepAttrIds = Array.isArray(vard.attributes)
                        ? vard.attributes.filter((a) => a.id).map((a) => a.id!)
                        : []

                    const idsToRemoveAttrs = allAttrsCurrent
                        .map((a) => a.id)
                        .filter((idA) => !keepAttrIds.includes(idA))

                    if (idsToRemoveAttrs.length) {
                        const imgsToRemove = await prisma.variantAttributeImage.findMany({
                            where: { variantAttribute_id: { in: idsToRemoveAttrs } }
                        })
                        imgsToRemove.forEach((imgRec) => {
                            const filePath = path.join(imgDir, imgRec.url)
                            if (fs.existsSync(filePath)) fs.unlinkSync(filePath)
                        })
                        await prisma.variantAttributeImage.deleteMany({
                            where: { variantAttribute_id: { in: idsToRemoveAttrs } }
                        })
                        await prisma.variantAttribute.deleteMany({
                            where: { id: { in: idsToRemoveAttrs } }
                        })
                    }

                    for (let ai = 0; ai < vard.attributes.length; ai++) {
                        const a = vard.attributes[ai]
                        let aid: string

                        if (a.id) {
                            // Atributo existente → update
                            aid = a.id
                            await prisma.variantAttribute.update({
                                where: { id: aid },
                                data: {
                                    key: a.key,
                                    value: a.value,
                                    status: a.status ?? StatusVariant.DISPONIVEL
                                }
                            })
                        } else {
                            // Atributo novo → create
                            const na = await prisma.variantAttribute.create({
                                data: {
                                    variant_id: vid,
                                    key: a.key,
                                    value: a.value,
                                    status: a.status ?? StatusVariant.DISPONIVEL
                                }
                            })
                            aid = na.id
                        }

                        // 6.5.c) IMAGENS DE ATRIBUTO: remove removidas e insere novas
                        const currentImages = await prisma.variantAttributeImage.findMany({
                            where: { variantAttribute_id: aid }
                        })

                        const keepAttrImgs = Array.isArray(a.existingImages)
                            ? a.existingImages!
                            : currentImages.map((imgRec) => imgRec.id)

                        const toDeleteAttrImgs = currentImages.filter(
                            (imgRec) => !keepAttrImgs.includes(imgRec.id)
                        )
                        const deleteAttrIds = toDeleteAttrImgs.map((imgRec) => imgRec.id)

                        toDeleteAttrImgs.forEach((imgRec) => {
                            const filePath = path.join(imgDir, imgRec.url)
                            if (fs.existsSync(filePath)) fs.unlinkSync(filePath)
                        })

                        if (deleteAttrIds.length) {
                            await prisma.variantAttributeImage.deleteMany({
                                where: { id: { in: deleteAttrIds } }
                            })
                        }

                        const incomingAttrImgs = files.attributeImages[vid]?.[ai] || []
                        const toCreateAttrImgs = incomingAttrImgs.map((f) => ({
                            variantAttribute_id: aid,
                            url: path.basename(f.path),
                            altText: f.originalname,
                            isPrimary: false
                        }))
                        if (toCreateAttrImgs.length > 0) {
                            await prisma.variantAttributeImage.createMany({
                                data: toCreateAttrImgs
                            })
                        }
                    }
                }
            }
            //
            // 7) RELAÇÕES (UPDATE ⇄ DELETE ⇄ CREATE)
            //
            if (productData.relations) {
                // 7.1) Pegamos todos os IDs de relações já existentes no banco:
                const existingRelsInDb = await prisma.productRelation.findMany({
                    where: {
                        OR: [
                            { parentProduct_id: id },
                            { childProduct_id: id }
                        ]
                    },
                    select: { id: true }
                })
                const existingIdsInDb = existingRelsInDb.map(r => r.id)

                // 7.2) Dos objetos que vieram no payload, filtramos apenas os que têm id válido
                const incomingIds = productData.relations
                    .filter(r => typeof r.id === "string" && r.id.trim() !== "")
                    .map(r => r.id!) as string[]

                // 7.3) Identificamos quais IDs devem ser EXCLUÍDOS (existem no BD, mas não vieram no payload)
                const idsToDelete = existingIdsInDb.filter(dbId => !incomingIds.includes(dbId))
                if (idsToDelete.length) {
                    await prisma.productRelation.deleteMany({
                        where: { id: { in: idsToDelete } }
                    })
                }

                // 7.4) Agora, para cada relação do payload, ou atualizamos (se já existia) ou criamos
                for (const r of productData.relations) {
                    // Se o usuário deixou relatedProductId em branco, não recriamos/atualizamos
                    if (!r.relatedProductId || r.relatedProductId.trim() === "") {
                        continue
                    }

                    const isExisting =
                        typeof r.id === "string" && existingIdsInDb.includes(r.id!)
                    const isChild = r.relationDirection === "child"

                    if (isExisting) {
                        // Atualiza um registro existente:
                        await prisma.productRelation.update({
                            where: { id: r.id! },
                            data: {
                                relationType: r.relationType,
                                sortOrder: r.sortOrder ?? 0,
                                isRequired: r.isRequired ?? false,

                                // Se for “child” → relatedProductId é PAI
                                parentProduct_id: isChild ? r.relatedProductId : id,
                                childProduct_id: isChild ? id : r.relatedProductId
                            }
                        })
                    } else {
                        // Cria um registro novo:
                        await prisma.productRelation.create({
                            data: {
                                relationType: r.relationType,
                                sortOrder: r.sortOrder ?? 0,
                                isRequired: r.isRequired ?? false,

                                parentProduct: {
                                    connect: { id: isChild ? r.relatedProductId : id }
                                },
                                childProduct: {
                                    connect: { id: isChild ? id : r.relatedProductId }
                                }
                            }
                        })
                    }
                }
            }

            //
            // 8) Retorna o produto completo com todas as relações aninhadas
            //
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
                            variantAttribute: {
                                include: { variantAttributeImage: true }
                            }
                        }
                    },
                    productRelations: true,
                    childRelations: true,
                    parentRelations: true
                }
            })
        })
    }
}