import prismaClient from "../../../prisma";

class AllSeoEcommercePageService {
    async execute() {
        const seoPage = await prismaClient.sEOSettings.findMany();

        return seoPage;

    }
}

export { AllSeoEcommercePageService }