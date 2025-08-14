import prismaClient from "../../prisma";

interface FavoriteProps {
    customer_id: string;
    product_id: string;
}

class CreateFavoriteService {
    async execute({ customer_id, product_id }: FavoriteProps) {
        const favorite = await prismaClient.favorite.create({
            data: {
                customer_id: customer_id,
                product_id: product_id
            }
        });

        return favorite;

    }
}

export { CreateFavoriteService }