import prismaClient from "../../../prisma";

interface NotificationRequest {
    userEcommerce_id: string;
}

class FindNotificationService {
    async execute({ userEcommerce_id }: NotificationRequest) {

        const user_notification_user = await prismaClient.notificationUserEcommerce.findMany({
            where: {
                userEcommerce_id: userEcommerce_id
            },
            orderBy: {
                created_at: 'desc'
            }
        });

        return user_notification_user;

    }
}

export { FindNotificationService }