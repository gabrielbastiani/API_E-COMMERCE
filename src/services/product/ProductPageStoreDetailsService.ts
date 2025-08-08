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
                        childProduct: {
                            include: {
                                images: true
                            }
                        },
                        parentProduct: {
                            include: {
                                images: true
                            }
                        },
                        product: true
                    }
                },
                images: true,
                mainPromotion: true,
                parentRelations: {
                    include: {
                        childProduct: {
                            include: {
                                images: true
                            }
                        },
                        parentProduct: {
                            include: {
                                images: true
                            }
                        },
                        product: {
                            include: {
                                images: true
                            }
                        }
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
                        badges: true,
                        displays: true,
                        mainVariants: true
                    }
                },
                productRelations: true,
                buyTogether: {
                    include: {
                        product: {
                            include: {
                                images: true
                            }
                        }
                    }
                }
            }
        });

        return productData;

    }
}

export { ProductPageStoreDetailsService }