import prismaClient from "../../../../prisma";

interface UserRequest {
    customer_id: string;
}

class CustomerOrderService {
    async execute({ customer_id }: UserRequest) {
        const ordersData = await prismaClient.order.findMany({
            where: {
                customer_id: customer_id
            },
            include: {
                _count: true,
                appliedPromotions: {
                    include: {
                        order: true,
                        promotion: true
                    }
                },
                commentOrder: {
                    include: {
                        order: true,
                        userEcommerce: true
                    }
                },
                items: {
                    include: {
                        order: true,
                        product: {
                            include: {
                                images: true,
                                mainPromotion: {
                                    include: {
                                        coupons: true,
                                        displays: true
                                    }
                                },
                                promotions: true,
                                variants: {
                                    include: {
                                        variantAttribute: {
                                            include: {
                                                variant: true,
                                                variantAttributeImage: true
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                },
                payment: {
                    include: {
                        customer: true,
                        order: true
                    }
                },
                promotion: {
                    include: {
                        actions: true,
                        badges: true,
                        conditions: true,
                        coupons: true,
                        displays: true
                    }
                }
            }
        });

        return ordersData;

    }
}

export { CustomerOrderService }