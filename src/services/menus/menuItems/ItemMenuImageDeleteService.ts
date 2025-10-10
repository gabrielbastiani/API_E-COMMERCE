import prismaClient from "../../../prisma";
import fs from 'fs';
import path from 'path';

interface ItemMenuProps {
    menuItem_id: string;
}

class ItemMenuImageDeleteService {
    async execute({ menuItem_id }: ItemMenuProps) {

        const menu_item = await prismaClient.menuItem.findUnique({
            where: {
                id: menuItem_id
            }
        });

        const imagePath = path.resolve(__dirname + '/' + '..' + '/' + '..' + '/' + '..' + '/' + '..' + '/' + 'images' + '/' + 'menu' + '/' + menu_item?.icon);
        fs.unlink(imagePath, (err) => {
            if (err) {
                console.error(`Failed to delete old image: ${err.message}`);
            } else {
                console.log('Old image deleted successfully');
            }
        });

        const menuItem = await prismaClient.menuItem.update({
            where: {
                id: menuItem_id
            },
            data: {
                icon: ""
            }
        });

        return menuItem;

    }
}

export { ItemMenuImageDeleteService }