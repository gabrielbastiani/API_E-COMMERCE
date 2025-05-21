import prismaClient from "../../prisma";
import { ProductRelationType, StatusProduct, StatusDescriptionProduct, StatusVariant } from "@prisma/client";

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
    categories?: string[];
    descriptions?: {
        title: string;
        description: string;
        status?: StatusDescriptionProduct;
    }[];
    variants?: {
        sku: string;
        price_of?: number;
        price_per: number;
        stock: number;
        allowBackorders?: boolean;
        sortOrder?: number;
        ean?: string;
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
        const slug = productData.slug || this.generateSlug(productData.name);

        return await prismaClient.$transaction(async (prisma) => {
            // Criação do produto principal
            const product = await prisma.product.create({
                data: {
                    name: productData.name,
                    slug,
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
                }
            });

            // Processar categorias
            if (productData.categories && productData.categories.length > 0) {
                await prisma.productCategory.createMany({
                    data: productData.categories.map(categoryId => ({
                        product_id: product.id,
                        category_id: categoryId
                    }))
                });
            }

            // Processar descrições
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

            // Processar imagens principais
            if (files.images) {
                await this.processMainImages(prisma, product.id, files.images);
            }

            // Processar variantes
            if (productData.variants) {
                for (const variant of productData.variants) {
                    await this.processVariant(prisma, product.id, variant, files);
                }
            }

            // Processar relações entre produtos
            if (productData.relations) {
                await this.processProductRelations(prisma, product.id, productData.relations);
            }

            return await prisma.product.findUnique({
                where: { id: product.id },
                include: {
                    categories: true,
                    productsDescriptions: true,
                    images: true,
                    variants: {
                        include: {
                            variantAttribute: {
                                include: {
                                    variantAttributeImage: true
                                }
                            }
                        }
                    },
                    productRelations: true
                }
            });
        });
    }

    private generateSlug(name: string): string {
        return name
            .toLowerCase()
            .replace(/[^a-z0-9]/g, '-')
            .replace(/-+/g, '-')
            .replace(/^-|-$/g, '');
    }

    private async processMainImages(prisma: any, productId: string, images: any[]) {
        const imageRecords = images.map((image, index) => ({
            product_id: productId,
            url: image.path,
            altText: image.originalname,
            isPrimary: index === 0
        }));

        await prisma.productImage.createMany({
            data: imageRecords
        });
    }

    private async processVariant(prisma: any, productId: string, variant: any, files: any) {
        const newVariant = await prisma.productVariant.create({
            data: {
                product_id: productId,
                sku: variant.sku,
                price_of: variant.price_of,
                price_per: variant.price_per,
                stock: variant.stock,
                allowBackorders: variant.allowBackorders || false,
                sortOrder: variant.sortOrder || 0,
                ean: variant.ean
            }
        });

        // Processar atributos da variante
        for (const attribute of variant.attributes) {
            const newAttribute = await prisma.variantAttribute.create({
                data: {
                    variant_id: newVariant.id,
                    key: attribute.key,
                    value: attribute.value,
                    status: attribute.status || StatusVariant.DISPONIVEL
                }
            });

            // Processar imagens do atributo
            if (files.attributeImages && attribute.images) {
                const attributeImages = files.attributeImages
                    .filter((img: any) => attribute.images.includes(img.originalname))
                    .map((img: any) => ({
                        variantAttribute_id: newAttribute.id,
                        url: img.path,
                        altText: img.originalname,
                        isPrimary: false
                    }));

                await prisma.variantAttributeImage.createMany({
                    data: attributeImages
                });
            }
        }

        // Processar imagens da variante
        if (files.variantImages) {
            const variantImages = files.variantImages
                .filter((img: any) => img.fieldname === `variant-${variant.sku}`)
                .map((img: any) => ({
                    productVariant_id: newVariant.id,
                    url: img.path,
                    altText: img.originalname,
                    isPrimary: false
                }));

            if (variantImages.length > 0) {
                await prisma.productVariantImage.createMany({
                    data: variantImages
                });
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