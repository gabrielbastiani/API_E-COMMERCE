import { NotificationType, Role } from "@prisma/client";
import prismaClient from "../../prisma";
import fs from 'fs';
import path from 'path';

interface UserRequest {
    id_delete: string[];
    name?: string;
}

class CategoryDeleteService {
    async execute({ id_delete, name }: UserRequest) {

        const categories = await prismaClient.category.findMany({
            where: {
                id: {
                    in: id_delete
                }
            }
        });

        categories.forEach((category) => {
            if (category.image) {
                const imagePath = path.resolve(__dirname + '/' + '..' + '/' + '..' + '/' + '..' + '/' + 'images' + '/' + category.image);
                fs.unlink(imagePath, (err) => {
                    if (err) {
                        console.error(`Failed to delete image for category ${category.id}: ${err.message}`);
                    } else {
                        console.log(`Image for category ${category.id} deleted successfully`);
                    }
                });
            }
        });

        // Remoção das categorias do banco de dados
        const deleted_categories = await prismaClient.category.deleteMany({
            where: {
                id: {
                    in: id_delete
                }
            }
        });

        // Busca de IDs dos usuários SUPER_ADMIN e ADMIN
        const users_superAdmins = await prismaClient.userEcommerce.findMany({
            where: {
                role: Role.SUPER_ADMIN
            }
        });

        const users_admins = await prismaClient.userEcommerce.findMany({
            where: {
                role: Role.ADMIN
            }
        });

        const all_user_ids = [
            ...users_superAdmins.map(user => user.id),
            ...users_admins.map(user => user.id)
        ];

        // Criação de notificações para cada categoria deletada e cada usuário
        await prismaClient.notificationUserEcommerce.createMany({
            data: categories.flatMap((category) =>
                all_user_ids.map((userEcommerce_id) => ({
                    userEcommerce_id,
                    message: `Categoria(s) ${category.name} foi deletada(s) pelo usuário ${name}.`,
                    type: NotificationType.CATEGORY
                }))
            )
        });

        return deleted_categories;
    }
}

export { CategoryDeleteService };