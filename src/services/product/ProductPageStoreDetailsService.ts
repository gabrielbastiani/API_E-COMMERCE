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
                mainPromotion: {
                    include: {
                        actions: true,
                        badges: true,
                        categories: true,
                        conditions: true,
                        coupons: true,
                        displays: true,
                        featuredProducts: {
                            include: {
                                categories: {
                                    include: {
                                        category: true
                                    }
                                },
                                images: true,
                            }
                        },
                        products: {
                            include: {
                                images: true
                            }
                        },
                        variantPromotions: {
                            include: {
                                variantAttribute: true,
                                product: true,
                                productVariantImage: true,
                                productVariantVideo: true
                            }
                        }
                    }
                },
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
                        product: {
                            include: {
                                images: true,
                                categories: {
                                    include: {
                                        category: true
                                    }
                                },
                                variants: {
                                    include: {
                                        product: {
                                            include: {
                                                categories: {
                                                    include: {
                                                        category: true
                                                    }
                                                },
                                                images: true
                                            }
                                        }
                                    }
                                }
                            }
                        },
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
                        mainVariants: {
                            include: {
                                product: {
                                    include: {
                                        images: true,
                                        categories: {
                                            include: {
                                                category: true
                                            }
                                        }
                                    }
                                },
                                productVariantImage: true,
                                productVariantVideo: true
                            }
                        }
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