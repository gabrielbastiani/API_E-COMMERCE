import { StatusProduct } from "@prisma/client";
import prismaClient from "../../prisma";

class HighlightsProductsService {
    async execute() {
        const product = await prismaClient.product.findMany({
            where: {
                status: StatusProduct.DISPONIVEL
            },
            orderBy: {
                view: "desc"
            },
            include: {
                categories: {
                    include: {
                        category: true
                    }
                },
                images: true
            }
        })

        return product;

    }
}

export { HighlightsProductsService }