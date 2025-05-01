import { NotificationType, Role } from "@prisma/client";
import prismaClient from "../../prisma";
import fs from 'fs';
import path from 'path';

interface UserRequest {
    id_delete: string[];
    name?: string;
}

class MarketingPublicationDeleteService {
    async execute({ id_delete, name }: UserRequest) {

        const publications = await prismaClient.marketingPublication.findMany({
            where: {
                id: {
                    in: id_delete
                }
            }
        });

        publications.forEach((marketingPublication) => {
            if (marketingPublication?.image_url) {
                const imagePath = path.resolve(__dirname + '/' + '..' + '/' + '..' + '/' + '..' + '/' + 'images' + '/' + marketingPublication?.image_url);
                fs.unlink(imagePath, (err) => {
                    if (err) {
                        console.error(`Failed to delete image for marketingPublication ${marketingPublication.id}: ${err.message}`);
                    } else {
                        console.log(`Image for marketingPublication ${marketingPublication.id} deleted successfully`);
                    }
                });
            }
        });

        // Remoção das categorias do banco de dados
        const deleted_publications = await prismaClient.marketingPublication.deleteMany({
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
            ...users_superAdmins.map(userEcommerce => userEcommerce.id),
            ...users_admins.map(userEcommerce => userEcommerce.id)
        ];

        // Criação de notificações para cada publicidade deletada e cada usuário
        await prismaClient.notificationUserEcommerce.createMany({
            data: publications.flatMap((marketingPublication) =>
                all_user_ids.map((userEcommerce_id) => ({
                    userEcommerce_id,
                    message: `Publicidade(s) ${marketingPublication.title} foi deletada(s) pelo usuário ${name}.`,
                    type: NotificationType.MARKETING
                }))
            )
        });

        return deleted_publications;
    }
}

export { MarketingPublicationDeleteService };