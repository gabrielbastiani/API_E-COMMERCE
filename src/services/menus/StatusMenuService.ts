import prismaClient from "../../prisma";

interface MenuProps {
    menu_id: string;
    isActive: boolean;
}

class StatusMenuService {
    async execute({ menu_id, isActive }: MenuProps) {
        const menu = await prismaClient.menu.update({
            where: { id: menu_id },
            data: {
                isActive: isActive
            }
        });

        return menu;

    }
}

export { StatusMenuService }