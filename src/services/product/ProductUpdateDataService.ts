import prismaClient from "../../prisma";
import { ProductRelationType, StatusProduct, StatusVariant } from "@prisma/client";
import fs from 'fs/promises';
import path from 'path';

interface AttributeUpdateData {
    key: string;
    value: string;
    existingImages?: string[];
    newImages?: Express.Multer.File[];
}

interface VariantUpdateData {
    id?: string;
    sku: string;
    price_per: number;
    price_of?: number;
    stock?: number;
    allowBackorders?: boolean;
    sortOrder?: number;
    ean?: string;
    mainPromotion_id?: string;
    status?: StatusVariant;
    attributes?: AttributeUpdateData[];
    existingImages?: string[];
    newImages?: Express.Multer.File[];
    existingVideos?: string[];
    newVideos?: string[];
}

interface ProductUpdateData {
    id: string;
    name?: string;
    slug?: string;
    metaTitle?: string;
    metaDescription?: string;
    keywords?: any;
    brand?: string;
    ean?: string;
    description?: string;
    skuMaster?: string;
    price_per?: number;
    price_of?: number;
    weight?: number;
    length?: number;
    width?: number;
    height?: number;
    stock?: number;
    status?: StatusProduct;
    mainPromotion_id?: string;
    categoryIds?: string[];
    descriptionBlocks?: { title: string; description: string }[];
    existingImages?: string[];
    newImages?: Express.Multer.File[];
    existingVideos?: string[];
    newVideos?: string[];
    variants?: VariantUpdateData[];
    relations?: {
        parentId?: string;
        childId?: string;
        relationType: ProductRelationType;
        sortOrder: number;
        isRequired: boolean;
    }[];
}

export class ProductUpdateDataService {
    private readonly uploadsDir = path.join(process.cwd(), 'uploads');

    async execute(data: ProductUpdateData) {
        return await prismaClient.$transaction(async (prisma) => {
            const product = await this.updateMainProduct(data, prisma);
            await this.processRelations(data, prisma);
            await this.processVariants(data, product.id, prisma);

            return this.getFullProduct(product.id, prisma);
        });
    }

    private async updateMainProduct(data: ProductUpdateData, prisma: any) {
        const updateData: any = {
            name: data.name,
            slug: data.slug,
            metaTitle: data.metaTitle,
            metaDescription: data.metaDescription,
            keywords: data.keywords,
            brand: data.brand,
            ean: data.ean,
            description: data.description,
            skuMaster: data.skuMaster,
            price_per: data.price_per,
            price_of: data.price_of,
            weight: data.weight,
            length: data.length,
            width: data.width,
            height: data.height,
            stock: data.stock,
            status: data.status,
        };

        // Process main promotion
        if (data.mainPromotion_id !== undefined) {
            updateData.mainPromotion = data.mainPromotion_id
                ? { connect: { id: data.mainPromotion_id } }
                : { disconnect: true };
        }

        // Process categories
        if (data.categoryIds) {
            updateData.categories = {
                set: [],
                connect: data.categoryIds.map(id => ({ id }))
            };
        }

        // Process descriptions
        if (data.descriptionBlocks) {
            await prisma.productDescription.deleteMany({
                where: { product_id: data.id }
            });

            updateData.productsDescriptions = {
                create: data.descriptionBlocks.map(block => ({
                    title: block.title,
                    description: block.description
                }))
            };
        }

        // Process main images
        if (data.existingImages || data.newImages) {
            await this.processMainImages(data, prisma);
        }

        // Process main videos
        if (data.existingVideos || data.newVideos) {
            await this.processMainVideos(data, prisma);
        }

        return prisma.product.update({
            where: { id: data.id },
            data: updateData,
        });
    }

    private async processMainImages(data: ProductUpdateData, prisma: any) {
        const currentImages = await prisma.productImage.findMany({
            where: { product_id: data.id, variant_id: null }
        });

        // Delete removed images
        const imagesToDelete = currentImages.filter((img: { url: string; }) =>
            !data.existingImages?.includes(img.url)
        );
        await this.deleteImages(imagesToDelete, prisma);

        // Add new images
        if (data.newImages?.length) {
            await prisma.productImage.createMany({
                data: data.newImages.map((file, index) => ({
                    url: file.filename,
                    altText: file.originalname,
                    product_id: data.id,
                    isPrimary: index === 0
                }))
            });
        }
    }

    private async processMainVideos(data: ProductUpdateData, prisma: any) {
        const currentVideos = await prisma.productVideo.findMany({
            where: { product_id: data.id, variant_id: null }
        });

        // Delete removed videos
        const videosToDelete = currentVideos.filter((video: { url: string; }) =>
            !data.existingVideos?.includes(video.url)
        );
        await prisma.productVideo.deleteMany({
            where: { id: { in: videosToDelete.map((v: { id: any; }) => v.id) } }
        });

        // Add new videos
        if (data.newVideos?.length) {
            await prisma.productVideo.createMany({
                data: data.newVideos.map((url, index) => ({
                    url,
                    product_id: data.id,
                    isPrimary: index === 0
                }))
            });
        }
    }

    private async processRelations(data: ProductUpdateData, prisma: any) {
        if (!data.relations) return;

        await prisma.productRelation.deleteMany({
            where: { OR: [{ parentProduct_id: data.id }, { childProduct_id: data.id }] }
        });

        for (const relation of data.relations) {
            await prisma.productRelation.create({
                data: {
                    parentProduct_id: relation.parentId || data.id,
                    childProduct_id: relation.childId || data.id,
                    relationType: relation.relationType,
                    sortOrder: relation.sortOrder,
                    isRequired: relation.isRequired
                }
            });
        }
    }

