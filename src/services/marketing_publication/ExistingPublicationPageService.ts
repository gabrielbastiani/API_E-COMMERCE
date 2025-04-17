import { Position, StatusMarketingPublication } from "@prisma/client";
import prismaClient from "../../prisma";

interface PageInterval {
    local: string;
    position: string;
}

class ExistingPublicationPageService {
    async execute({ local, position }: PageInterval) {
        const bannerInterval = await prismaClient.marketingPublication.findMany({
            where: {
                local: local,
                position: position as Position,
                OR: [
                    { status: StatusMarketingPublication.Disponivel },
                    { status: StatusMarketingPublication.Disponivel_programado }
                ]
            }
        });
        return bannerInterval;
    }
}

export { ExistingPublicationPageService };