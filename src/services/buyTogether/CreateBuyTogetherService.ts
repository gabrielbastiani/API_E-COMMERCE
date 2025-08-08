import prismaClient from "../../prisma";

interface CreateBuyTogetherProps {
    name: string;
    products: string[];
}

class CreateBuyTogetherService {
    async execute({ name, products }: CreateBuyTogetherProps) {
        // 1) Cria o grupo
        const group = await prismaClient.buyTogether.create({
            data: {
                name,
                products: products, // salva JSON
            },
        });
       
        return group;
    }
}

export { CreateBuyTogetherService };