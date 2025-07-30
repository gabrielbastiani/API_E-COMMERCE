import prismaClient from "../../../prisma";

interface VariantRequest {
    variant_id: string;
}

class GetVariantUniqueService {
    async execute({ variant_id }: VariantRequest) {

        const variant = await prismaClient.productVariant.findUnique({
            where: {
                id: variant_id
            },
            include: {
                product: true
            }
        });

        return variant
    }
}

export { GetVariantUniqueService };