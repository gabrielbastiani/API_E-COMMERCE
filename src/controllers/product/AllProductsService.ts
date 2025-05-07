import moment from "moment";
import prismaClient from "../../prisma";
import { Prisma, StatusProduct } from "@prisma/client";

class AllProductsService {
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
        const whereClause: Prisma.ProductWhereInput = {
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

        const all_products = await prismaClient.product.findMany({
            where: whereClause,
            skip,
            take: limit,
            orderBy: { [orderBy]: orderDirection }
        });

        const total_products = await prismaClient.product.count({
            where: whereClause,
        });

        // ------ PRODUTOS DISPONIVEIS ------ //

        const products_allow = await prismaClient.product.findMany({
            where: {
                status: StatusProduct.DISPONIVEL
            }
        });

        return {
            products: all_products,
            currentPage: page,
            totalPages: Math.ceil(total_products / limit),
            totalProducts: total_products,
            allow_products: products_allow
        };
    }
}

export { AllProductsService };