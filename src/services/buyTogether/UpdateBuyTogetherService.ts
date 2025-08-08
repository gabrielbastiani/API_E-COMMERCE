import prismaClient from "../../prisma";

interface UpdateBuyTogetherProps {
    id: string;
    name?: string;
    products?: string[];
}

class UpdateBuyTogetherService {
    async execute({ id, name, products }: UpdateBuyTogetherProps) {
        
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