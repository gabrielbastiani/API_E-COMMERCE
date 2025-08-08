import prismaClient from "../../prisma";

interface ProductProps {
    product_id: string;
}

class FindUniqueProductStoreService {
    async execute({ product_id }: ProductProps) {
        const product = await prismaClient.product.findUnique({
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
        
        return product;

    }
}

export { FindUniqueProductStoreService }