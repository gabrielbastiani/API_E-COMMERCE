import prismaClient from "../../prisma";
import { ProductRelationType, StatusProduct, StatusDescriptionProduct, StatusVariant } from "@prisma/client";
import path from "path";

interface ProductRequest {
    name: string;
    slug?: string;
    metaTitle?: string;
    metaDescription?: string;
    keywords?: string[];
    brand?: string;
    ean?: string;
    description: string;
    skuMaster?: string;
    price_of?: number;
    price_per: number;
    weight?: number;
    length?: number;
    width?: number;
    height?: number;
    stock?: number;
    status?: StatusProduct;
    mainPromotion_id?: string;
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
        price_per: number;
        stock: number;
        allowBackorders?: boolean;
        sortOrder?: number;
        ean?: string;
        mainPromotion_id?: string;
        videoLinks?: string[];
        primaryImageName?: string;
        images?: string[];
        attributes: {
            key: string;
            value: string;
            status?: StatusVariant;
            primaryAttributeImageName?: string;
            images?: string[];
        }[];
    }[];
    relations?: {
        relationDirection: "child" | "parent";
        relatedProductId: string;
        relationType: ProductRelationType;
        sortOrder?: number;
        isRequired?: boolean;
    }[];
    primaryMainImageName?: string;
    buyTogether_id?: string;
    characteristics?: {
        key: string | null;
        value: string | null;
        imageName?: string | null;
    }[];
}

class CreateProductService {
    async execute(productData: ProductRequest, files: any) {
        function removerAcentos(s: any) {
            return s.normalize('NFD')
                .replace(/[\u0300-\u036f]/g, "")
                .toLowerCase()
                .replace(/ +/g, "-")
                .replace(/-{2,}/g, "-")
                .replace(/[/]/g, "-");
        }

        return await prismaClient.$transaction(async (prisma) => {
            // Criação do produto principal
            const product = await prisma.product.create({
                data: {
                    name: productData.name,
                    slug: removerAcentos(productData.name),
                    metaTitle: productData.metaTitle,
                    metaDescription: productData.metaDescription,
                    keywords: productData.keywords,
                    brand: productData.brand,
                    ean: productData.ean,
                    description: productData.description,
                    skuMaster: productData.skuMaster,
                    price_of: productData.price_of,
                    price_per: productData.price_per,
                    weight: productData.weight,
                    length: productData.length,
                    width: productData.width,
                    height: productData.height,
                    stock: productData.stock || 0,
                    status: productData.status || StatusProduct.DISPONIVEL,
                    mainPromotion_id: productData.mainPromotion_id || null,
                    buyTogether_id: productData.buyTogether_id || null,
                }
            });

            // Vídeos do produto
            if (productData.videoLinks && productData.videoLinks.length > 0) {
                const validVideoLinks = productData.videoLinks
                    .filter(url => typeof url === 'string' && url.startsWith('http'));

                if (validVideoLinks.length) {
                    await prisma.productVideo.createMany({
                        data: validVideoLinks.map((url, idx) => ({
                            product_id: product.id,
                            url,
                            isPrimary: idx === 0
                        }))
                    });
                }
            }

            // Categorias
            if (productData.categories && productData.categories.length > 0) {
                await prisma.productCategory.createMany({
                    data: productData.categories.map(categoryId => ({
                        product_id: product.id,
                        category_id: categoryId
                    }))
                });
            }

            // Descrições
            if (productData.descriptions && productData.descriptions.length > 0) {
                await prisma.productDescription.createMany({
                    data: productData.descriptions.map(desc => ({
                        product_id: product.id,
                        title: desc.title,
                        description: desc.description,
                        status: desc.status || StatusDescriptionProduct.DISPONIVEL
                    }))
                });
            }

            // Imagens principais do produto
            if (files?.images) {
                await this.processMainImages(
                    prisma,
                    product.id,
                    files.images,
                    productData.primaryMainImageName
                );
            }

            // CORREÇÃO: Características do produto - processar mesmo sem arquivos
            if (productData.characteristics && productData.characteristics.length > 0) {
                await this.processCharacteristics(prisma, product.id, productData.characteristics, files);
            }

            // Variantes
            if (productData.variants) {
                for (const variant of productData.variants) {
                    await this.processVariant(
                        prisma,
                        product.id,
                        variant,
                        files
                    );
                }
            }

            // Relações
            if (productData.relations?.length) {
                await this.processProductRelations(
                    prisma,
                    product.id,
                    productData.relations
                );
            }

            // Retorna produto completo
            const foundProduct = await prisma.product.findUnique({
                where: { id: product.id },
                include: {
                    categories: true,
                    productsDescriptions: true,
                    images: true,
                    videos: true,
                    variants: {
                        include: {
                            variantAttribute: {
                                include: { variantAttributeImage: true }
                            },
                            productVariantVideo: true,
                            productVariantImage: true
                        }
                    },
                    productRelations: true,
                    childRelations: true,
                    parentRelations: true,
                    productCharacteristics: true
                }
            });

            return foundProduct;
        });
    }

