import prismaClient from "../../prisma";
import {
    ProductRelationType,
    StatusProduct,
    StatusDescriptionProduct,
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
    existingImages?: string[]; // IDs de imagens principais a manter
    descriptions?: {
        title: string;
        description: string;
        status?: StatusDescriptionProduct;
    }[];
    variants?: {
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
        existingImages?: string[]; // IDs de imagens da variante a manter
        attributes: {
            id?: string;
            key: string;
            value: string;
            status?: StatusVariant;
            existingImages?: string[]; // IDs de imagens do atributo a manter
        }[];
    }[];
    relations?: {
        relationDirection: "child" | "parent";
        relatedProductId: string;
        relationType: ProductRelationType;
        sortOrder?: number;
        isRequired?: boolean;
    }[];
}

export class ProductUpdateDataService {
    async execute(productData: ProductRequest, files: any) {
        const removerAcentos = (s: string) =>
            s
                .normalize("NFD")
                .replace(/[\u0300-\u036f]/g, "")
                .toLowerCase()
                .replace(/ +/g, "-")
                .replace(/-{2,}/g, "-")
                .replace(/\//g, "-");

        return prismaClient.$transaction(async (prisma) => {
            const { id, name, metaTitle, metaDescription, keywords, brand, ean,
                description, skuMaster, price_of, price_per, weight, length, width,
                height, stock, status, mainPromotion_id } = productData;

            // 1) Atualiza dados básicos
            await prisma.product.update({
                where: { id },
                data: {
                    name,
                    slug: name ? removerAcentos(name) : undefined,
                    metaTitle, metaDescription, keywords, brand, ean,
                    description, skuMaster, price_of, price_per,
                    weight, length, width, height, stock, status,
                    mainPromotion_id,
                },
            });

            // 2) Vídeos
            if (productData.videoLinks) {
                await prisma.productVideo.deleteMany({ where: { product_id: id } });
                const vids = productData.videoLinks.filter((u) => u.startsWith("http"));
                if (vids.length) {
                    await prisma.productVideo.createMany({
                        data: vids.map((url, i) => ({
                            product_id: id,
                            url,
                            isPrimary: i === 0,
                        })),
                    });
                }
            }

            // 3) Categorias
            if (productData.categories) {
                await prisma.productCategory.deleteMany({ where: { product_id: id } });
                if (productData.categories.length) {
                    await prisma.productCategory.createMany({
                        data: productData.categories.map((catId) => ({
                            product_id: id,
                            category_id: catId,
                        })),
                    });
                }
            }

            // 4) Descrições
            if (productData.descriptions) {
                await prisma.productDescription.deleteMany({ where: { product_id: id } });
                await prisma.productDescription.createMany({
                    data: productData.descriptions.map((d) => ({
                        product_id: id,
                        title: d.title,
                        description: d.description,
                        status: d.status ?? StatusDescriptionProduct.DISPONIVEL,
                    })),
                });
            }

            // 5) Imagens principais (manter/delete/inserir)
            {
                // todas as imagens atuais
                const allMain = await prisma.productImage.findMany({ where: { product_id: id } });
                const keepMain = productData.existingImages ?? [];

                // decide quais apagar
                const toDeleteMain = allMain.filter((img) => !keepMain.includes(img.id));
                const deleteMainIds = toDeleteMain.map((i) => i.id);

                // deleta arquivos do disco
                const imagesDir = path.join(process.cwd(), "images");
                for (const img of toDeleteMain) {
                    const filePath = path.join(imagesDir, img.url);
                    if (fs.existsSync(filePath)) {
                        try {
                            fs.unlinkSync(filePath);
                        } catch (unlinkErr) {
                            console.error(`Erro ao deletar arquivo ${filePath}:`, unlinkErr);
                        }
                    }
                }
                // deleta registro
                if (deleteMainIds.length) {
                    await prisma.productImage.deleteMany({ where: { id: { in: deleteMainIds } } });
                }

                // insere novos uploads
                const newMain = (files.images ?? []).map((f: any) => ({
                    product_id: id,
                    url: path.basename(f.path),
                    altText: f.originalname,
                    isPrimary: false,
                }));
                if (newMain.length) {
                    await prisma.productImage.createMany({ data: newMain });
                }
            }

            // 6) Variantes + imagens + atributos + imagens
            if (productData.variants) {
                // apaga variants removidas
                const keepVarIds = productData.variants.filter((v) => v.id).map((v) => v.id!) as string[];
                await prisma.productVariant.deleteMany({
                    where: { product_id: id, id: { notIn: keepVarIds } }
                });

                for (const varData of productData.variants) {
                    // cria ou atualiza variant
                    let variantId = varData.id!;
                    if (variantId) {
                        await prisma.productVariant.update({
                            where: { id: variantId },
                            data: {
                                sku: varData.sku,
                                price_of: varData.price_of,
                                price_per: varData.price_per,
                                stock: varData.stock,
                                allowBackorders: varData.allowBackorders,
                                sortOrder: varData.sortOrder,
                                ean: varData.ean,
                                mainPromotion_id: varData.mainPromotion_id,
                            },
                        });
                    } else {
                        const nv = await prisma.productVariant.create({
                            data: {
                                product_id: id,
                                sku: varData.sku,
                                price_of: Number(varData.price_of),
                                price_per: Number(varData.price_per),
                                stock: varData.stock,
                                allowBackorders: varData.allowBackorders ?? false,
                                sortOrder: varData.sortOrder ?? 0,
                                ean: varData.ean,
                                mainPromotion_id: varData.mainPromotion_id ?? null,
                            },
                        });
                        variantId = nv.id;
                    }

                    // Vídeos da variant
                    await prisma.productVariantVideo.deleteMany({ where: { productVariant_id: variantId } });
                    if (varData.videoLinks?.length) {
                        await prisma.productVariantVideo.createMany({
                            data: varData.videoLinks.map((url, i) => ({
                                productVariant_id: variantId,
                                url,
                                isPrimary: i === 0,
                            })),
                        });
                    }

                    // Imagens da variant (manter/delete/inserir)
                    {
                        const allVarImgs = await prisma.productVariantImage.findMany({
                            where: { productVariant_id: variantId }
                        });
                        const keepVarImgs = varData.existingImages ?? [];
                        const toDel = allVarImgs.filter((i) => !keepVarImgs.includes(i.id));
                        const delIds = toDel.map((i) => i.id);
                        const imagesDir = path.join(process.cwd(), "images");
                        for (const img of toDel) {
                            const filePath = path.join(imagesDir, img.url);
                            if (fs.existsSync(filePath)) {
                                try {
                                    fs.unlinkSync(filePath);
                                } catch (unlinkErr) {
                                    console.error(`Erro ao deletar arquivo variante ${filePath}:`, unlinkErr);
                                }
                            }
                        }
                        if (delIds.length) {
                            await prisma.productVariantImage.deleteMany({ where: { id: { in: delIds } } });
                        }
                        const newVarImgs = (files.variantImages ?? [])
                            .filter((f: any) => varData.existingImages?.indexOf(f.originalname) === -1)
                            .map((f: any) => ({
                                productVariant_id: variantId,
                                url: path.basename(f.path),
                                altText: f.originalname,
                                isPrimary: false,
                            }));
                        if (newVarImgs.length) {
                            await prisma.productVariantImage.createMany({ data: newVarImgs });
                        }
                    }

                    // Atributos e imagens de atributo
                    {
                        // apaga atributos removidos
                        const keepAttrIds = varData.attributes.filter((a) => a.id).map((a) => a.id!) as string[];
                        await prisma.variantAttribute.deleteMany({
                            where: { variant_id: variantId, id: { notIn: keepAttrIds } }
                        });

                        for (const attr of varData.attributes) {
                            // cria ou atualiza attribute
                            let attrId = attr.id!;
                            if (attrId) {
                                await prisma.variantAttribute.update({
                                    where: { id: attrId },
                                    data: { key: attr.key, value: attr.value, status: attr.status },
                                });
                            } else {
                                const na = await prisma.variantAttribute.create({
                                    data: {
                                        variant_id: variantId,
                                        key: attr.key,
                                        value: attr.value,
                                        status: attr.status ?? StatusVariant.DISPONIVEL,
                                    },
                                });
                                attrId = na.id;
                            }

                            // imagens de atributo (manter/delete/inserir)
                            const allAttrImgs = await prisma.variantAttributeImage.findMany({
                                where: { variantAttribute_id: attrId }
                            });
                            const keepAttrImgs = attr.existingImages ?? [];
                            const toDelAttr = allAttrImgs.filter((i) => !keepAttrImgs.includes(i.id));
                            const delAttrIds = toDelAttr.map((i) => i.id);
                            const imagesDir = path.join(process.cwd(), "images");
                            for (const img of toDelAttr) {
                                const filePath = path.join(imagesDir, img.url);
                                if (fs.existsSync(filePath)) {
                                    try {
                                        fs.unlinkSync(filePath);
                                    } catch (unlinkErr) {
                                        console.error(`Erro ao deletar arquivo atributo ${filePath}:`, unlinkErr);
                                    }
                                }
                            }
                            if (delAttrIds.length) {
                                await prisma.variantAttributeImage.deleteMany({ where: { id: { in: delAttrIds } } });
                            }
                            const newAttrImgs = (files.attributeImages ?? [])
                                .filter((f: any) => attr.existingImages?.indexOf(f.originalname) === -1)
                                .map((f: any) => ({
                                    variantAttribute_id: attrId,
                                    url: path.basename(f.path),
                                    altText: f.originalname,
                                    isPrimary: false,
                                }));
                            if (newAttrImgs.length) {
                                await prisma.variantAttributeImage.createMany({ data: newAttrImgs });
                            }
                        }
                    }
                }
            }

            // 7) Relações
            if (productData.relations) {
                await prisma.productRelation.deleteMany({
                    where: {
                        OR: [
                            { parentProduct_id: id },
                            { childProduct_id: id }
                        ]
                    }
                });
                for (const rel of productData.relations) {
                    const isChild = rel.relationDirection === "child";
                    const parentId = isChild ? id : rel.relatedProductId;
                    const childId = isChild ? rel.relatedProductId : id;
                    await prisma.productRelation.create({
                        data: {
                            relationType: rel.relationType,
                            sortOrder: rel.sortOrder ?? 0,
                            isRequired: rel.isRequired ?? false,
                            parentProduct: { connect: { id: parentId } },
                            childProduct: { connect: { id: childId } },
                        },
                    });
                }
            }

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
                            variantAttribute: { include: { variantAttributeImage: true } },
                            productVariantVideo: true,
                        },
                    },
                    productRelations: true,
                    childRelations: true,
                    parentRelations: true,
                },
            });
        });
    }
}