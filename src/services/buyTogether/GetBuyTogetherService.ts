import moment from "moment";
import prismaClient from "../../prisma";
import { Prisma } from "@prisma/client";

interface ListParams {
    page?: number;
    limit?: number;
    search?: string;
    orderBy?: string;
    orderDirection?: Prisma.SortOrder;
    startDate?: string;
    endDate?: string;
}

export class GetBuyTogetherService {
    async execute({
        page = 1,
        limit = 5,
        search = "",
        orderBy = "created_at",
        orderDirection = "desc",
        startDate,
        endDate,
    }: ListParams) {
        const skip = (page - 1) * limit;

        // Monta filtro só sobre o BuyTogether
        const whereClause: Prisma.BuyTogetherWhereInput = {
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
                        gte: moment(startDate).startOf("day").toDate(),
                        lte: moment(endDate).endOf("day").toDate(),
                    },
                }
                : {}),
        };

        // Busca paginada, mas **não** inclui `product` relacional
        const rawGroups = await prismaClient.buyTogether.findMany({
            where: whereClause,
            skip,
            take: limit,
            orderBy: { [orderBy]: orderDirection },
            include: { product: { include: { images: true } } },
        });

        const total = await prismaClient.buyTogether.count({ where: whereClause });

        // Para cada grupo, busca exatamente os produtos do JSON `products`
        const buyTogethers = await Promise.all(
            rawGroups.map(async (bt) => {
                // bt.products é o JSON: array de IDs (strings)
                const ids = Array.isArray(bt.products) ? (bt.products as string[]) : [];

                // Se tiver IDs, busca todos de uma vez
                const products = ids.length
                    ? await prismaClient.product.findMany({
                        where: { id: { in: ids } },
                        include: { images: true },
                    })
                    : [];

                // Mapeia pro shape do frontend
                const productShape = products.map((p) => ({
                    name: p.name,
                    images: p.images.map((img) => ({
                        url: img.url,
                        isPrimary: img.isPrimary,
                    })),
                }));

                return {
                    id: bt.id,
                    name: bt.name || "",
                    status: bt.status,
                    created_at: bt.created_at,
                    product: productShape,
                };
            })
        );

        return {
            buyTogethers,
            currentPage: page,
            totalPages: Math.ceil(total / limit),
            totalBuyTogether: total,
        };
    }
}