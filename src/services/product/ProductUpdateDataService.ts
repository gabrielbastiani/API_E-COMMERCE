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
        // Pode vir como videoLinks (antigo) ou videos (frontend atual)
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

            // 1) Atualiza dados básicos do produto
            await prisma.product.update({
                where: { id },
                data: {
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
                    status,
                    mainPromotion_id
                }
            })

            // 2) Vídeos de PRODUTO (remove todos e recria)
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

            // 3) Categorias de PRODUTO (remove todas e recria)
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

            // 4) Descrições de PRODUTO (remove e recria)
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

            // 5) IMAGENS PRINCIPAIS (apaga as removidas e insere as novas)
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
                // 6.1) Identifica variantes removidas:
                //
                const keepVarIds = productData.variants
                    .filter((v) => v.id)
                    .map((v) => v.id!) as string[]

                // Busca todas as variantes deste produto no banco
                const allVariants = await prisma.productVariant.findMany({
                    where: { product_id: id },
                    select: { id: true }
                })
                const allVariantIds = allVariants.map((v) => v.id)

                // Quais IDs não vieram no payload → devem ser apagados
                const idsToRemoveVariants = allVariantIds.filter(
                    (vidNum) => !keepVarIds.includes(vidNum)
                )

                // ————— Para cada variante excluída, apaga em cascata —————
                for (const vidRemove of idsToRemoveVariants) {
                    // a) Vídeos de variante
                    await prisma.productVariantVideo.deleteMany({
                        where: { productVariant_id: vidRemove }
                    })
                    // b) Imagens de variante (arquivo + registro)
                    const varImgs = await prisma.productVariantImage.findMany({
                        where: { productVariant_id: vidRemove }
                    })
                    const imagesDir = path.join(process.cwd(), "images")
                    varImgs.forEach((imgRec) => {
                        const filePath = path.join(imagesDir, imgRec.url)
                        if (fs.existsSync(filePath)) fs.unlinkSync(filePath)
                    })
                    await prisma.productVariantImage.deleteMany({
                        where: { productVariant_id: vidRemove }
                    })

                    // c) Atributos e suas imagens
                    const attrsToRemove = await prisma.variantAttribute.findMany({
                        where: { variant_id: vidRemove },
                        select: { id: true }
                    })
                    const attrIds = attrsToRemove.map((a) => a.id)
                    if (attrIds.length) {
                        const allAttrImgs = await prisma.variantAttributeImage.findMany({
                            where: { variantAttribute_id: { in: attrIds } }
                        })
                        allAttrImgs.forEach((imgRec) => {
                            const filePath = path.join(imagesDir, imgRec.url)
                            if (fs.existsSync(filePath)) fs.unlinkSync(filePath)
                        })
                        await prisma.variantAttributeImage.deleteMany({
                            where: { variantAttribute_id: { in: attrIds } }
                        })
                        await prisma.variantAttribute.deleteMany({
                            where: { id: { in: attrIds } }
                        })
                    }

                    // d) Remove a própria variante
                    await prisma.productVariant.delete({ where: { id: vidRemove } })
                }

                //
                // 6.2) Agora, cria/atualiza cada variante do payload
                //
                for (const vard of productData.variants) {
                    // O frontend sempre envia vard.id (UUID gerado). Precisamos descobrir:
                    // se esse id existe no BD → update; caso contrário → create.
                    let vid = vard.id!

                    const existingVariant = await prisma.productVariant.findUnique({
                        where: { id: vid }
                    })

                    if (existingVariant) {
                        // Variante existente → update
                        await prisma.productVariant.update({
                            where: { id: vid },
                            data: {
                                sku: vard.sku,
                                price_of: vard.price_of,
                                price_per: vard.price_per,
                                stock: vard.stock,
                                allowBackorders: vard.allowBackorders,
                                sortOrder: vard.sortOrder,
                                ean: vard.ean,
                                mainPromotion_id: vard.mainPromotion_id
                            }
                        })
                    } else {
                        // Variante nova → create
                        const nv = await prisma.productVariant.create({
                            data: {
                                product_id: id,
                                sku: vard.sku,
                                price_of: Number(vard.price_of),
                                price_per: Number(vard.price_per),
                                stock: vard.stock,
                                allowBackorders: vard.allowBackorders ?? false,
                                sortOrder: vard.sortOrder ?? 0,
                                ean: vard.ean,
                                mainPromotion_id: vard.mainPromotion_id ?? null
                            }
                        })
                        // “vid” deve agora ser o id gerado pelo Prisma, não mais o UUID do front
                        const oldVid = vard.id!
                        vid = nv.id

                        // Transfere arquivos de imagem (que estavam em files.variantImages[oldVid])
                        if (files.variantImages[oldVid]) {
                            files.variantImages[vid] = files.variantImages[oldVid]
                            delete files.variantImages[oldVid]
                        }
                        // Mesma lógica para imagens de atributo (files.attributeImages)
                        if (files.attributeImages[oldVid]) {
                            files.attributeImages[vid] = files.attributeImages[oldVid]
                            delete files.attributeImages[oldVid]
                        }
                    }

                    //
                    // 6.3) VÍDEOS de VARIANTE (remove antigos e recria)
                    //
                    // Primeiro, monta o array correto de URLs de vídeo: pode vir em vard.videoLinks ou em vard.videos
                    const variantVideosArray: string[] = Array.isArray(vard.videoLinks)
                        ? vard.videoLinks!
                        : Array.isArray((vard as any).videos)
                            ? (vard as any).videos
                            : []

                    // Apaga todos os vídeos que já existiam para essa variante
                    await prisma.productVariantVideo.deleteMany({
                        where: { productVariant_id: vid }
                    })

                    // Insere cada URL como um novo registro
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

                    // Insere as novas imagens de variante (arquivos que vieram em files.variantImages[vid])
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
                    // 6.5.a) Remove atributos que não vieram no payload
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
                        // Apaga imagens de atributo em disco e no banco
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
                        // Apaga os próprios atributos
                        await prisma.variantAttribute.deleteMany({
                            where: { id: { in: idsToRemoveAttrs } }
                        })
                    }

                    // 6.5.b) Atualiza ou cria cada atributo restante ou novo
                    for (let ai = 0; ai < vard.attributes.length; ai++) {
                        const a = vard.attributes[ai]
                        let aid: string

                        if (a.id) {
                            // Attrib existente → update
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
                            // Attrib novo → create
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

                        // Insere novas imagens de atributo (arquivos que vieram em files.attributeImages[vid][ai])
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

            // 7) RELAÇÕES (remove todas e recria)
            if (productData.relations) {
                await prisma.productRelation.deleteMany({
                    where: {
                        OR: [{ parentProduct_id: id }, { childProduct_id: id }]
                    }
                })
                for (const r of productData.relations) {
                    const isChild = r.relationDirection === "child"
                    await prisma.productRelation.create({
                        data: {
                            relationType: r.relationType,
                            sortOrder: r.sortOrder ?? 0,
                            isRequired: r.isRequired ?? false,
                            parentProduct: {
                                connect: { id: isChild ? id : r.relatedProductId }
                            },
                            childProduct: {
                                connect: { id: isChild ? r.relatedProductId : id }
                            }
                        }
                    })
                }
            }

            // 8) Retorna o produto completo com todas as relações aninhadas
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