    private async processVariants(data: ProductUpdateData, productId: string, prisma: any) {
        if (!data.variants) return;

        const existingVariants = await prisma.productVariant.findMany({
            where: { product_id: productId },
            include: { variantAttributes: true }
        });

        // Process existing variants
        for (const variantData of data.variants) {
            if (variantData.id) {
                await this.updateExistingVariant(variantData, prisma);
            } else {
                await this.createNewVariant(variantData, productId, prisma);
            }
        }

        // Delete removed variants
        const variantsToDelete = existingVariants.filter((ev: { id: string | undefined; }) =>
            !data.variants!.some(v => v.id === ev.id)
        );
        await this.deleteVariants(variantsToDelete, prisma);
    }

    private async updateExistingVariant(variantData: VariantUpdateData, prisma: any) {
        const variantUpdate: any = {
            sku: variantData.sku,
            price_per: variantData.price_per,
            price_of: variantData.price_of,
            stock: variantData.stock,
            allowBackorders: variantData.allowBackorders,
            sortOrder: variantData.sortOrder,
            ean: variantData.ean,
            status: variantData.status,
            mainPromotion_id: variantData.mainPromotion_id
        };

        // Update variant data
        const variant = await prisma.productVariant.update({
            where: { id: variantData.id },
            data: variantUpdate
        });

        // Process variant media
        await this.processVariantMedia(variantData, variant.id, prisma);
        await this.processVariantAttributes(variantData, variant.id, prisma);
    }

    private async createNewVariant(variantData: VariantUpdateData, productId: string, prisma: any) {
        const variant = await prisma.productVariant.create({
            data: {
                ...variantData,
                product_id: productId,
                status: variantData.status || StatusVariant.DISPONIVEL
            }
        });

        await this.processVariantMedia(variantData, variant.id, prisma);
        await this.processVariantAttributes(variantData, variant.id, prisma);
    }

    private async processVariantMedia(variantData: VariantUpdateData, variantId: string, prisma: any) {
        // Process images
        const currentImages = await prisma.productImage.findMany({
            where: { variant_id: variantId }
        });

        const imagesToDelete = currentImages.filter((img: { url: string; }) =>
            !variantData.existingImages?.includes(img.url)
        );
        await this.deleteImages(imagesToDelete, prisma);

        if (variantData.newImages?.length) {
            await prisma.productImage.createMany({
                data: variantData.newImages.map((file, index) => ({
                    url: file.filename,
                    altText: file.originalname,
                    variant_id: variantId,
                    isPrimary: index === 0
                }))
            });
        }

        // Process videos
        const currentVideos = await prisma.productVideo.findMany({
            where: { variant_id: variantId }
        });

        const videosToDelete = currentVideos.filter((video: { url: string; }) =>
            !variantData.existingVideos?.includes(video.url)
        );
        await prisma.productVideo.deleteMany({
            where: { id: { in: videosToDelete.map((v: { id: any; }) => v.id) } }
        });

        if (variantData.newVideos?.length) {
            await prisma.productVideo.createMany({
                data: variantData.newVideos.map((url, index) => ({
                    url,
                    variant_id: variantId,
                    isPrimary: index === 0
                }))
            });
        }
    }

    private async processVariantAttributes(variantData: VariantUpdateData, variantId: string, prisma: any) {
        if (!variantData.attributes) return;

        for (const attrData of variantData.attributes) {
            const attribute = await prisma.variantAttribute.upsert({
                where: {
                    variant_id_key: {
                        variant_id: variantId,
                        key: attrData.key
                    }
                },
                update: { value: attrData.value },
                create: {
                    key: attrData.key,
                    value: attrData.value,
                    variant_id: variantId
                }
            });

            await this.processAttributeImages(attrData, attribute.id, prisma);
        }
    }

    private async processAttributeImages(attrData: AttributeUpdateData, attributeId: string, prisma: any) {
        const currentImages = await prisma.variantAttributeImage.findMany({
            where: { variantAttribute_id: attributeId }
        });

        const imagesToDelete = currentImages.filter((img: { url: string; }) =>
            !attrData.existingImages?.includes(img.url)
        );
        await this.deleteImages(imagesToDelete, prisma);

        if (attrData.newImages?.length) {
            await prisma.variantAttributeImage.createMany({
                data: attrData.newImages.map((file, index) => ({
                    url: file.filename,
                    altText: file.originalname,
                    variantAttribute_id: attributeId,
                    isPrimary: index === 0
                }))
            });
        }
    }

    private async deleteImages(images: any[], prisma: any) {
        if (images.length === 0) return;

        // Delete from database
        await prisma.productImage.deleteMany({
            where: { id: { in: images.map(img => img.id) } }
        });

        // Delete from filesystem
        await Promise.all(images.map(async (img) => {
            try {
                await fs.unlink(path.join(this.uploadsDir, img.url));
            } catch (error) {
                console.error(`Error deleting image file ${img.url}:`, error);
            }
        }));
    }

    private async deleteVariants(variants: any[], prisma: any) {
        if (variants.length === 0) return;

        const variantIds = variants.map(v => v.id);

        await prisma.productVariant.deleteMany({
            where: { id: { in: variantIds } }
        });

        // Cleanup files
        const variantImages = await prisma.productImage.findMany({
            where: { variant_id: { in: variantIds } }
        });
        await this.deleteImages(variantImages, prisma);
    }

    private async getFullProduct(productId: string, prisma: any) {
        return prisma.product.findUnique({
            where: { id: productId },
            include: {
                categories: true,
                productsDescriptions: true,
                images: true,
                videos: true,
                variants: {
                    include: {
                        productVariantImage: true,
                        productVariantVideo: true,
                        variantAttributes: {
                            include: {
                                variantAttributeImage: true
                            }
                        }
                    }
                },
                productRelations: true
            }
        });
    }
}