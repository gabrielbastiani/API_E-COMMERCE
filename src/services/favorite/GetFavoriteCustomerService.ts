import prismaClient from "../../prisma";

interface FavoriteProps {
    customer_id: string;
}

class GetFavoriteCustomerService {
    async execute({ customer_id }: FavoriteProps) {
        const favorite = await prismaClient.favorite.findMany({
            where: {
                customer_id: customer_id,
            }
        });

        return favorite;

    }
}

export { GetFavoriteCustomerService }