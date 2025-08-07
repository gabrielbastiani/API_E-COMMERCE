import prismaClient from "../../prisma"; 

interface ProductRequest {
    product_id: string;
}

class ProductsBuyToghethesService {
    async execute({ product_id }: ProductRequest) {
        const productData = await prismaClient.product.findUnique({
            where: {
                id: product_id,
                status: "DISPONIVEL"
            },
            include: {
                images: true
            }
        });

        return productData;

    }
}

export { ProductsBuyToghethesService }