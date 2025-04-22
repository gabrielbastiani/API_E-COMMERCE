import prismaClient from "../../../prisma";

interface MediaProps {
    socialMediasBlog_id: string;
}

class DeleteMediasSocialsEcommerceService {
    async execute({ socialMediasBlog_id }: MediaProps) {
        const config = await prismaClient.socialMedias.delete({
            where: {
                id: socialMediasBlog_id
            }
        });

        return config;

    }
}

export { DeleteMediasSocialsEcommerceService }