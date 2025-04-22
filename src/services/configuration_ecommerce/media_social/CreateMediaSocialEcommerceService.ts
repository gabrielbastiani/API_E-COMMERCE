import prismaClient from "../../../prisma"; 

interface MediaProps {
    name_media: string;
    link: string;
    logo_media: string;
}

class CreateMediaSocialEcommerceService {
    async execute({ name_media, link, logo_media }: MediaProps) {

        const config = await prismaClient.socialMedias.create({
            data: {
                name_media: name_media,
                link: link,
                logo_media: logo_media
            }
        })

        return config;

    }
}

export { CreateMediaSocialEcommerceService }