import prismaClient from '../../../prisma'; 
import fs from 'fs';
import path from 'path';

interface MediaProps {
    socialMediasBlog_id: string;
    name_media?: string;
    link?: string;
    logo_media?: string
}

class UpdateMediaSocialEcommerceService {
    async execute({
        socialMediasBlog_id,
        name_media,
        link,
        logo_media
    }: MediaProps) {

        const mediasSocial = await prismaClient.socialMedias.findUnique({
            where: { id: socialMediasBlog_id }
        });

        const dataToUpdate: any = {};

        if (name_media) {
            dataToUpdate.name_media = name_media;
        }

        if (link) {
            dataToUpdate.link = link;
        }

        if (logo_media) {
            if (mediasSocial?.logo_media) {
                const imagePath = path.resolve(__dirname + '/' + '..' + '/' + '..' + '/' + '..' + '/' + '..' + '/' + 'images' + '/' + mediasSocial?.logo_media);
                console.log(`Deleting image: ${imagePath}`);
                fs.unlink(imagePath, (err) => {
                    if (err) {
                        console.error(`Failed to delete old image: ${err.message}`);
                    } else {
                        console.log('Old image deleted successfully');
                    }
                });
            }
            dataToUpdate.logo_media = logo_media;
        }

        const update_Configs = await prismaClient.socialMedias.update({
            where: {
                id: socialMediasBlog_id
            },
            data: dataToUpdate
        });

        return update_Configs;
    }
}

export { UpdateMediaSocialEcommerceService };