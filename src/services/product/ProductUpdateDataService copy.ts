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
    buyTogether_id?: string | null

    // Novos campos para indicar qual imagem principal do produto
    primaryMainImageId?: string
    primaryMainImageName?: string

    videoLinks?: string[]
    categories?: string[]
    existingImages?: string[] // lista de IDs das imagens que o usuário quer manter
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

        // Novos campos para indicar qual imagem principal da variante
        primaryImageId?: string
        primaryImageName?: string

        videoLinks?: string[]
        videos?: string[]
        existingImages?: string[] // lista de IDs das imagens de variante que o usuário quer manter

        attributes: Array<{
            id?: string
            key: string
            value: string
            status?: StatusVariant

            // Novos campos para indicar qual imagem principal do atributo
            primaryAttributeImageId?: string
            primaryAttributeImageName?: string

            existingImages?: string[] // lista de IDs das imagens do atributo que o usuário quer manter
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
                mainPromotion_id,
                buyTogether_id,
                primaryMainImageId,
                primaryMainImageName,

                videoLinks,
                categories,
                existingImages,
                descriptions,
                variants,
                relations,
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

            if (mainPromotion_id === null) {
                dataToUpdate.mainPromotion_id = null
            } else if (
                typeof mainPromotion_id === "string" &&
                mainPromotion_id.trim() !== ""
            ) {
                dataToUpdate.mainPromotion_id = mainPromotion_id.trim()
            }

            if (buyTogether_id === null) dataToUpdate.buyTogether_id = null
            else if (typeof buyTogether_id === "string" && buyTogether_id.trim() !== "")
                dataToUpdate.buyTogether_id = buyTogether_id.trim()

            await prisma.product.update({
                where: { id },
                data: dataToUpdate
            })

            //
            // 2) Vídeos de PRODUTO (remove todos e recria)
            //
            if (videoLinks) {
                await prisma.productVideo.deleteMany({ where: { product_id: id } })
                const vids = videoLinks.filter((u) => u.startsWith("http"))
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
            if (categories) {
                await prisma.productCategory.deleteMany({ where: { product_id: id } })
                if (categories.length) {
                    await prisma.productCategory.createMany({
                        data: categories.map((catId) => ({
                            product_id: id,
                            category_id: catId
                        }))
                    })
                }
            }

            //
            // 4) Descrições de PRODUTO (remove e recria)
            //
            if (descriptions) {
                await prisma.productDescription.deleteMany({ where: { product_id: id } })
                await prisma.productDescription.createMany({
                    data: descriptions.map((d) => ({
                        product_id: id,
                        title: d.title,
                        description: d.description,
                        status: d.status ?? StatusDescriptionProduct.DISPONIVEL
                    }))
                })
            }

            //
            // 5) IMAGENS PRINCIPAIS do PRODUTO (remove as que não estão em existingImages e insere novas)
            //
            {
                // 5.1) Busca todas as imagens atuais do produto
                const allMain = await prisma.productImage.findMany({
                    where: { product_id: id }
                })

                // 5.2) Decide quais manter: se existingImages for array de IDs, mantém apenas aqueles IDs
                const keepIdsMain = Array.isArray(existingImages)
                    ? existingImages
                    : allMain.map((i) => i.id)

                // 5.3) Exclui do disco e do banco as que não foram marcadas como existentes
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

                // 5.4) Cria novas imagens (todas com isPrimary = false)
                const newMainFiles = files.images ?? []
                const newMainData = newMainFiles.map((f) => ({
                    product_id: id,
                    url: path.basename(f.path),
                    altText: f.originalname,
                    isPrimary: false
                }))
                if (newMainData.length) {
                    await prisma.productImage.createMany({ data: newMainData })
                }

                // 5.5) Re‐busca todas as imagens (já existentes + recém‐inseridas)
                const updatedAllMain = await prisma.productImage.findMany({
                    where: { product_id: id }
                })

                // 5.6) Zera todos os isPrimary
                await prisma.productImage.updateMany({
                    where: { product_id: id },
                    data: { isPrimary: false }
                })

                // 5.7) Se houve primaryMainImageId, marca-o como isPrimary = true
                if (primaryMainImageId) {
                    await prisma.productImage.update({
                        where: { id: primaryMainImageId },
                        data: { isPrimary: true }
                    })
                }
                // 5.8) Se não houve primaryMainImageId mas houve primaryMainImageName,
                // procura por altText=nome e marca esse
                else if (primaryMainImageName) {
                    const match = updatedAllMain.find(
                        (img) => img.altText === primaryMainImageName
                    )
                    if (match) {
                        await prisma.productImage.update({
                            where: { id: match.id },
                            data: { isPrimary: true }
                        })
                    }
                }
            }

            //
            // 6) VARIANTES + IMAGENS DE VARIANTE + ATRIBUTOS E IMAGENS DE ATRIBUTO
            //
            if (variants) {
                for (const vard of variants) {
                    let vid = vard.id!

                    // 6.1) Se variante já existe, atualiza; senão, cria nova
                    const existingVariant = await prisma.productVariant.findUnique({
                        where: { id: vid }
                    })

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
                                ...(promoIdToUse === null
                                    ? { mainPromotion_id: null }
                                    : typeof promoIdToUse === "string"
                                        ? { mainPromotion_id: promoIdToUse }
                                        : {})
                            }
                        })
                    } else {
                        // cria nova variante
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
                                        : {})
                            }
                        })
                        // ajusta o ID para o novo gerado
                        const oldVid = vard.id!
                        vid = nv.id

                        // move os arquivos de files.variantImages[oldVid] para [vid]
                        if (files.variantImages[oldVid]) {
                            files.variantImages[vid] = files.variantImages[oldVid]
                            delete files.variantImages[oldVid]
                        }
                        // mesmo para attributeImages
                        if (files.attributeImages[oldVid]) {
                            files.attributeImages[vid] = files.attributeImages[oldVid]
                            delete files.attributeImages[oldVid]
                        }
                    }

                    //
                    // 6.2) Vídeos de VARIANTE (remove e recria)
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
                    // 6.3) IMAGENS DE VARIANTE (remove removidas e insere novas)
                    //
                    {
                        // 6.3.a) busca todas as imagens atuais desta variante
                        const allVarImgs = await prisma.productVariantImage.findMany({
                            where: { productVariant_id: vid }
                        })

                        // 6.3.b) decide quais manter (ids vindos em vard.existingImages)
                        const keepVarImgs = Array.isArray(vard.existingImages)
                            ? vard.existingImages!
                            : allVarImgs.map((i) => i.id)

                        // 6.3.c) exclui do disco e banco as que não foram marcadas como existentes
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

                        // 6.3.d) cria novas imagens de variante (todas com isPrimary = false)
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

                        // 6.3.e) re‐busca todas as imagens de variante
                        const updatedAllVarImgs = await prisma.productVariantImage.findMany({
                            where: { productVariant_id: vid }
                        })

                        // 6.3.f) zera todos os isPrimary para esta variante
                        await prisma.productVariantImage.updateMany({
                            where: { productVariant_id: vid },
                            data: { isPrimary: false }
                        })

                        // 6.3.g) se houver primaryImageId em vard, marca esse ID como isPrimary
                        if (vard.primaryImageId) {
                            await prisma.productVariantImage.update({
                                where: { id: vard.primaryImageId },
                                data: { isPrimary: true }
                            })
                        }
                        // 6.3.h) senão, se houver primaryImageName, procura altText=nome e marca
                        else if (vard.primaryImageName) {
                            const match = updatedAllVarImgs.find(
                                (img) => img.altText === vard.primaryImageName
                            )
                            if (match) {
                                await prisma.productVariantImage.update({
                                    where: { id: match.id },
                                    data: { isPrimary: true }
                                })
                            }
                        }
                    }

                    //
                    // 6.4) ATRIBUTOS de VARIANTE + IMAGENS de ATRIBUTO
                    //
                    {
                        // 6.4.a) recupera todos os atributos atuais
                        const allAttrsCurrent = await prisma.variantAttribute.findMany({
                            where: { variant_id: vid }
                        })
                        // 6.4.b) decide quais IDs de atributos manter
                        const keepAttrIds = Array.isArray(vard.attributes)
                            ? vard.attributes.filter((a) => a.id).map((a) => a.id!)
                            : []
                        // 6.4.c) atributos a serem removidos
                        const idsToRemoveAttrs = allAttrsCurrent
                            .map((a) => a.id)
                            .filter((idA) => !keepAttrIds.includes(idA))

                        if (idsToRemoveAttrs.length) {
                            // remove imagens desses atributos
                            const imgsToRemove = await prisma.variantAttributeImage.findMany({
                                where: { variantAttribute_id: { in: idsToRemoveAttrs } }
                            })
                            const imgDir = path.join(process.cwd(), "images")
                            imgsToRemove.forEach((imgRec) => {
                                const filePath = path.join(imgDir, imgRec.url)
                                if (fs.existsSync(filePath)) fs.unlinkSync(filePath)
                            })
                            // deleta imagens de atributo no banco
                            await prisma.variantAttributeImage.deleteMany({
                                where: { variantAttribute_id: { in: idsToRemoveAttrs } }
                            })
                            // deleta atributos em si
                            await prisma.variantAttribute.deleteMany({
                                where: { id: { in: idsToRemoveAttrs } }
                            })
                        }

                        // 6.4.d) itera sobre cada atributo passado no payload
                        for (let ai = 0; ai < vard.attributes.length; ai++) {
                            const a = vard.attributes[ai]
                            let aid: string

                            if (a.id) {
                                // atributo existente → update
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
                                // atributo novo → create
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

                            //
                            // 6.4.e) IMAGENS DE ATRIBUTO: remove removidas e insere novas
                            //
                            {
                                // 6.4.e.1) busca todas as imagens atuais deste atributo
                                const currentImages = await prisma.variantAttributeImage.findMany({
                                    where: { variantAttribute_id: aid }
                                })

                                // 6.4.e.2) decide quais manter (ids vindos em a.existingImages)
                                const keepAttrImgs = Array.isArray(a.existingImages)
                                    ? a.existingImages!
                                    : currentImages.map((imgRec) => imgRec.id)

                                // 6.4.e.3) exclui do disco e banco as que não foram marcadas como existentes
                                const toDeleteAttrImgs = currentImages.filter(
                                    (imgRec) => !keepAttrImgs.includes(imgRec.id)
                                )
                                const deleteAttrIds = toDeleteAttrImgs.map((imgRec) => imgRec.id)

                                const imgDir = path.join(process.cwd(), "images")
                                toDeleteAttrImgs.forEach((imgRec) => {
                                    const filePath = path.join(imgDir, imgRec.url)
                                    if (fs.existsSync(filePath)) fs.unlinkSync(filePath)
                                })

                                if (deleteAttrIds.length) {
                                    await prisma.variantAttributeImage.deleteMany({
                                        where: { id: { in: deleteAttrIds } }
                                    })
                                }

                                // 6.4.e.4) cria novas imagens de atributo (todas com isPrimary = false)
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

                                // 6.4.e.5) re‐busca todas as imagens deste atributo
                                const updatedAttrImgs = await prisma.variantAttributeImage.findMany({
                                    where: { variantAttribute_id: aid }
                                })

                                // 6.4.e.6) zera todos os isPrimary para este atributo
                                await prisma.variantAttributeImage.updateMany({
                                    where: { variantAttribute_id: aid },
                                    data: { isPrimary: false }
                                })

                                // 6.4.e.7) se houver primaryAttributeImageId, marca-o
                                if (a.primaryAttributeImageId) {
                                    await prisma.variantAttributeImage.update({
                                        where: { id: a.primaryAttributeImageId },
                                        data: { isPrimary: true }
                                    })
                                }
                                // 6.4.e.8) senão, se houver primaryAttributeImageName,
                                // procura por altText=nome e marca
                                else if (a.primaryAttributeImageName) {
                                    const match = updatedAttrImgs.find(
                                        (imgRec) => imgRec.altText === a.primaryAttributeImageName
                                    )
                                    if (match) {
                                        await prisma.variantAttributeImage.update({
                                            where: { id: match.id },
                                            data: { isPrimary: true }
                                        })
                                    }
                                }
                            }
                        }
                    }
                }
            }

            //
            // 7) RELAÇÕES (UPDATE ⇄ DELETE ⇄ CREATE)
            //
            if (relations) {
                // 7.1) busca IDs atuais de relações no banco
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

                // 7.2) IDs vindos no payload (só os que tiverem id válido)
                const incomingIds = relations
                    .filter(r => typeof r.id === "string" && r.id.trim() !== "")
                    .map(r => r.id!) as string[]

                // 7.3) IDs a excluir (existem no BD, mas não vieram no payload)
                const idsToDelete = existingIdsInDb.filter(dbId => !incomingIds.includes(dbId))
                if (idsToDelete.length) {
                    await prisma.productRelation.deleteMany({
                        where: { id: { in: idsToDelete } }
                    })
                }

                // 7.4) Para cada relação do payload, atualiza se já existia ou cria nova
                for (const r of relations) {
                    if (!r.relatedProductId || r.relatedProductId.trim() === "") {
                        continue
                    }
                    const isExisting = typeof r.id === "string" && existingIdsInDb.includes(r.id!)
                    const isChild = r.relationDirection === "child"

                    if (isExisting) {
                        await prisma.productRelation.update({
                            where: { id: r.id! },
                            data: {
                                relationType: r.relationType,
                                sortOrder: r.sortOrder ?? 0,
                                isRequired: r.isRequired ?? false,
                                parentProduct_id: isChild ? r.relatedProductId : id,
                                childProduct_id: isChild ? id : r.relatedProductId
                            }
                        })
                    } else {
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