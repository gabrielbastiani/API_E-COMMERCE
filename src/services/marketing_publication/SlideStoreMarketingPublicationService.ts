import { Position, StatusMarketingPublication } from "@prisma/client";
import prismaClient from "../../prisma";

interface MarketingProps {
    local?: string;
    position?: string;
}

class SlideStoreMarketingPublicationService {
    async execute({ local, position }: MarketingProps) {
        const publications_store_slides = await prismaClient.marketingPublication.findMany({
            where: {
                local: local,
                position: position = position as Position,
                OR: [
                    { status: StatusMarketingPublication.Disponivel },
                    { status: StatusMarketingPublication.Disponivel_programado }
                ]
            }
        });

        return publications_store_slides;

    }
}

export { SlideStoreMarketingPublicationService };