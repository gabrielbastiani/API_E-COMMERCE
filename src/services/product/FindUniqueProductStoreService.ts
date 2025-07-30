import prismaClient from "../../prisma";

interface ProductProps {
    product_id: string;
}

class FindUniqueProductStoreService {
    async execute({ product_id }: ProductProps) {
        const product = await prismaClient.product.findUnique({
            where: {
                id: product_id
            },
            include: {
                categories: {
                    include: {
                        category: true
                    }
                },
                images: true,
                variants: true
            }
        })

        return product;

    }
}

export { FindUniqueProductStoreService }