import prismaClient from "../../../prisma";

interface NotificationRequest {
    notificationUserEcommerce_id: string;
}

class MarkNotificationReadService {
    async execute({ notificationUserEcommerce_id }: NotificationRequest) {
        const user_notification_user = await prismaClient.notificationUserEcommerce.update({
            where: {
                id: notificationUserEcommerce_id
            },
            data: {
                read: true
            }
        });

        return user_notification_user;

    }
}

export { MarkNotificationReadService }