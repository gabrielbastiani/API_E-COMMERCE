import prismaClient from "../../../prisma";

interface SeoProps {
    page: string;
    title?: string;
    description?: string;
    keywords?: string[];
    ogTitle?: string;
    ogDescription?: string;
    ogImages?: string[];
    ogImageWidth?: number;
    ogImageHeight?: number;
    ogImageAlt?: string;
    twitterTitle?: string;
    twitterDescription?: string;
    twitterCreator?: string;
    twitterImages?: string[];
}

class CreateSeoEcommerceService {
    async execute(seoData: SeoProps) {
        const config = await prismaClient.sEOSettings.create({
            data: seoData
        });

        return config;
    }
}

export { CreateSeoEcommerceService }