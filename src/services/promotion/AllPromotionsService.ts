import moment from "moment";
import prismaClient from "../../prisma";
import { Prisma } from "@prisma/client";

class AllPromotionsService {
    async execute(
        page: number = 1,
        limit: number = 5,
        search: string = "",
        orderBy: string = "created_at",
        orderDirection: Prisma.SortOrder = "desc",
        startDate?: string,
        endDate?: string
    ) {
        const skip = (page - 1) * limit;

        // Construção da cláusula 'where' com filtro de texto e data
        const whereClause: Prisma.PromotionWhereInput = {
            ...(
                search ? {
                    OR: [
                        { name: { contains: search, mode: Prisma.QueryMode.insensitive } }
                    ]
                } : {}
            ),
            ...(
                startDate && endDate ? {
                    created_at: {
                        gte: moment(startDate).startOf('day').toISOString(),
                        lte: moment(endDate).endOf('day').toISOString(),
                    }
                } : {}
            )
        };

        const all_promotions = await prismaClient.promotion.findMany({
            where: whereClause,
            skip,
            take: limit,
            orderBy: { [orderBy]: orderDirection },
            include: {
                categories: true,
                featuredProducts: true,
                mainVariants: true,
                products: true,
                variantPromotions: true
            }
        });

        const total_promotion = await prismaClient.promotion.count({
            where: whereClause,
        });

        // ---------- PROMOTIONS DOSPONIVEL ---------------- //

        const promotions = await prismaClient.promotion.findMany({
            where: {
                active: true
            }
        });

        return {
            allow_promotions: promotions,
            promotions: all_promotions,
            currentPage: page,
            totalPages: Math.ceil(total_promotion / limit),
            totalPromotion: total_promotion,
        };
    }
}

export { AllPromotionsService };