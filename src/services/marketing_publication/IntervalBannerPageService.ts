import prismaClient from "../../prisma";

interface PageInterval {
    local_site: string;
}

class IntervalBannerPageService {
    async execute({ local_site }: PageInterval) {
        const bannerInterval = await prismaClient.bannerInterval.findFirst({
            where: {
                local_site: local_site
            }
        });
        return bannerInterval;
    }
}

export { IntervalBannerPageService };