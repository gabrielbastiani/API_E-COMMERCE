import prismaClient from "../../../prisma";

interface SeoProps {
    sEOSettings_id: string;
}

class GetSeoUniqueService {
    async execute({ sEOSettings_id }: SeoProps) {
        const seoPage = await prismaClient.sEOSettings.findFirst({
            where: {
                id: sEOSettings_id
            }
        });

        return seoPage;

    }
}

export { GetSeoUniqueService }