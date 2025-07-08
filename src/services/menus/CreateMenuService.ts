import prismaClient from "../../prisma";

interface CreateMenuDTO {
    name: string;
    isActive?: boolean;
    order?: number;
    icon?: string;
}

export class CreateMenuService {
    async execute({ name, isActive = true, order = 0, icon }: CreateMenuDTO) {
        const menu = await prismaClient.menu.create({
            data: { name, isActive, order, icon },
        });
        return menu;
    }
}