import moment from "moment";
import prismaClient from "../../prisma";
import { Prisma } from "@prisma/client";

class GetBuyTogetherService {
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
        const whereClause: Prisma.BuyTogetherWhereInput = {
            ...(
                search ? {
                    OR: [
                        { name_group: { contains: search, mode: Prisma.QueryMode.insensitive } },
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

        const all_BuyTogether = await prismaClient.buyTogether.findMany({
            where: whereClause,
            skip,
            take: limit,
            orderBy: { [orderBy]: orderDirection },
            include: {
                product: {
                    include: {
                        images: true
                    }
                }
            }
        });

        const total_buyTogether = await prismaClient.buyTogether.count({
            where: whereClause,
        });

        return {
            buyTogethers: all_BuyTogether,
            currentPage: page,
            totalPages: Math.ceil(total_buyTogether / limit),
            totalBuyTogether: total_buyTogether,
        };
    }
}

export { GetBuyTogetherService };