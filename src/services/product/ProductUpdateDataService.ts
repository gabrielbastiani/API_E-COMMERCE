import prismaClient from "../../prisma";
import {
    ProductRelationType,
    StatusProduct,
    StatusDescriptionProduct,
    StatusVariant,
} from "@prisma/client";
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
        attributes: {
            id?: string;
            key: string;
            value: string;
            status?: StatusVariant;
            images?: string[];
        }[];
        images?: string[];
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
        function removerAcentos(s: string) {
            return s
                .normalize("NFD")
                .replace(/[\u0300-\u036f]/g, "")
                .toLowerCase()
                .replace(/ +/g, "-")
                .replace(/-{2,}/g, "-")
                .replace(/\//g, "-");
        }

        return await prismaClient.$transaction(async (prisma) => {
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
            } = productData;

            // 1) Atualiza dados básicos do produto
            await prisma.product.update({
                where: { id },
                data: {
                    name,
                    slug: name ? removerAcentos(name) : undefined,
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
                },
            });

            // 2) Vídeos: apaga todos e recria
            if (productData.videoLinks) {
                await prisma.productVideo.deleteMany({ where: { product_id: id } });
                const validVideos = productData.videoLinks.filter((u) =>
                    u.startsWith("http")
                );
                if (validVideos.length) {
                    await prisma.productVideo.createMany({
                        data: validVideos.map((url, i) => ({
                            product_id: id,
                            url,
                            isPrimary: i === 0,
                        })),
                    });
                }
            }

            // 3) Categorias: repopula
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
                await prisma.productDescription.deleteMany({
                    where: { product_id: id },
                });
                await prisma.productDescription.createMany({
                    data: productData.descriptions.map((d) => ({
                        product_id: id,
                        title: d.title,
                        description: d.description,
                        status: d.status ?? StatusDescriptionProduct.DISPONIVEL,
                    })),
                });
            }

            // 5) Imagens principais
            if (files.images) {
                await prisma.productImage.deleteMany({ where: { product_id: id } });
                const pics = files.images.map((img: any, idx: number) => ({
                    product_id: id,
                    url: path.basename(img.path),
                    altText: img.originalname,
                    isPrimary: idx === 0,
                }));
                await prisma.productImage.createMany({ data: pics });
            }

            // 6) Variantes: 
            if (productData.variants) {
                // remove variantes que não vieram no payload
                const keepIds = productData.variants
                    .filter((v) => v.id)
                    .map((v) => v.id!) as string[];
                await prisma.productVariant.deleteMany({
                    where: { product_id: id, id: { notIn: keepIds } },
                });

                for (const variant of productData.variants) {
                    if (variant.id) {
                        // update existing
                        await prisma.productVariant.update({
                            where: { id: variant.id },
                            data: {
                                sku: variant.sku,
                                price_of: variant.price_of,
                                price_per: variant.price_per,
                                stock: variant.stock,
                                allowBackorders: variant.allowBackorders,
                                sortOrder: variant.sortOrder,
                                ean: variant.ean,
                                mainPromotion_id: variant.mainPromotion_id,
                            },
                        });
                    } else {
                        // create new
                        const newV = await prisma.productVariant.create({
                            data: {
                                product_id: id,
                                sku: variant.sku,
                                price_of: Number(variant.price_of),
                                price_per: Number(variant.price_per),
                                stock: variant.stock,
                                allowBackorders: variant.allowBackorders ?? false,
                                sortOrder: variant.sortOrder ?? 0,
                                ean: variant.ean,
                                mainPromotion_id: variant.mainPromotion_id ?? null,
                            },
                        });
                        variant.id = newV.id;
                    }

                    // Vídeos da variante
                    await prisma.productVariantVideo.deleteMany({
                        where: { productVariant_id: variant.id },
                    });
                    if (variant.videoLinks?.length) {
                        await prisma.productVariantVideo.createMany({
                            data: variant.videoLinks.map((url, i) => ({
                                productVariant_id: variant.id!,
                                url,
                                isPrimary: i === 0,
                            })),
                        });
                    }

                    // Atributos
                    // remove antigos não enviados
                    const attrKeep = variant.attributes
                        .filter((a) => a.id)
                        .map((a) => a.id!) as string[];
                    await prisma.variantAttribute.deleteMany({
                        where: { variant_id: variant.id, id: { notIn: attrKeep } },
                    });

                    for (const attr of variant.attributes) {
                        if (attr.id) {
                            await prisma.variantAttribute.update({
                                where: { id: attr.id },
                                data: { key: attr.key, value: attr.value, status: attr.status },
                            });
                        } else {
                            const newAttr = await prisma.variantAttribute.create({
                                data: {
                                    variant_id: variant.id!,
                                    key: attr.key,
                                    value: attr.value,
                                    status: attr.status ?? StatusVariant.DISPONIVEL,
                                },
                            });
                            attr.id = newAttr.id;
                        }

                        // imagens de atributo
                        if (files.attributeImages) {
                            await prisma.variantAttributeImage.deleteMany({
                                where: { variantAttribute_id: attr.id },
                            });
                            const imgs = files.attributeImages
                                .filter((f: any) => attr.images?.includes(f.originalname))
                                .map((f: any) => ({
                                    variantAttribute_id: attr.id!,
                                    url: path.basename(f.path),
                                    altText: f.originalname,
                                    isPrimary: false,
                                }));
                            if (imgs.length)
                                await prisma.variantAttributeImage.createMany({ data: imgs });
                        }
                    }

                    // imagens da variante
                    if (files.variantImages) {
                        await prisma.productVariantImage.deleteMany({
                            where: { productVariant_id: variant.id },
                        });
                        const vimgs = files.variantImages
                            .filter((f: any) => variant.images?.includes(f.originalname))
                            .map((f: any) => ({
                                productVariant_id: variant.id!,
                                url: path.basename(f.path),
                                altText: f.originalname,
                                isPrimary: false,
                            }));
                        if (vimgs.length)
                            await prisma.productVariantImage.createMany({ data: vimgs });
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

            // 8) Retorna produto atualizado completo
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