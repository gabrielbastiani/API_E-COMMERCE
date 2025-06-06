import { StatusProduct } from "@prisma/client";
import prismaClient from "../../prisma";

interface ProductStatusRequest {
    id: string;
    status: string;
}

class StatusProductService {
    async execute({ id, status }: ProductStatusRequest) {
        const product = await prismaClient.product.update({
            where: { id: id },
            data: {
                status: status as StatusProduct
            }
        });

        console.log(product)

        return product;

    }
}

export { StatusProductService }
