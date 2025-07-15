import prismaClient from "../../prisma";

interface CreateMenuDTO {
    name: string;
    isActive?: boolean;
    order?: number;
    icon?: string;
    position: string;
    identifier?: string;
}

export class CreateMenuService {
    async execute({ name, isActive = true, order = 0, icon, position, identifier }: CreateMenuDTO) {
        const menu = await prismaClient.menu.create({
            data: { name, isActive, order, icon, position, identifier },
        });
        return menu;
    }
}