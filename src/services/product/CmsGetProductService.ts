import prismaClient from "../../prisma"; 

interface ProductRequest {
    product_id: string;
}

class CmsGetProductService {
    async execute({ product_id }: ProductRequest) {
        const productData = await prismaClient.product.findFirst({
            where: {
                id: product_id
            },
            include: {
                categories: {
                    include: {
                        category: true
                    }
                },
                childRelations: {
                    include: {
                        childProduct: true,
                        parentProduct: true,
                        product: true
                    }
                },
                images: true,
                mainPromotion: true,
                parentRelations: {
                    include: {
                        childProduct: true,
                        parentProduct: true,
                        product: true
                    }
                },
                productsDescriptions: true,
                variants: {
                    include: {
                        productVariantImage: true,
                        productVariantVideo: true,
                        mainPromotion: true,
                        variantAttribute: true
                    }
                },
                videos: true,
                promotions: {
                    include: {
                        mainVariants: true
                    }
                },
                productRelations: true
            }
        });

        return productData;

    }
}

export { CmsGetProductService }