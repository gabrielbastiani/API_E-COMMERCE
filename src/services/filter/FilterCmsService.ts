import moment from "moment";
import prismaClient from "../../prisma";
import { Prisma } from "@prisma/client";

class FilterCmsService {
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
        const whereClause: Prisma.FilterWhereInput = {
            ...(
                search ? {
                    OR: [
                        { name: { contains: search, mode: Prisma.QueryMode.insensitive } },
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

        const all_filters = await prismaClient.filter.findMany({
            where: whereClause,
            skip,
            take: limit,
            orderBy: { [orderBy]: orderDirection },
            include: {
                category: true,
                categoryFilter: true,
                directCategories: true,
                group: true,
                options: true
            }
        });

        const total_filter = await prismaClient.filter.count({
            where: whereClause
        });

        return {
            filters: all_filters,
            currentPage: page,
            totalPages: Math.ceil(total_filter / limit),
            totalFilters: total_filter,
        };
    }
}

export { FilterCmsService };