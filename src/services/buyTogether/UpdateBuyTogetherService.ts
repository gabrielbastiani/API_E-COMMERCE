import prismaClient from "../../prisma";

interface UpdateBuyTogetherProps {
    id: string;
    name?: string;
    products?: string[];
}

class UpdateBuyTogetherService {
    async execute({ id, name, products }: UpdateBuyTogetherProps) {
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
                name,
                products,
            },
        });
    }
}

export { UpdateBuyTogetherService };