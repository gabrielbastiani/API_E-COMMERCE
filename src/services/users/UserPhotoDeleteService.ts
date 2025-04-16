import prismaClient from "../../prisma";
import fs from 'fs';
import path from 'path';

interface UserRequest {
    userEcommerce_id: string;
}

class UserPhotoDeleteService {
    async execute({ userEcommerce_id }: UserRequest) {

        const user_photo = await prismaClient.userEcommerce.findUnique({
            where: {
                id: userEcommerce_id
            }
        });

        const imagePath = path.resolve(__dirname + '/' + '..' + '/' + '..' + '/' + '..' + '/' + 'images' + '/' + user_photo?.photo);
        fs.unlink(imagePath, (err) => {
            if (err) {
                console.error(`Failed to delete old image: ${err.message}`);
            } else {
                console.log('Old image deleted successfully');
            }
        });

        const userEcommerce = await prismaClient.userEcommerce.update({
            where: {
                id: userEcommerce_id
            },
            data: {
                photo: ""
            }
        });

        return userEcommerce;

    }
}

export { UserPhotoDeleteService }