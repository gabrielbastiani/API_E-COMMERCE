import prismaClient from "../../prisma";

interface IntervalProps {
    bannerInterval_id: string;
}

class DeleteIntervalBannerService {
    async execute({ bannerInterval_id }: IntervalProps) {

        const bannerInterval = await prismaClient.bannerInterval.delete({
            where: {
                id: bannerInterval_id
            }
        });

        return bannerInterval;
    }
}

export { DeleteIntervalBannerService };