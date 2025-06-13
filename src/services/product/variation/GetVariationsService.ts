import prismaClient from "../../../prisma";

class GetVariationsService {
    async execute() {

        const variant = await prismaClient.productVariant.findMany();

        return variant
    }
}

export { GetVariationsService };