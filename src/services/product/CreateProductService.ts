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
        attributes: {
            key: string;
            value: string;
            status?: StatusVariant;
            images?: string[];
        }[];
    }[];
    relations?: {
        childProductId: string;
        relationType: ProductRelationType;
        sortOrder?: number;
        isRequired?: boolean;
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
                    mainPromotion_id: productData.mainPromotion_id || null
                }
            });

            // Vídeos do produto
            if (productData.videoLinks && productData.videoLinks.length > 0) {
                const validVideoLinks = productData.videoLinks
                    .filter(url => typeof url === 'string' && url.startsWith('http'));

                await prisma.productVideo.createMany({
                    data: validVideoLinks.map((url, idx) => ({
                        product_id: product.id,
                        url,
                        isPrimary: idx === 0
                    }))
                });
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
            if (productData.descriptions) {
                await prisma.productDescription.createMany({
                    data: productData.descriptions.map(desc => ({
                        product_id: product.id,
                        title: desc.title,
                        description: desc.description,
                        status: desc.status || StatusDescriptionProduct.DISPONIVEL
                    }))
                });
            }

            // Imagens principais
            if (files.images) {
                await this.processMainImages(prisma, product.id, files.images);
            }

            // Variantes
            if (productData.variants) {
                for (const variant of productData.variants) {
                    await this.processVariant(prisma, product.id, variant, files);
                }
            }

            // Relações
            if (productData.relations) {
                await this.processProductRelations(prisma, product.id, productData.relations);
            }

            // Retorna produto completo incluindo vídeos
            return prisma.product.findUnique({
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
                            productVariantVideo: true
                        }
                    },
                    productRelations: true
                }
            });
        });
    }

    private async processMainImages(prisma: any, productId: string, images: any[]) {
        const imageRecords = images.map((image: any, index: number) => ({
            product_id: productId,
            url: path.basename(image.path),
            altText: image.originalname,
            isPrimary: index === 0
        }));
        await prisma.productImage.createMany({ data: imageRecords });
    }

    private async processVariant(prisma: any, productId: string, variant: any, files: any) {

        if (!variant?.id) {
            console.error('Variante sem ID:', variant);
            return;
        }

        const newVariant = await prisma.productVariant.create({
            data: {
                product_id: productId,
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
            const result = await prisma.productVariantVideo.createMany({
                data: variant.videoLinks.map((url: string, idx: number) => ({
                    productVariant_id: newVariant.id,
                    url,
                    isPrimary: idx === 0
                }))
            });
        }

        // Atributos
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
            if (files.attributeImages) {
                const attributeImages = files.attributeImages
                    .filter((img: any) => attribute.images?.includes(img.originalname))
                    .map((img: any) => ({
                        variantAttribute_id: newAttribute.id,
                        url: path.basename(img.path),
                        altText: img.originalname,
                        isPrimary: false
                    }));
                await prisma.variantAttributeImage.createMany({ data: attributeImages });
            }
        }

        // Imagens da variante
        if (files.variantImages) {
            const variantImages = files.variantImages
                .filter((img: any) => variant.images?.includes(img.originalname))
                .map((img: any) => ({
                    productVariant_id: newVariant.id,
                    url: path.basename(img.path),
                    altText: img.originalname,
                    isPrimary: false
                }));
            if (variantImages.length > 0) {
                await prisma.productVariantImage.createMany({ data: variantImages });
            }
        }
    }

    private async processProductRelations(prisma: any, productId: string, relations: any[]) {
        for (const relation of relations) {
            await prisma.productRelation.create({
                data: {
                    parentProduct_id: productId,
                    childProduct_id: relation.childProductId,
                    relationType: relation.relationType,
                    sortOrder: relation.sortOrder || 0,
                    isRequired: relation.isRequired || false
                }
            });
        }
    }
}

export { CreateProductService };