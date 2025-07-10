import { Position, StatusMarketingPublication } from "@prisma/client";
import prismaClient from "../../prisma";

interface SidebarProps {
    local: string;
}

class ExistingSidebarBannerPageService {
    async execute({ local }: SidebarProps) {
        const bannerInterval = await prismaClient.marketingPublication.findMany({
            where: {
                local: local,
                position: Position.SIDEBAR,
                OR: [
                    { status: StatusMarketingPublication.Disponivel },
                    { status: StatusMarketingPublication.Disponivel_programado }
                ]
            }
        });
        return bannerInterval;
    }
}

export { ExistingSidebarBannerPageService };