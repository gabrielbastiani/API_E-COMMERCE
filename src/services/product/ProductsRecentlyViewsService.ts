import prismaClient from "../../prisma";

interface ProductRequest {
    id: string[];
}

class ProductsRecentlyViewsService {
    async execute({ id }: ProductRequest) {
        const productData = await prismaClient.product.findMany({
            where: {
                id: {
                    in: id
                }
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
                        variantAttribute: {
                            include: {
                                variantAttributeImage: true
                            }
                        }
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

export { ProductsRecentlyViewsService }