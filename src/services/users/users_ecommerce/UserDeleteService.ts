import { NotificationType } from "@prisma/client";
import prismaClient from "../../../prisma";
import fs from 'fs';
import path from 'path';

interface UserRequest {
    id_delete: string[];
    name?: string;
    userEcommerce_id?: string;
}

class UserDeleteService {
    async execute({ id_delete, name, userEcommerce_id }: UserRequest) {

        const users = await prismaClient.userEcommerce.findMany({
            where: {
                id: {
                    in: id_delete
                }
            }
        });

        users.forEach((userEcommerce) => {
            if (userEcommerce.photo) {
                const imagePath = path.resolve(__dirname + '/' + '..' + '/' + '..' + '/' + '..' + '/' + 'images' + '/' + userEcommerce.photo);
                fs.unlink(imagePath, (err) => {
                    if (err) {
                        console.error(`Failed to delete image for userEcommerce ${userEcommerce.id}: ${err.message}`);
                    } else {
                        console.log(`Image for userEcommerce ${userEcommerce.id} deleted successfully`);
                    }
                });
            }
        });

        const deletedUsers = await prismaClient.userEcommerce.deleteMany({
            where: {
                id: {
                    in: id_delete
                }
            }
        });

        await prismaClient.notificationUserEcommerce.createMany({
            data: users.map((userEcommerce) => ({
                userEcommerce_id: userEcommerce_id,
                message: `Usuário ${userEcommerce.name} foi deletado pelo usuário ${name}.`,
                type: NotificationType.USER
            }))
        });

        return deletedUsers;
    }
}

export { UserDeleteService };