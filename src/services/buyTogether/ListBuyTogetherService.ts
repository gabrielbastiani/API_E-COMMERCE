import prismaClient from "../../prisma";

class ListBuyTogetherService {
    async execute() {
        return prismaClient.buyTogether.findMany({
            orderBy: { created_at: "desc" },
            include: { product: true },
        });
    }
}

export { ListBuyTogetherService };