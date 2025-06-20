import prismaClient from "../../prisma";

interface PromotionRequest {
    promotion_id: string;
    active: boolean;
}

class StatusPromotionService {
    async execute({ promotion_id, active }: PromotionRequest) {
        const promotion = await prismaClient.promotion.update({
            where: { id: promotion_id },
            data: {
                active: active
            }
        });

        return promotion;

    }
}

export { StatusPromotionService }