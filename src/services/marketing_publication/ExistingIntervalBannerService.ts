import prismaClient from "../../prisma";

class ExistingIntervalBannerService {
    async execute() {
        const bannerInterval = await prismaClient.bannerInterval.findMany();
        return bannerInterval;
    }
}

export { ExistingIntervalBannerService };