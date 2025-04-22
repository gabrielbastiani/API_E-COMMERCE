import prismaClient from "../../../prisma"; 

class MediasSocialsEcommerceService {
    async execute() {
        const config = await prismaClient.socialMedias.findMany({
            orderBy: {
                created_at: "desc"
            }
        });
        return config;
    }
}

export { MediasSocialsEcommerceService }