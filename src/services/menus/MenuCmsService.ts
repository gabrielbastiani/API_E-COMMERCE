import moment from "moment";
import prismaClient from "../../prisma";
import { Prisma } from "@prisma/client";

class MenuCmsService {
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
        const whereClause: Prisma.MenuWhereInput = {
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

        const all_menus = await prismaClient.menu.findMany({
            where: whereClause,
            skip,
            take: limit,
            orderBy: { [orderBy]: orderDirection },
            include: {
                items: {
                    include: {
                        children: true,
                        parent: true,
                        menu: true,
                    }
                }
            }
        });

        const total_menus = await prismaClient.menu.count({
            where: whereClause
        });

        return {
            menus: all_menus,
            currentPage: page,
            totalPages: Math.ceil(total_menus / limit),
            totalFilters: total_menus,
        };
    }
}

export { MenuCmsService };