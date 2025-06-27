import prismaClient from "../../prisma";

interface UpdateBuyTogetherProps {
    id: string;
    name_group?: string;
    products?: string[];
}

class UpdateBuyTogetherService {
    async execute({ id, name_group, products }: UpdateBuyTogetherProps) {
        // Desvincula produtos antigos
        if (products) {
            const old = await prismaClient.buyTogether.findUnique({ where: { id } });
            await prismaClient.product.updateMany({
                where: { buyTogether_id: id },
                data: { buyTogether_id: null },
            });
            // Atualiza novo vínculo
            await prismaClient.product.updateMany({
                where: { id: { in: products } },
                data: { buyTogether_id: id },
            });
        }
        return prismaClient.buyTogether.update({
            where: { id },
            data: {
                name_group,
                products,
            },
        });
    }
}

export { UpdateBuyTogetherService };