    private async processMainImages(
        prisma: any,
        product_id: string,
        images: any[],
        primaryImageName?: string
    ) {
        const imageRecords = images.map((image: any, index: number) => {
            let isPrimaryFlag = false;

            if (primaryImageName && image.originalname === primaryImageName) {
                isPrimaryFlag = true;
            } else if (!primaryImageName && index === 0) {
                isPrimaryFlag = true;
            } else {
                isPrimaryFlag = false;
            }

            return {
                product_id: product_id,
                url: path.basename(image.path || (image.destination && image.filename ? path.join(image.destination, image.filename) : image.filename || image.originalname)),
                altText: image.originalname,
                isPrimary: isPrimaryFlag
            };
        });

        if (imageRecords.length) {
            await prisma.productImage.createMany({ data: imageRecords });
        }
    }

    private async processCharacteristics(
        prisma: any,
        product_id: string,
        characteristics: ProductRequest["characteristics"],
        files: any
    ) {
        if (!Array.isArray(characteristics) || characteristics.length === 0) {
            return
        }

        // CORREÇÃO: Buscar arquivos de características
        const characteristicFiles = files?.characteristicImages || []

        const recordsToCreate: any[] = []

        for (const [index, characteristic] of characteristics.entries()) {
            const key = typeof characteristic?.key === 'string' ? String(characteristic.key).trim() : null
            const value = typeof characteristic?.value === 'string' ? String(characteristic.value).trim() : null
            const imageName = characteristic?.imageName ?? null

            if (!key || !value) {
                console.warn(`processCharacteristics: item ${index} ignorado - key ou value faltando`, characteristic)
                continue
            }

            let imageUrl: string | null = null

            // CORREÇÃO: Processar imagem apenas se houver imageName e arquivos
            if (imageName && characteristicFiles.length > 0) {
                const match = characteristicFiles.find((f: any) =>
                    f.originalname === imageName ||
                    f.filename === imageName
                )

                if (match) {
                    try {
                        imageUrl = path.basename(
                            match.path ||
                            (match.destination && match.filename ?
                                path.join(match.destination, match.filename) :
                                match.filename || match.originalname)
                        )
                    } catch (err) {
                        console.error(`processCharacteristics: erro ao processar imagem para "${key}"`, err)
                    }
                } else {
                    console.warn(`processCharacteristics: imagem não encontrada para "${key}" -> imageName=${imageName}`)
                }
            }

            recordsToCreate.push({
                product_id,
                key,
                value,
                image: imageUrl
            })
        }

        if (recordsToCreate.length === 0) {
            return
        }

        // CORREÇÃO: Usar o modelo correto (ProductCharacteristics conforme seu schema)
        try {
            await prisma.productCharacteristics.createMany({
                data: recordsToCreate
            })
        } catch (error) {
            console.error('processCharacteristics: erro ao criar características em lote, tentando uma por uma', error)

            // Fallback: criar uma por uma
            for (const rec of recordsToCreate) {
                try {
                    await prisma.productCharacteristics.create({ data: rec })
                } catch (err) {
                    console.error('processCharacteristics: falha ao criar característica individual', rec, err)
                }
            }
        }
    }

