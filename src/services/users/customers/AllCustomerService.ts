import moment from "moment";
import prismaClient from "../../../prisma";
import { Prisma } from "@prisma/client";

class AllCustomerService {
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

        const whereClause: Prisma.CustomerWhereInput = {
            ...(
                search ? {
                    OR: [
                        { name: { contains: search, mode: Prisma.QueryMode.insensitive } },
                        { email: { contains: search, mode: Prisma.QueryMode.insensitive } },
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
            ),
        };

        const all_users = await prismaClient.customer.findMany({
            where: whereClause,
            skip,
            take: limit,
            orderBy: { [orderBy]: orderDirection },
        });

        const total_users = await prismaClient.customer.count({
            where: whereClause,
        });

        // ----- CLIENTES DISPONIVEIS ----- //

        const all_customers = await prismaClient.customer.findMany();

        return {
            all_customers: all_customers,
            usersBlog: all_users,
            currentPage: page,
            totalPages: Math.ceil(total_users / limit),
            totalUsers: total_users,
        };
    }
}

export { AllCustomerService };