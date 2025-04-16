import prismaClient from "../../prisma";

interface UserRequest {
    userEcommerce_id: string;
}

class UserDetailService {
    async execute({ userEcommerce_id }: UserRequest) {
        const userEcommerce = await prismaClient.userEcommerce.findFirst({
            where: {
                id: userEcommerce_id
            },
            select: {
                created_at: true,
                email: true,
                id: true,
                photo: true,
                role: true,
                name: true,
                status: true
            }
        });

        return userEcommerce;

    }
}

export { UserDetailService }