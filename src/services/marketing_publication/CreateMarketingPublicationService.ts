import { NotificationType, Role } from "@prisma/client";
import prismaClient from "../../prisma";

interface CreateMarketingPublicationServiceProps {
    title?: string;
    description?: string;
    image_url?: string;
    redirect_url?: string;
    publish_at_start?: Date;
    publish_at_end?: Date;
    status?: "Disponivel" | "Indisponivel" | "Programado";
    position: "SLIDER" | "TOP_BANNER" | "SIDEBAR" | "POPUP" | "MOSAICO";
    conditions?: string;
    text_publication?: string;
    local?: string;
    popup_time?: number;
    text_button?: string;
}

class CreateMarketingPublicationService {
    async execute({
        title,
        description,
        image_url,
        redirect_url,
        publish_at_start,
        publish_at_end,
        status,
        position,
        conditions,
        text_publication,
        local,
        popup_time,
        text_button
    }: CreateMarketingPublicationServiceProps) {

        const marketing_publication = await prismaClient.marketingPublication.create({
            data: {
                title,
                description,
                image_url,
                text_button,
                redirect_url,
                publish_at_start: publish_at_start ? new Date(publish_at_start).toISOString() : null,
                publish_at_end: publish_at_end ? new Date(publish_at_end).toISOString() : null,
                position,
                conditions,
                status,
                text_publication,
                local,
                popup_time: popup_time && !isNaN(Number(popup_time)) ? Number(popup_time) : undefined
            },
        });

        const users_superAdmins = await prismaClient.userEcommerce.findMany({ where: { role: Role.SUPER_ADMIN } });
        const users_admins = await prismaClient.userEcommerce.findMany({ where: { role: Role.ADMIN } });

        const all_user_ids = [
            ...users_superAdmins.map((userEcommerce) => userEcommerce.id),
            ...users_admins.map((userEcommerce) => userEcommerce.id),
        ];

        const notificationsData = all_user_ids.map((userEcommerce_id) => ({
            userEcommerce_id,
            message: `Publicidade "${title ? title : "Sem titulo"}" cadastrada.`,
            type: NotificationType.MARKETING
        }));

        await prismaClient.notificationUserEcommerce.createMany({ data: notificationsData });

        return marketing_publication;
    }
}

export { CreateMarketingPublicationService };