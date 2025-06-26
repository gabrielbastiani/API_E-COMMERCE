import moment from "moment";
import prismaClient from "../../prisma";
import { Prisma } from "@prisma/client";

class AllProductsCategoryService {
    async execute(
        category_id: string,
        page = 1,
        limit = 5,
        search = "",
        orderBy: string = "created_at",
        orderDirection: Prisma.SortOrder = "desc",
        startDate?: string,
        endDate?: string
    ) {
        const skip = (page - 1) * limit;

        // Monta cláusula 'where' unificando filtro de categoria + busca + data
        const whereClause: Prisma.ProductWhereInput = {
            categories: {
                some: {
                    category_id,
                },
            },
            ...(search
                ? {
                    name: {
                        contains: search,
                        mode: Prisma.QueryMode.insensitive,
                    },
                }
                : {}),
            ...(startDate && endDate
                ? {
                    created_at: {
                        gte: moment(startDate).startOf("day").toISOString(),
                        lte: moment(endDate).endOf("day").toISOString(),
                    },
                }
                : {}),
        };

        // Busca os produtos filtrados
        const products = await prismaClient.product.findMany({
            where: whereClause,
            skip,
            take: limit,
            orderBy: { [orderBy]: orderDirection },
            include: {
                categories: {
                    include: { category: true },
                },
                images: true,
                variants: true,
                productRelations: {
                    include: {
                        parentProduct: true,
                        childProduct: true,
                    },
                },
                parentRelations: {
                    include: {
                        parentProduct: true,
                        childProduct: true,
                    },
                },
                productView: true,
            },
        });

        // Conta o total para paginação
        const totalProducts = await prismaClient.product.count({
            where: whereClause,
        });

        const category = await prismaClient.category.findUnique({
            where: {
                id: category_id
            }
        });

        return {
            products,
            currentPage: page,
            totalPages: Math.ceil(totalProducts / limit),
            totalProducts,
            category: category
        };
    }
}

export { AllProductsCategoryService };