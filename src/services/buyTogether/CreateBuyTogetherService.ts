import prismaClient from "../../prisma";

interface CreateBuyTogetherProps {
    name_group: string;
    products: string[];
}

class CreateBuyTogetherService {
    async execute({ name_group, products }: CreateBuyTogetherProps) {
        // 1) Cria o grupo
        const group = await prismaClient.buyTogether.create({
            data: {
                name_group,
                products: products, // salva JSON
            },
        });
        // 2) Atualiza cada produto para apontar para esse grupo
        await prismaClient.product.updateMany({
            where: { id: { in: products } },
            data: { buyTogether_id: group.id },
        });
        return group;
    }
}

export { CreateBuyTogetherService };