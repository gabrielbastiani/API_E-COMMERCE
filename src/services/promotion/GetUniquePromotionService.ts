import prismaClient from "../../prisma";

interface PromotionRequest {
    promotion_id: string;
}

class GetUniquePromotionService {
    async execute({ promotion_id }: PromotionRequest) {
        const promotion = await prismaClient.promotion.findUnique({
            where: { 
                id: promotion_id 
            },
            include: {
                actions: true,
                badges: true,
                categories: true,
                conditions: true,
                coupons: true,
                displays: true,
                featuredProducts: true,
                mainVariants: true,
                products: true,
                promotionUsage: true,
                variantPromotions: true
            }
        });

        return promotion;

    }
}

export { GetUniquePromotionService }