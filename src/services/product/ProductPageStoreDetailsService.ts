import prismaClient from "../../prisma"; 

interface ProductRequest {
    productSlug: string;
}

class ProductPageStoreDetailsService {
    async execute({ productSlug }: ProductRequest) {
        const productData = await prismaClient.product.findUnique({
            where: {
                slug: productSlug
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

export { ProductPageStoreDetailsService }