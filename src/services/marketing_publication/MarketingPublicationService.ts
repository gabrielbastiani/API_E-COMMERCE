import { Position, StatusMarketingPublication } from "@prisma/client";
import prismaClient from "../../prisma";

interface MarketingProps {
    local?: string;
    position?: string;
}

class MarketingPublicationService {
    async execute({ local, position }: MarketingProps) {
        const publications = await prismaClient.marketingPublication.findMany({
            where: {
                local: local,
                position: position = position as Position,
                OR: [
                    { status: StatusMarketingPublication.Disponivel },
                    { status: StatusMarketingPublication.Disponivel_programado }
                ]
            }
        });

        return publications;

    }
}

export { MarketingPublicationService };