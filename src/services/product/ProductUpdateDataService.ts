import prismaClient from "../../prisma";
import {
    ProductRelationType,
    StatusDescriptionProduct,
    StatusProduct,
    StatusVariant,
} from "@prisma/client";
import fs from "fs";
import path from "path";

interface ProductRequest {
    id: string;
    name?: string;
    slug?: string;
    metaTitle?: string;
    metaDescription?: string;
    keywords?: string[];
    brand?: string;
    ean?: string;
    description?: string;
    skuMaster?: string;
    price_of?: number;
    price_per?: number;
    weight?: number;
    length?: number;
    width?: number;
    height?: number;
    stock?: number;
    status?: StatusProduct;
    mainPromotion_id?: string | null;
    videoLinks?: string[];
    categories?: string[];
    existingImages?: string[];
    descriptions?: { title: string; description: string; status?: StatusDescriptionProduct }[];
    variants?: Array<{
        id?: string;
        sku: string;
        price_of?: number;
        price_per?: number;
        stock: number;
        allowBackorders?: boolean;
        sortOrder?: number;
        ean?: string;
        mainPromotion_id?: string | null;
        videoLinks?: string[];
        existingImages?: string[];
        attributes: Array<{
            id?: string;
            key: string;
            value: string;
            status?: StatusVariant;
            existingImages?: string[];
        }>;
    }>;
    relations?: Array<{
        relationDirection: "child" | "parent";
        relatedProductId: string;
        relationType: ProductRelationType;
        sortOrder?: number;
        isRequired?: boolean;
    }>;
}

