import prismaClient from "../../../prisma";

interface NotificationRequest {
    userEcommerce_id: string;
}

class MarkAllNotificationsAsReadService {
    async execute({ userEcommerce_id }: NotificationRequest) {
        const user_notification_user = await prismaClient.notificationUserEcommerce.updateMany({
            where: {
                read: false,
                userEcommerce_id: userEcommerce_id,
            },
            data: {
                read: true
            }
        });

        return user_notification_user;

    }
}

export { MarkAllNotificationsAsReadService }