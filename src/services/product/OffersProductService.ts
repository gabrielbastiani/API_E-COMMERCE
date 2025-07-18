import { StatusProduct } from "@prisma/client";
import prismaClient from "../../prisma";

class OffersProductService {
    async execute() {
        // 1️⃣ busca todos com price_of definido
        const products = await prismaClient.product.findMany({
            where: {
                status: StatusProduct.DISPONIVEL,
                price_of: { not: null },
            },
            include: {
                categories: { include: { category: true } },
                childRelations: {
                    include: { childProduct: true, parentProduct: true, product: true },
                },
                images: true,
                mainPromotion: true,
                parentRelations: {
                    include: { childProduct: true, parentProduct: true, product: true },
                },
                productsDescriptions: true,
                variants: {
                    include: {
                        productVariantImage: true,
                        productVariantVideo: true,
                        mainPromotion: true,
                        variantAttribute: {
                            include: { variantAttributeImage: true },
                        },
                    },
                },
                videos: true,
                promotions: { include: { mainVariants: true } },
                productRelations: true,
            },
        });

        // 2️⃣ filtra apenas os que têm price_per < price_of
        const ofertas = products.filter(
            (p) => (p.price_of ?? Infinity) > p.price_per
        );

        return ofertas;
    }
}

export { OffersProductService };