    private async processVariant(
        prisma: any,
        product_id: string,
        variant: any,
        files: any
    ) {
        if (!variant?.sku) {
            console.error('Variante sem SKU:', variant);
            return;
        }

        // Cria a variant no banco
        const newVariant = await prisma.productVariant.create({
            data: {
                product_id: product_id,
                sku: variant.sku,
                price_of: variant.price_of,
                price_per: variant.price_per,
                stock: variant.stock,
                allowBackorders: variant.allowBackorders || false,
                sortOrder: variant.sortOrder || 0,
                ean: variant.ean,
                mainPromotion_id: variant.mainPromotion_id || null
            }
        });

        // Vídeos da variante
        if (variant.videoLinks?.length) {
            await prisma.productVariantVideo.createMany({
                data: variant.videoLinks.map((url: string, idx: number) => ({
                    productVariant_id: newVariant.id,
                    url,
                    isPrimary: idx === 0
                }))
            });
        }

        // Atributos da variante
        for (const attribute of variant.attributes) {
            const newAttribute = await prisma.variantAttribute.create({
                data: {
                    variant_id: newVariant.id,
                    key: attribute.key,
                    value: attribute.value,
                    status: attribute.status || StatusVariant.DISPONIVEL
                }
            });

            // Imagens de atributo
            if (files?.attributeImages && Array.isArray(attribute.images)) {
                const candidateAttributeFiles = files.attributeImages
                    .filter((img: any) => attribute.images.includes(img.originalname));

                const attributeImageRecords = candidateAttributeFiles.map((img: any, idx: number) => {
                    let isPrimaryFlag = false;
                    if (attribute.primaryAttributeImageName && img.originalname === attribute.primaryAttributeImageName) {
                        isPrimaryFlag = true;
                    } else if (!attribute.primaryAttributeImageName && idx === 0) {
                        isPrimaryFlag = false;
                    }
                    return {
                        variantAttribute_id: newAttribute.id,
                        url: path.basename(img.path || (img.destination && img.filename ? path.join(img.destination, img.filename) : img.filename || img.originalname)),
                        altText: img.originalname,
                        isPrimary: isPrimaryFlag
                    };
                });

                if (attributeImageRecords.length) {
                    await prisma.variantAttributeImage.createMany({ data: attributeImageRecords });
                }
            }
        }

        // Imagens da variante
        if (files?.variantImages && Array.isArray(variant.images)) {
            const candidateVariantFiles = files.variantImages
                .filter((img: any) => variant.images.includes(img.originalname));

            const variantImageRecords = candidateVariantFiles.map((img: any, idx: number) => {
                let isPrimaryFlag = false;
                if (variant.primaryImageName && img.originalname === variant.primaryImageName) {
                    isPrimaryFlag = true;
                } else if (!variant.primaryImageName && idx === 0) {
                    isPrimaryFlag = false;
                }
                return {
                    productVariant_id: newVariant.id,
                    url: path.basename(img.path || (img.destination && img.filename ? path.join(img.destination, img.filename) : img.filename || img.originalname)),
                    altText: img.originalname,
                    isPrimary: isPrimaryFlag
                };
            });

            if (variantImageRecords.length) {
                await prisma.productVariantImage.createMany({ data: variantImageRecords });
            }
        }
    }

    private async processProductRelations(
        prisma: any,
        product_id: string,
        relations: ProductRequest["relations"]
    ) {
        const rels = relations ?? [];
        for (const rel of rels) {
            const isChild = rel.relationDirection === "child";

            const parentId = isChild ? product_id : rel.relatedProductId;
            const childId = isChild ? rel.relatedProductId : product_id;

            const [parentExists, childExists] = await Promise.all([
                prisma.product.findUnique({ where: { id: parentId } }),
                prisma.product.findUnique({ where: { id: childId } }),
            ]);
            if (!parentExists || !childExists) {
                throw new Error(
                    `Produto não encontrado para relação: parent=${parentId}, child=${childId}`
                );
            }

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
}

export { CreateProductService }