import prismaClient from '../../../prisma';
import fs from 'fs';
import path from 'path';

interface UserRequest {
    customer_id: string;
}

class CustomerPhotoDeleteService {
    async execute({ customer_id }: UserRequest) {

        const user_photo = await prismaClient.customer.findUnique({
            where: {
                id: customer_id
            }
        });

        const imagePath = path.resolve(__dirname + '/' + '..' + '/' + '..' + '/' + '..' + '/' + '..' + '/' + 'images' + '/' + 'customer' + '/' + user_photo?.photo);
        fs.unlink(imagePath, (err) => {
            if (err) {
                console.error(`Failed to delete old image: ${err.message}`);
            } else {
                console.log('Old image deleted successfully');
            }
        });

        const customer = await prismaClient.customer.update({
            where: {
                id: customer_id
            },
            data: {
                photo: ""
            }
        });

        return customer;

    }
}

export { CustomerPhotoDeleteService }