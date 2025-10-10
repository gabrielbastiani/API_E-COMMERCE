import prismaClient from "../../../prisma";
import fs from 'fs';
import path from 'path';

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

        const imagePath = path.resolve(__dirname + '/' + '..' + '/' + '..' + '/' + '..' + '/' + '..' + '/' + 'images' + '/' + 'mediaSocial' + '/' + config?.logo_media);
        fs.unlink(imagePath, (err) => {
            if (err) {
                console.error(`Failed to delete old image: ${err.message}`);
            } else {
                console.log('Old image deleted successfully');
            }
        });

        return config;

    }
}

export { DeleteMediasSocialsEcommerceService }