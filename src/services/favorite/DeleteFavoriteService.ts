import prismaClient from "../../prisma";

interface FavoriteProps {
    customer_id: string;
    product_id: string;
}

class DeleteFavoriteService {
    async execute({ customer_id, product_id }: FavoriteProps) {
        const favorite = await prismaClient.favorite.delete({
            where: {
                customer_id_product_id: {
                    customer_id,
                    product_id
                }
            }
        });

        return favorite;
    }
}

export { DeleteFavoriteService }