export class ProductUpdateDataService {
    async execute(
        productData: ProductRequest,
        files: {
            images?: Express.Multer.File[];
            variantImages: Record<string, Express.Multer.File[]>;
            attributeImages: Record<string, Record<number, Express.Multer.File[]>>;
        }
    ) {
        const slugify = (s: string) =>
            s.normalize("NFD")
                .replace(/[\u0300-\u036f]/g, "")
                .toLowerCase()
                .replace(/ +/g, "-")
                .replace(/-{2,}/g, "-")
                .replace(/\//g, "-");

        return await prismaClient.$transaction(async (prisma) => {
            const {
                id, name, metaTitle, metaDescription, keywords, brand,
                ean, description, skuMaster, price_of, price_per,
                weight, length, width, height, stock,
                status, mainPromotion_id
            } = productData;

            // ————————————
            // 1) atualiza campos básicos…
            await prisma.product.update({
                where: { id },
                data: {
                    name,
                    slug: name ? slugify(name) : undefined,
                    metaTitle, metaDescription, keywords, brand,
                    ean, description, skuMaster, price_of, price_per,
                    weight, length, width, height, stock,
                    status, mainPromotion_id
                },
            });

            // ————————————
            // 2) vídeos do produto…
            if (productData.videoLinks) {
                await prisma.productVideo.deleteMany({ where: { product_id: id } });
                const vids = productData.videoLinks.filter(u => u.startsWith("http"));
                if (vids.length) {
                    await prisma.productVideo.createMany({
                        data: vids.map((url, i) => ({
                            product_id: id,
                            url,
                            isPrimary: i === 0
                        }))
                    });
                }
            }

            // ————————————
            // 3) categorias…
            if (productData.categories) {
                await prisma.productCategory.deleteMany({ where: { product_id: id } });
                if (productData.categories.length) {
                    await prisma.productCategory.createMany({
                        data: productData.categories.map(catId => ({
                            product_id: id,
                            category_id: catId
                        }))
                    });
                }
            }

            // ————————————
            // 4) descrições…
            if (productData.descriptions) {
                await prisma.productDescription.deleteMany({ where: { product_id: id } });
                await prisma.productDescription.createMany({
                    data: productData.descriptions.map(d => ({
                        product_id: id,
                        title: d.title,
                        description: d.description,
                        status: d.status ?? StatusDescriptionProduct.DISPONIVEL
                    }))
                });
            }

            // ————————————
            // 5) imagens principais…
            {
                const allMain = await prisma.productImage.findMany({ where: { product_id: id } });
                const keepMain = productData.existingImages ?? [];
                const toDelete = allMain.filter(img => !keepMain.includes(img.id));
                const deleteIds = toDelete.map(i => i.id);

                // fisicamente
                const imagesDir = path.join(process.cwd(), "images");
                toDelete.forEach(img => {
                    const p = path.join(imagesDir, img.url);
                    if (fs.existsSync(p)) fs.unlinkSync(p);
                });

                if (deleteIds.length) {
                    await prisma.productImage.deleteMany({ where: { id: { in: deleteIds } } });
                }

                // uploads novos
                const newMain = (files.images ?? []).map(f => ({
                    product_id: id,
                    url: path.basename(f.path),
                    altText: f.originalname,
                    isPrimary: false
                }));
                if (newMain.length) {
                    await prisma.productImage.createMany({ data: newMain });
                }
            }

            // ————————————
            // 6) variantes, imagens de variante e imagens de atributo
            if (productData.variants) {
                // remove as variantes que não vieram
                const keepIds = productData.variants.filter(v => v.id).map(v => v.id!) as string[];
                await prisma.productVariant.deleteMany({
                    where: { product_id: id, id: { notIn: keepIds } }
                });

                for (const vard of productData.variants) {
                    // cria ou atualiza a variante
                    let vid = vard.id!;
                    if (vard.id) {
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
                        });
                    } else {
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
                        });
                        vid = nv.id;
                    }

                    // — imagens de variante —
                    {
                        const all = await prisma.productVariantImage.findMany({
                            where: { productVariant_id: vid }
                        });
                        const keep = vard.existingImages ?? [];
                        const toDel = all.filter(i => !keep.includes(i.id));
                        const delIds = toDel.map(i => i.id);

                        // delete arquivo
                        const imgDir = path.join(process.cwd(), "images");
                        toDel.forEach(i => {
                            const p = path.join(imgDir, i.url);
                            if (fs.existsSync(p)) fs.unlinkSync(p);
                        });

                        if (delIds.length) {
                            await prisma.productVariantImage.deleteMany({
                                where: { id: { in: delIds } }
                            });
                        }

                        // agora insere só os arquivos que chegaram para esta variante
                        const incoming = files.variantImages[vid] || [];
                        const toCreate = incoming.map(f => ({
                            productVariant_id: vid,
                            url: path.basename(f.path),
                            altText: f.originalname,
                            isPrimary: false
                        }));
                        if (toCreate.length) {
                            await prisma.productVariantImage.createMany({ data: toCreate });
                        }
                    }

                    // — atributos e imagens de atributo —
                    {
                        // apaga atributos removidos
                        const keepAttrIds = vard.attributes.filter(a => a.id).map(a => a.id!) as string[];
                        await prisma.variantAttribute.deleteMany({
                            where: { variant_id: vid, id: { notIn: keepAttrIds } }
                        });

                        for (let ai = 0; ai < vard.attributes.length; ai++) {
                            const a = vard.attributes[ai];
                            let aid = a.id!;
                            if (a.id) {
                                await prisma.variantAttribute.update({
                                    where: { id: aid },
                                    data: { key: a.key, value: a.value, status: a.status }
                                });
                            } else {
                                const na = await prisma.variantAttribute.create({
                                    data: {
                                        variant_id: vid,
                                        key: a.key,
                                        value: a.value,
                                        status: a.status ?? StatusVariant.DISPONIVEL
                                    }
                                });
                                aid = na.id;
                            }

                            // imagens do atributo
                            const allAi = await prisma.variantAttributeImage.findMany({
                                where: { variantAttribute_id: aid }
                            });
                            const keepAi = a.existingImages ?? [];
                            const toDelAi = allAi.filter(i => !keepAi.includes(i.id));
                            const delAiIds = toDelAi.map(i => i.id);

                            const imgDir = path.join(process.cwd(), "images");
                            toDelAi.forEach(i => {
                                const p = path.join(imgDir, i.url);
                                if (fs.existsSync(p)) fs.unlinkSync(p);
                            });

                            if (delAiIds.length) {
                                await prisma.variantAttributeImage.deleteMany({
                                    where: { id: { in: delAiIds } }
                                });
                            }

                            // insere só os novos desta variante+atributo
                            const incomingAi = (files.attributeImages[vid] || {})[ai] || [];
                            const createAi = incomingAi.map(f => ({
                                variantAttribute_id: aid,
                                url: path.basename(f.path),
                                altText: f.originalname,
                                isPrimary: false
                            }));
                            if (createAi.length) {
                                await prisma.variantAttributeImage.createMany({ data: createAi });
                            }
                        }
                    }
                }
            }

            // ————————————
            // 7) relações…
            if (productData.relations) {
                await prisma.productRelation.deleteMany({
                    where: {
                        OR: [
                            { parentProduct_id: id },
                            { childProduct_id: id }
                        ]
                    }
                });
                for (const r of productData.relations) {
                    const isChild = r.relationDirection === "child";
                    await prisma.productRelation.create({
                        data: {
                            relationType: r.relationType,
                            sortOrder: r.sortOrder ?? 0,
                            isRequired: r.isRequired ?? false,
                            parentProduct: { connect: { id: isChild ? id : r.relatedProductId } },
                            childProduct: { connect: { id: isChild ? r.relatedProductId : id } }
                        }
                    });
                }
            }

            // 8) retorna tudo…
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
            });
        });
    }
}
