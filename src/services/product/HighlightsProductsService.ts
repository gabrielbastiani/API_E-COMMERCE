import { StatusProduct } from "@prisma/client";
import prismaClient from "../../prisma";

class HighlightsProductsService {
    async execute() {
        const product = await prismaClient.product.findMany({
            where: {
                status: StatusProduct.DISPONIVEL
            },
            orderBy: {
                view: "desc"
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
                        mainPromotion: {
                            include: {
                                actions: true,
                                badges: true,
                                conditions: true,
                                categories: true,
                                coupons: true,
                                displays: true,
                                featuredProducts: true,
                                mainVariants: true,
                                variantPromotions: true
                            },
                        },
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
                },
                reviews: {
                    include: {
                        customer: true,
                        product: true
                    }
                }
            }
        })

        return product;

    }
}

export { HighlightsProductsService }