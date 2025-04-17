import { NotificationType, Role } from "@prisma/client";
import prismaClient from "../../prisma";

interface NewsRrequest {
    email_user: string;
}

class NewsletterCreateService {
    async execute({ email_user }: NewsRrequest) {
        const comment_create = await prismaClient.newsletter.create({
            data: {
                email_user: email_user
            }
        });

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

        const notificationsData = all_user_ids.map(user_id => ({
            user_id,
            message: "Novo newslatter cadastrado",
            type: NotificationType.NEWSLETTER
        }));

        await prismaClient.notificationUserEcommerce.createMany({
            data: notificationsData
        });

        return comment_create;

    }
}

export { NewsletterCreateService }