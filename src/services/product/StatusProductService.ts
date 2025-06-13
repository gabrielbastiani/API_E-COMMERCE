import { StatusProduct } from "@prisma/client";
import prismaClient from "../../prisma";

interface ProductStatusRequest {
    product_id: string;
    status: string;
}

class StatusProductService {
    async execute({ product_id, status }: ProductStatusRequest) {
        const product = await prismaClient.product.update({
            where: { id: product_id },
            data: {
                status: status as StatusProduct
            }
        });

        return product;

    }
}

export { StatusProductService }