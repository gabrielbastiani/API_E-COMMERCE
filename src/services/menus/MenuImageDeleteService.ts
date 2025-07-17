import prismaClient from '../../prisma'; 
import fs from 'fs';
import path from 'path';

interface MenuProps {
    menu_id: string;
}

class MenuImageDeleteService {
    async execute({ menu_id }: MenuProps) {

        const menu = await prismaClient.menu.findUnique({
            where: {
                id: menu_id
            }
        });

        const imagePath = path.resolve(__dirname + '/' + '..' + '/' + '..' + '/' + '..' + '/' + 'images' + '/' + menu?.icon);
        fs.unlink(imagePath, (err) => {
            if (err) {
                console.error(`Failed to delete old image: ${err.message}`);
            } else {
                console.log('Old image deleted successfully');
            }
        });

        const menu_data = await prismaClient.menu.update({
            where: {
                id: menu_id
            },
            data: {
                icon: ""
            }
        });

        return menu_data;

    }
}

export { MenuImageDeleteService }