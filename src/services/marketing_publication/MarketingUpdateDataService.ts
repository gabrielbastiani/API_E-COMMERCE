import { Position, StatusMarketingPublication } from '@prisma/client';
import prismaClient from '../../prisma';
import fs from 'fs';
import path from 'path';

interface PublicationProps {
    marketingPublication_id: string;
    title?: string;
    description?: string;
    image_url?: string;
    status?: "Disponivel" | "Indisponivel" | "Programado";
    redirect_url?: string;
    publish_at_start?: Date;
    publish_at_end?: Date;
    position?: "SLIDER" | "TOP_BANNER" | "SIDEBAR" | "POPUP";
    conditions?: string;
    popup_time?: number;
    text_publication?: string | null | undefined;
    local?: string;
    text_button?: string;
}

class MarketingUpdateDataService {
    async execute({
        marketingPublication_id,
        title,
        description,
        image_url,
        status,
        text_button,
        redirect_url,
        publish_at_start,
        publish_at_end,
        position,
        conditions,
        popup_time,
        text_publication,
        local
    }: PublicationProps) {

        const marketingPublication = await prismaClient.marketingPublication.findUnique({
            where: { id: marketingPublication_id }
        });

        const dataToUpdate: any = {};

        if (title) {
            dataToUpdate.title = title;
        }

        if (local) {
            dataToUpdate.local = local;
        }

        if (conditions) {
            dataToUpdate.conditions = conditions;
        }

        if (text_button) {
            dataToUpdate.text_button = text_button;
        }

        if (popup_time) {
            dataToUpdate.popup_time = Number(popup_time);
        }

        if (position) {
            dataToUpdate.position = position as Position;
        }

        if (description) {
            dataToUpdate.description = description;
        }

        if (!description) {
            dataToUpdate.description = "";
        }

        if (text_publication) {
            dataToUpdate.text_publication = text_publication;
        }

        if (!text_publication) {
            dataToUpdate.text_publication = "";
        }

        if (image_url) {
            if (marketingPublication?.image_url) {
                const imagePath = path.resolve(__dirname + '/' + '..' + '/' + '..' + '/' + '..' + '/' + 'images' + '/' + marketingPublication?.image_url);
                fs.unlink(imagePath, (err) => {
                    if (err) {
                        console.error(`Failed to delete old image: ${err.message}`);
                    } else {
                        console.log('Old image deleted successfully');
                    }
                });
            }
            dataToUpdate.image_url = image_url;
        }

        if (status) {
            if (status === "Programado") {
                dataToUpdate.is_completed = false,
                    dataToUpdate.email_sent = false
            }
            dataToUpdate.status = status as StatusMarketingPublication;
        }

        if (redirect_url) {
            dataToUpdate.redirect_url = redirect_url;
        }

        if (publish_at_start) {
            dataToUpdate.publish_at_start = publish_at_start ? new Date(publish_at_start).toISOString() : null;
        }

        if (publish_at_end) {
            dataToUpdate.publish_at_end = publish_at_end ? new Date(publish_at_end).toISOString() : null;
        }

        const update_publications = await prismaClient.marketingPublication.update({
            where: {
                id: marketingPublication_id
            },
            data: dataToUpdate
        });

        return update_publications;
    }
}

export { MarketingUpdateDataService };