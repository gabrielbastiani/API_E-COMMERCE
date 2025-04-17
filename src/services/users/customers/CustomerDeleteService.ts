import { NotificationType } from "@prisma/client";
import prismaClient from "../../../prisma";

interface UserRequest {
    id_delete: string[];
    name?: string;
    userEcommerce_id?: string;
}

class CustomerDeleteService {
    async execute({ id_delete, name, userEcommerce_id }: UserRequest) {

        const users = await prismaClient.customer.findMany({
            where: {
                id: {
                    in: id_delete
                }
            }
        });

        const deletedUsers = await prismaClient.customer.deleteMany({
            where: {
                id: {
                    in: id_delete
                }
            }
        });

        await prismaClient.notificationUserEcommerce.createMany({
            data: users.map((user) => ({
                userEcommerce_id: userEcommerce_id,
                message: `Cliente ${user.name} foi deletado pelo usuário ${name}.`,
                type: NotificationType.USER
            }))
        });

        return deletedUsers;
    }
}

export { CustomerDeleteService };