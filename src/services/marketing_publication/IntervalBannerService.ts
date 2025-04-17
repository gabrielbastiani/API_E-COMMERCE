import prismaClient from "../../prisma";

interface IntervalProps {
    interval_banner: number;
    local_site: string;
    label_local_site: string;
    label_interval_banner: string;
}

class IntervalBannerService {
    async execute({ interval_banner, local_site, label_local_site, label_interval_banner }: IntervalProps) {

        const bannerInterval = await prismaClient.bannerInterval.create({
            data: {/* @ts-ignore */
                interval_banner: interval_banner && !isNaN(Number(interval_banner)) ? Number(interval_banner) : undefined,
                local_site: local_site,
                label_local_site: label_local_site,
                label_interval_banner: label_interval_banner
            },
        });

        return bannerInterval;
    }
}

export { IntervalBannerService };