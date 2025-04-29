import moment from "moment";
import prismaClient from "../../../prisma";
import { Prisma, NotificationType } from "@prisma/client"; // Importe o enum NotificationType

class FindUsersNotificationService {
    async execute(
        page: number = 1,
        limit: number = 5,
        search: string = "",
        orderBy: string = "created_at",
        orderDirection: Prisma.SortOrder = "desc",
        startDate?: string,
        endDate?: string,
        userEcommerce_id?: string
    ) {
        const skip = (page - 1) * limit;

        // Função para obter os valores do enum que correspondem à pesquisa
        const getMatchingNotificationTypes = (searchTerm: string): NotificationType[] => {
            const searchLower = searchTerm.toLowerCase();
            return Object.values(NotificationType).filter(type =>
                type.toLowerCase().includes(searchLower)
            );
        };

        const whereClause: Prisma.NotificationUserEcommerceWhereInput = {
            ...(search ? {
                OR: [
                    // Filtra pelos tipos de notificação que correspondem à pesquisa
                    { type: { in: getMatchingNotificationTypes(search) } }
                ]
            } : {}),
            ...(startDate && endDate ? {
                created_at: {
                    gte: moment(startDate).startOf('day').toISOString(),
                    lte: moment(endDate).endOf('day').toISOString(),
                }
            } : {}),
            ...(userEcommerce_id ? { userEcommerce_id } : {})
        };

        const all_notifications = await prismaClient.notificationUserEcommerce.findMany({
            where: whereClause,
            skip,
            take: limit,
            orderBy: { [orderBy]: orderDirection },
        });

        const total_notifications = await prismaClient.notificationUserEcommerce.count({
            where: whereClause,
        });

        return {
            notifications_user: all_notifications,
            currentPage: page,
            totalPages: Math.ceil(total_notifications / limit),
            totalContacts: total_notifications,
        };
    }
}

export { FindUsersNotificationService };